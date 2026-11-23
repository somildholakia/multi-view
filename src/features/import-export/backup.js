import { normalizeAppState } from "../workspaces/workspace-model.js";
export function downloadBackup(state) {
  const payload={
    app:"MultiView",
    version:3,
    exportedAt:new Date().toISOString(),
    workspaces:state.workspaces,
    bookmarks:state.bookmarks||[]
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url; anchor.download="multiview-backup-"+new Date().toISOString().slice(0,10)+".json";
  anchor.click(); URL.revokeObjectURL(url);
}
export async function readBackup(file) {
  const parsed=JSON.parse(await file.text());
  if(!Array.isArray(parsed.workspaces)) throw new Error("This file is not a MultiView workspace backup.");
  return normalizeAppState({workspaces:parsed.workspaces,bookmarks:parsed.bookmarks});
}
