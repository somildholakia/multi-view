import { createId } from "../../core/ids.js";
import { normalizeUrl } from "../../core/url.js";
export const MAX_PANELS=20;
export const LAYOUTS=Array.from({length:MAX_PANELS},(_,index)=>index+1);
export function createView(url=""){return{id:createId("view"),url};}
export function createWorkspace(name="My workspace"){
  return{id:createId("workspace"),name,layout:4,refreshInterval:0,autoPlayVideos:true,views:Array.from({length:4},()=>createView())};
}
export function duplicateWorkspace(source,name){
  const copy=createWorkspace(name||`${source?.name||"Workspace"} copy`);
  copy.layout=LAYOUTS.includes(Number(source?.layout))?Number(source.layout):4;
  copy.refreshInterval=[0,15,30,60,300].includes(Number(source?.refreshInterval))?Number(source.refreshInterval):0;
  copy.autoPlayVideos=source?.autoPlayVideos!==false;
  copy.views=(Array.isArray(source?.views)?source.views:[]).slice(0,MAX_PANELS).map(view=>createView(typeof view?.url==="string"?view.url:""));
  while(copy.views.length<copy.layout)copy.views.push(createView());
  return copy;
}
export function normalizeWorkspace(input){
  const requestedLayout=Number(input?.layout);
  const layout=Number.isInteger(requestedLayout)&&requestedLayout>=1&&requestedLayout<=MAX_PANELS?requestedLayout:4;
  const incoming=Array.isArray(input?.views)?input.views.slice(0,MAX_PANELS):[];
  const views=incoming.map(view=>({id:typeof view?.id==="string"?view.id:createId("view"),url:typeof view?.url==="string"?view.url:""}));
  while(views.length<layout)views.push(createView());
  const refresh=Number(input?.refreshInterval);
  return{
    id:typeof input?.id==="string"?input.id:createId("workspace"),
    name:typeof input?.name==="string"&&input.name.trim()?input.name.trim().slice(0,48):"My workspace",
    layout,refreshInterval:[0,15,30,60,300].includes(refresh)?refresh:0,
    autoPlayVideos:input?.autoPlayVideos!==false,views
  };
}
export function normalizeAppState(input){
  const source=Array.isArray(input?.workspaces)?input.workspaces:[];
  const workspaces=source.length?source.map(normalizeWorkspace):[createWorkspace()];
  const wantedId=input?.activeWorkspaceId;
  const activeWorkspaceId=workspaces.some(workspace=>workspace.id===wantedId)?wantedId:workspaces[0].id;
  const bookmarks=(Array.isArray(input?.bookmarks)?input.bookmarks.slice(0,100):[]).map(item=>{
    try{
      return{
        id:typeof item?.id==="string"?item.id:createId("bookmark"),
        title:typeof item?.title==="string"&&item.title.trim()?item.title.trim().slice(0,48):"Saved website",
        url:normalizeUrl(item?.url),
        createdAt:typeof item?.createdAt==="string"?item.createdAt:""
      };
    }catch{return null;}
  }).filter(Boolean);
  return{version:4,activeWorkspaceId,workspaces,bookmarks};
}
export function fitLayout(workspace,minimumCount){
  const nextLayout=Math.min(MAX_PANELS,Math.max(1,Math.ceil(Number(minimumCount)||1)));
  workspace.layout=Math.max(workspace.layout,nextLayout);
  while(workspace.views.length<workspace.layout)workspace.views.push(createView());
}
