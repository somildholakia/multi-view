import { el, icon } from "../../core/dom.js";
import { getDomain, getFaviconUrl, getMediaDescriptor } from "../../core/url.js";
import { loadPlaybackPosition } from "../media/playback-store.js";

function action(iconName,title,onClick,muted=false) {
  return el("button",{type:"button",className:"icon-button "+(muted?"icon-button--muted":""),title,attrs:{"aria-label":title},on:{click:onClick}},[icon(iconName)]);
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
    action("pip","Open direct video in Picture-in-Picture",()=>handlers.pictureInPicture(view.id))
  ]);
  top.append(identity,actions);
  const form=el("form",{className:"view-url-form"});
  const address=el("input",{className:"view-url-input",type:"url",placeholder:"Enter a URL — e.g. example.com",attrs:{autocomplete:"url",spellcheck:"false","aria-label":"Website or video URL for view "+(index+1)}});
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
  const video=el("video",{className:"view-video",attrs:{
    controls:"",
    playsinline:"",
    preload:"metadata"
  }});
  video.controls=true;
  video.playsInline=true;
  video.preload="metadata";

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
  video.addEventListener("error",()=>{
    const hint=card.querySelector(".view-foot-hint");
    if(hint)hint.textContent="This video format or source may not be supported by your browser";
  });

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
  card._parts={identity,address,empty,frame,video,foot,bookmarkButton:actions.children[2],focusButton:actions.children[3],pipButton:actions.children[5]};
  updateViewCard(card,view,index,false);
  return card;
}

export function updateViewCard(card,view,index,focused,isBookmarked=false,autoPlayVideos=true) {
  const {identity,address,empty,frame,video,foot,focusButton,bookmarkButton,pipButton}=card._parts;
  const title=identity.querySelector(".site-title");
  const favicon=identity.querySelector(".site-favicon");
  title.textContent=view.url?getDomain(view.url):"New website";
  favicon.textContent=view.url?"":"↗";
  favicon.style.backgroundImage=view.url?"url(\u0022"+getFaviconUrl(view.url)+"\u0022)":"";
  if(document.activeElement!==address&&address.value!==view.url) address.value=view.url;

  const media=view.url?getMediaDescriptor(view.url,{autoPlay:autoPlayVideos}):{type:"website",src:""};
  const isDirectVideo=media.type==="video";
  const sourceKey=media.type+":"+media.src;
  const currentKey=frame.dataset.mediaKey||"";
  if(view.url&&sourceKey!==currentKey){
    if(isDirectVideo){
      frame.removeAttribute("src");
      frame.hidden=true;
      video.pause();
      video.dataset.source=media.src;
      video.dataset.lastSavedSecond="0";
      video.dataset.autoPlayVideos=String(Boolean(autoPlayVideos));
      video.muted=Boolean(autoPlayVideos);
      video.defaultMuted=Boolean(autoPlayVideos);
      video.autoplay=Boolean(autoPlayVideos);
      video.src=media.src;
      video.load();
    }else{
      video.pause();
      video.removeAttribute("src");
      video.load();
      delete video.dataset.source;
      frame.src=media.src;
      frame.hidden=false;
    }
    frame.dataset.mediaKey=sourceKey;
  }else if(!view.url&&currentKey){
    frame.removeAttribute("src");
    delete frame.dataset.mediaKey;
    video.pause();
    video.removeAttribute("src");
    video.load();
    delete video.dataset.source;
    video.autoplay=false;
  }

  if(isDirectVideo){
    video.muted=Boolean(autoPlayVideos);
    video.defaultMuted=Boolean(autoPlayVideos);
    video.autoplay=Boolean(autoPlayVideos);
    video.dataset.autoPlayVideos=String(Boolean(autoPlayVideos));
    video.hidden=false;
    if(autoPlayVideos&&video.paused&&video.readyState>=2){
      video.play().catch(()=>{});
    }
  }else{
    video.hidden=true;
  }
  frame.hidden=!view.url||isDirectVideo;
  empty.hidden=Boolean(view.url);
  card.classList.toggle("is-focused",focused);
  focusButton.title=focused?"Exit focused view":"Focus this view";
  bookmarkButton.classList.toggle("is-saved",isBookmarked);
  bookmarkButton.title=isBookmarked?"Remove from quick access":"Save to quick access";
  bookmarkButton.setAttribute("aria-pressed",String(isBookmarked));
  pipButton.hidden=!isDirectVideo||typeof video.requestPictureInPicture!=="function";
  const isHostedPlayer=["youtube","youtube-playlist","vimeo","dailymotion"].includes(media.type);
  foot.querySelector(".view-foot-label").textContent=!view.url?"Ready when you are":isDirectVideo?"Video player ready":isHostedPlayer?"Embedded video player ready":"Website opened in panel";
  foot.querySelector(".view-foot-hint").textContent=!view.url?"Your URL is saved on this device":isDirectVideo?"Playback position is saved on this device":isHostedPlayer?(autoPlayVideos?"Muted autoplay requested; tap to unmute":"Tap play inside the player"):"Some websites may block embedded browsing";
  card.querySelector(".view-number").textContent=String(index+1).padStart(2,"0");
}
