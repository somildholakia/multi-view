import { createView, fitLayout, LAYOUTS, MAX_PANELS } from "../workspaces/workspace-model.js";
import { normalizeUrl } from "../../core/url.js";
export function setViewUrl(workspace,viewId,rawUrl){
  const view=workspace.views.find(item=>item.id===viewId);
  if(view)view.url=rawUrl.trim()?normalizeUrl(rawUrl):"";
}
export function setAllViewsUrl(workspace,rawUrl){
  const url=normalizeUrl(rawUrl);
  const count=Math.min(MAX_PANELS,Math.max(1,Number(workspace.layout)||4));
  while(workspace.views.length<count)workspace.views.push(createView());
  workspace.views.slice(0,count).forEach(view=>{view.url=url;});
  return count;
}
export function clearView(workspace,viewId){
  const view=workspace.views.find(item=>item.id===viewId);
  if(view)view.url="";
}
export function addUrls(workspace,rawUrls){
  const urls=rawUrls.map(normalizeUrl);
  const occupied=workspace.views.filter(view=>view.url).length;
  const required=occupied+urls.length;
  if(required>MAX_PANELS)throw new Error(`A workspace can hold up to ${MAX_PANELS} windows.`);
  fitLayout(workspace,required);
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
export function reorderViews(workspace,sourceId,targetId){
  if(!workspace||sourceId===targetId)return false;
  const from=workspace.views.findIndex(view=>view.id===sourceId);
  const to=workspace.views.findIndex(view=>view.id===targetId);
  if(from<0||to<0)return false;
  const [moved]=workspace.views.splice(from,1);
  workspace.views.splice(to,0,moved);
  return true;
}
