import { normalizeAppState, duplicateWorkspace } from "../workspaces/workspace-model.js";
import { createId } from "../../core/ids.js";

const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
export function mergeBackup(current, imported) {
  const copies = imported.workspaces.map(workspace => duplicateWorkspace(workspace, workspace.name));
  const bookmarks = [...current.bookmarks];
  const urls = new Set(bookmarks.map(item => item.url));
  for (const item of imported.bookmarks) {
    if (bookmarks.length >= 100) break;
    if (!urls.has(item.url)) { bookmarks.push({...item,id:createId("bookmark")}); urls.add(item.url); }
  }
  return {...current,workspaces:[...current.workspaces,...copies],bookmarks,activeWorkspaceId:copies[0]?.id ?? current.activeWorkspaceId};
}
export function downloadBackup(state) {
  const payload={
    app:"MultiView",
    version:4,
    exportedAt:new Date().toISOString(),
    activeWorkspaceId:state.activeWorkspaceId,
    workspaces:state.workspaces,
    bookmarks:state.bookmarks||[]
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url; anchor.download="multiview-backup-"+new Date().toISOString().slice(0,10)+".json";
  anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function readBackup(file) {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup files must be 2 MB or smaller.");
  const parsed=JSON.parse(await file.text());
  if(!parsed || !Array.isArray(parsed.workspaces) || !parsed.workspaces.length) throw new Error("This file is not a MultiView workspace backup.");
  return normalizeAppState({activeWorkspaceId:parsed.activeWorkspaceId,workspaces:parsed.workspaces,bookmarks:parsed.bookmarks});
}
