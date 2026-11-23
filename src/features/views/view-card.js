import { el, icon } from "../../core/dom.js";
import { getDomain, getFaviconUrl } from "../../core/url.js";

function action(iconName,title,onClick,muted=false) {
  return el("button",{type:"button",className:`icon-button ${muted?"icon-button--muted":""}`,title,attrs:{"aria-label":title},on:{click:onClick}},[icon(iconName)]);
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
    action("refresh","Reload this page",()=>handlers.reload(view.id)),
    action("external","Open in a new tab",()=>handlers.open(view.id)),
    action("expand","Focus this view",()=>handlers.focus(view.id)),
    action("trash","Clear this view",()=>handlers.clear(view.id),true)
  ]);
  top.append(identity,actions);
  const form=el("form",{className:"view-url-form"});
  const address=el("input",{className:"view-url-input",type:"url",placeholder:"Enter a URL — e.g. example.com",attrs:{autocomplete:"url",spellcheck:"false","aria-label":`Website address for view ${index+1}`}});
  const go=el("button",{className:"go-button",type:"submit",text:"Go"});
  form.append(icon("layers","address-icon"),address,go);
  form.addEventListener("submit",event=>{event.preventDefault();handlers.navigate(view.id,address.value);});
  const stage=el("div",{className:"view-stage"});
  const empty=el("div",{className:"view-empty"},[
    el("div",{className:"view-empty__icon"},[icon("grid")]),
    el("strong",{text:"Your next window"}),
    el("span",{text:"Add a website address above to start browsing."})
  ]);
  const frame=el("iframe",{className:"view-frame",attrs:{
    title:`Website view ${index+1}`,loading:"lazy",
    allow:"autoplay; fullscreen; clipboard-read; clipboard-write; picture-in-picture",
    referrerpolicy:"strict-origin-when-cross-origin"
  }});
  stage.append(empty,frame);
  const foot=el("div",{className:"view-card__foot"},[
    el("span",{className:"live-dot"}),
    el("span",{className:"view-foot-label",text:"Ready when you are"}),
    el("span",{className:"view-foot-hint",text:"Embedding depends on the website"})
  ]);
  card.append(top,form,stage,foot);
  card._parts={identity,address,empty,frame,foot,focusButton:actions.children[2]};
  updateViewCard(card,view,index,false);
  return card;
}

export function updateViewCard(card,view,index,focused) {
  const {identity,address,empty,frame,foot,focusButton}=card._parts;
  const title=identity.querySelector(".site-title");
  const favicon=identity.querySelector(".site-favicon");
  title.textContent=view.url?getDomain(view.url):"New website";
  favicon.textContent=view.url?"":"↗";
  favicon.style.backgroundImage=view.url?`url("${getFaviconUrl(view.url)}")`:"";
  if(document.activeElement!==address&&address.value!==view.url) address.value=view.url;
  const source=frame.dataset.source||"";
  if(view.url&&source!==view.url) { frame.src=view.url; frame.dataset.source=view.url; }
  else if(!view.url&&source) { frame.removeAttribute("src"); delete frame.dataset.source; }
  empty.hidden=Boolean(view.url);
  frame.hidden=!view.url;
  card.classList.toggle("is-focused",focused);
  focusButton.title=focused?"Exit focused view":"Focus this view";
  foot.querySelector(".view-foot-label").textContent=view.url?"Website opened in panel":"Ready when you are";
  foot.querySelector(".view-foot-hint").textContent=view.url?"Some sites may block embedded browsing":"Your URL is saved on this device";
  card.querySelector(".view-number").textContent=String(index+1).padStart(2,"0");
}