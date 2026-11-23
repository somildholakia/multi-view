import { normalizeAppState, createWorkspace } from "../features/workspaces/workspace-model.js";
const STORAGE_KEY="multi-view.app-state.v1";
export function loadState() {
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    return normalizeAppState(raw?JSON.parse(raw):{workspaces:[createWorkspace()]});
  } catch(error) {
    console.warn("Could not read saved MultiView state:",error);
    return normalizeAppState({workspaces:[createWorkspace()]});
  }
}
export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; }
  catch(error) { console.warn("Could not save MultiView state:",error); return false; }
}