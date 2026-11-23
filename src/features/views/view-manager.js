import { createView, fitLayout, LAYOUTS } from "../workspaces/workspace-model.js";
import { normalizeUrl } from "../../core/url.js";
export function setViewUrl(workspace,viewId,rawUrl){
  const view=workspace.views.find(item=>item.id===viewId);
  if(view)view.url=rawUrl.trim()?normalizeUrl(rawUrl):"";
}
export function clearView(workspace,viewId){
  const view=workspace.views.find(item=>item.id===viewId);
  if(view)view.url="";
}
export function addUrls(workspace,rawUrls){
  const urls=rawUrls.map(normalizeUrl);
  const occupied=workspace.views.filter(view=>view.url).length;
  const required=occupied+urls.length;
  if(required>8)throw new Error("A workspace can hold up to 8 websites.");
  if(urls.length>workspace.views.filter(view=>!view.url).length)fitLayout(workspace,required);
  const available=workspace.views.filter(view=>!view.url);
  urls.forEach((url,index)=>{available[index].url=url;});
  return urls.length;
}
export function changeLayout(workspace,layout){
  const next=Number(layout);
  if(!LAYOUTS.includes(next))return;
  workspace.layout=next;
  while(workspace.views.length<next)workspace.views.push(createView());
}