import { el, icon } from "../../core/dom.js";
import { getDomain, getFaviconUrl, getMediaDescriptor } from "../../core/url.js";
import { loadPlaybackPosition } from "../media/playback-store.js";
import { describePlayback } from "../media/playback-status.js";

const MEDIA_ROOT_MARGIN = "360px 0px";
const mediaObserver = typeof IntersectionObserver === "undefined"
  ? null
  : new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target.closest(".view-card");
        if (!card?._parts) return;
        card._parts.inLoadRange = true;
        card._parts.observing = false;
        mediaObserver.unobserve(entry.target);
        mountPendingMedia(card);
      });
    }, { rootMargin: MEDIA_ROOT_MARGIN, threshold: 0.01 });

function action(iconName,title,onClick,muted=false) {
  return el("button",{type:"button",className:"icon-button "+(muted?"icon-button--muted":""),title,attrs:{"aria-label":title},on:{click:onClick}},[icon(iconName)]);
}

function releaseMedia(parts) {
  parts.pendingMedia = null;
  parts.mediaKey = "";
  parts.loaded = false;
  parts.playbackEvent = "";
  parts.frame.removeAttribute("src");
  delete parts.frame.dataset.mediaKey;
  parts.video.pause();
  parts.video.removeAttribute("src");
  parts.video.load();
  delete parts.video.dataset.source;
  delete parts.video.dataset.autoPlayVideos;
  parts.video.autoplay = false;
  parts.video.preload = "none";
}

function mountPendingMedia(card) {
  const parts = card?._parts;
  const media = parts?.pendingMedia;
  if (!media || parts.mediaKey === media.key) return;
  if (!card.isConnected) {
    queueMicrotask(() => {
      if (card.isConnected) mountPendingMedia(card);
    });
    return;
  }

  parts.pendingMedia = null;
  parts.mediaKey = media.key;
  parts.loaded = true;

  if (media.type === "video") {
    parts.frame.removeAttribute("src");
    parts.frame.hidden = true;
    const video = parts.video;
    video.pause();
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.dataset.source = media.src;
    video.dataset.lastSavedSecond = "0";
    video.dataset.autoPlayVideos = String(Boolean(media.autoPlay));
    video.muted = Boolean(media.autoPlay);
    video.defaultMuted = Boolean(media.autoPlay);
    video.autoplay = Boolean(media.autoPlay);
    video.src = media.src;
    video.load();
    if (media.autoPlay) video.play().catch(() => {});
  } else {
    parts.video.pause();
    parts.video.removeAttribute("src");
    parts.video.load();
    delete parts.video.dataset.source;
    parts.frame.hidden = false;
    parts.frame.loading = "lazy";
    parts.frame.dataset.mediaKey = media.key;
    parts.frame.src = media.src;
  }
  updateMediaStatus(card, media);
}

function updateMediaStatus(card, media) {
  const hint = card.querySelector(".view-foot-hint");
  const label = card.querySelector(".view-foot-label");
  if (!hint || !label) return;
  if (!media) {
    label.textContent = "Ready when you are";
    hint.textContent = "Add a website or video URL";
  } else if (media.type === "video") {
    const status = describePlayback(card._parts.video, card._parts.playbackEvent);
    label.textContent = status.label;
    hint.textContent = status.hint;
  } else if (["youtube","youtube-playlist","vimeo","dailymotion"].includes(media.type)) {
    label.textContent = "Embedded player requested";
    hint.textContent = "Playback and provider view counts are not verified here";
  } else {
    label.textContent = "Website navigation requested";
    hint.textContent = "Some websites may block embedded browsing";
  }
}

export function disposeViewCard(card) {
  if (!card?._parts) return;
  const parts = card._parts;
  if (mediaObserver && parts.observing) mediaObserver.unobserve(parts.stage);
  parts.observing = false;
  parts.inLoadRange = false;
  releaseMedia(parts);
}

export function createViewCard(view,index,handlers) {
  const card=el("article",{className:"view-card",dataset:{viewId:view.id}});
  const top=el("div",{className:"view-card__top"});
  const identity=el("div",{className:"view-card__identity"},[
    el("span",{className:"view-number",text:String(index+1).padStart(2,"0")}),
    el("span",{className:"site-favicon",text:"↗"}),
    el("strong",{className:"site-title",text:"New website"})
  ]);
  const actions=el("div",{className:"view-actions"},[
    action("refresh","Reload this page or video",()=>handlers.reload(view.id)),
    action("external","Open independently in a browser tab",()=>handlers.open(view.id)),
    action("bookmark","Save to quick access",()=>handlers.bookmark(view.id)),
    action("expand","Focus this view",()=>handlers.focus(view.id)),
    action("trash","Clear this view",()=>handlers.clear(view.id),true),
    action("pip","Open direct video in Picture-in-Picture",()=>handlers.pictureInPicture(view.id)),
    action("globe","Launch external proxy (not a VPN)",()=>handlers.proxy(view.id))
  ]);
  top.append(identity,actions);
  const form=el("form",{className:"view-url-form"});
  const address=el("input",{className:"view-url-input",type:"url",placeholder:"Paste a website or video URL",attrs:{autocomplete:"url",spellcheck:"false","aria-label":"Website or video URL for view "+(index+1)}});
  const go=el("button",{className:"go-button",type:"submit",text:"Go"});
  form.append(icon("layers","address-icon"),address,go);
  form.addEventListener("submit",event=>{event.preventDefault();handlers.navigate(view.id,address.value);});
  const stage=el("div",{className:"view-stage"});
  const empty=el("div",{className:"view-empty"},[
    el("div",{className:"view-empty__icon"},[icon("grid")]),
    el("strong",{text:"Your next window"}),
    el("span",{text:"Add a website, YouTube link or video URL above to start browsing."})
  ]);
  const frame=el("iframe",{className:"view-frame",attrs:{
    title:"Website or video view "+(index+1),loading:"lazy",
    allow:"autoplay; encrypted-media; fullscreen; clipboard-read; clipboard-write; picture-in-picture",
    referrerpolicy:"strict-origin-when-cross-origin",
    allowfullscreen:""
  }});
  frame.loading = "lazy";
  const video=el("video",{className:"view-video",attrs:{
    controls:"",
    playsinline:"",
    preload:"none"
  }});
  video.controls=true;
  video.playsInline=true;
  video.preload="none";

  video.addEventListener("loadedmetadata",async()=>{
    const source=video.dataset.source;
    if(!source)return;
    const savedPosition=await loadPlaybackPosition(source);
    if(video.dataset.source!==source)return;
    if(savedPosition>0&&Number.isFinite(video.duration)&&savedPosition<video.duration-1){
      try{video.currentTime=savedPosition;}catch{}
    }
    if(video.dataset.autoPlayVideos==="true"&&video.paused){
      video.play().catch(()=>{});
    }
  });
  const savePosition=()=>{
    const source=video.dataset.source;
    if(source&&Number.isFinite(video.currentTime)){
      handlers.progress(view.id,source,video.currentTime);
    }
  };
  video.addEventListener("timeupdate",()=>{
    const current=Math.floor(video.currentTime);
    const previous=Number(video.dataset.lastSavedSecond||0);
    if(current-previous>=5){
      video.dataset.lastSavedSecond=String(current);
      savePosition();
    }
  });
  video.addEventListener("pause",savePosition);
  for (const event of ["loadstart","loadedmetadata","canplay","play","playing","waiting","stalled","seeking","seeked","pause","ended","error","emptied"]) {
    video.addEventListener(event,()=>{
      const parts=card._parts;
      if (!parts || !video.dataset.source || !parts.mediaKey.startsWith("video:") || parts.pendingMedia) return;
      parts.playbackEvent=event;
      updateMediaStatus(card,{type:"video"});
    });
  }

  stage.append(empty,frame,video);
  card.draggable=true;
  card.addEventListener("dragstart",event=>{
    card.classList.add("is-dragging");
    if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",view.id);}
  });
  card.addEventListener("dragover",event=>{event.preventDefault();card.classList.add("is-drag-target");});
  card.addEventListener("dragleave",()=>card.classList.remove("is-drag-target"));
  card.addEventListener("drop",event=>{
    event.preventDefault();
    card.classList.remove("is-drag-target");
    const sourceId=event.dataTransfer?.getData("text/plain");
    if(sourceId)handlers.reorder(sourceId,view.id);
  });
  card.addEventListener("dragend",()=>card.classList.remove("is-dragging","is-drag-target"));
  const foot=el("div",{className:"view-card__foot"},[
    el("span",{className:"live-dot"}),
    el("span",{className:"view-foot-label",text:"Ready when you are"}),
    el("span",{className:"view-foot-hint",text:"Add a website or video URL"})
  ]);
  card.append(top,form,stage,foot);
  card._parts={
    identity,address,empty,frame,video,stage,foot,
    pendingMedia:null,mediaKey:"",loaded:false,inLoadRange:false,observing:false,playbackEvent:"",
    bookmarkButton:actions.children[2],focusButton:actions.children[3],pipButton:actions.children[5]
  };
  updateViewCard(card,view,index,false);
  return card;
}

export function updateViewCard(card,view,index,focused,isBookmarked=false,autoPlayVideos=true) {
  const {identity,address,empty,frame,video,stage,foot,focusButton,bookmarkButton,pipButton}=card._parts;
  const parts=card._parts;
  const title=identity.querySelector(".site-title");
  const favicon=identity.querySelector(".site-favicon");
  title.textContent=view.url?getDomain(view.url):"New website";
  favicon.textContent=view.url?"":"↗";
  favicon.style.backgroundImage=view.url?"url(\u0022"+getFaviconUrl(view.url)+"\u0022)":"";
  if(document.activeElement!==address&&address.value!==view.url) address.value=view.url;

  const media=view.url?getMediaDescriptor(view.url,{autoPlay:autoPlayVideos}):null;
  const isDirectVideo=media?.type==="video";
  const sourceKey=media?media.type+":"+media.src:"";

  if(!media){
    releaseMedia(parts);
    if(mediaObserver&&parts.observing)mediaObserver.unobserve(stage);
    parts.observing=false;
    parts.inLoadRange=false;
  }else if(sourceKey!==parts.mediaKey&&sourceKey!==parts.pendingMedia?.key){
    releaseMedia(parts);
    parts.pendingMedia={...media,key:sourceKey,autoPlay:autoPlayVideos};
    parts.loaded=false;
  }else if(parts.pendingMedia){
    parts.pendingMedia.autoPlay=autoPlayVideos;
  }

  const pending=Boolean(parts.pendingMedia);
  frame.hidden=!media||isDirectVideo;
  video.hidden=!media||!isDirectVideo;
  empty.hidden=Boolean(media);
  card.classList.toggle("is-focused",focused);
  focusButton.title=focused?"Exit focused view":"Focus this view";
  bookmarkButton.classList.toggle("is-saved",isBookmarked);
  bookmarkButton.title=isBookmarked?"Remove from quick access":"Save to quick access";
  bookmarkButton.setAttribute("aria-pressed",String(isBookmarked));
  pipButton.hidden=!isDirectVideo||typeof video.requestPictureInPicture!=="function";

  if(!media){
    updateMediaStatus(card,null);
  }else if(pending){
    foot.querySelector(".view-foot-label").textContent="Waiting to load";
    foot.querySelector(".view-foot-hint").textContent="Loads when this panel is near your screen";
  }else{
    updateMediaStatus(card,{...media,autoPlay:autoPlayVideos});
  }
  card.querySelector(".view-number").textContent=String(index+1).padStart(2,"0");

  if(media&&!parts.loaded){
    if(parts.inLoadRange||!mediaObserver){
      mountPendingMedia(card);
    }else if(!parts.observing){
      mediaObserver.observe(stage);
      parts.observing=true;
    }
  }

  if(isDirectVideo&&!pending&&autoPlayVideos&&video.paused&&video.readyState>=2){
    video.muted=true;
    video.play().catch(()=>{});
  }
}
