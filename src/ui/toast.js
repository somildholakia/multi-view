import { el } from "../core/dom.js";
export function createToastHost(root) {
  const host=el("div",{className:"toast-host",attrs:{"aria-live":"polite"}});
  root.append(host); let timeout;
  return (message,tone="info")=>{
    host.replaceChildren(el("div",{className:`toast toast--${tone}`,text:message}));
    window.clearTimeout(timeout); timeout=window.setTimeout(()=>host.replaceChildren(),3200);
  };
}