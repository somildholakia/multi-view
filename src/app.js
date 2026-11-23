import { el, icon } from "./core/dom.js";
import { loadState, saveState } from "./core/storage.js";
import { createWorkspace, LAYOUTS } from "./features/workspaces/workspace-model.js";
import { addUrls, changeLayout, clearView, setViewUrl } from "./features/views/view-manager.js";
import { createViewCard, updateViewCard } from "./features/views/view-card.js";
import { RefreshController } from "./features/refresh/refresh-controller.js";
import { downloadBackup, readBackup } from "./features/import-export/backup.js";
import { createToastHost } from "./ui/toast.js";

const APP_MARKUP = `
<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="./" aria-label="MultiView home"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span class="brand-copy"><b>MultiView</b><small>Browse in parallel</small></span></a>
    <div class="sidebar-section"><div class="sidebar-heading"><span>Workspaces</span><button id="new-workspace" class="sidebar-add" aria-label="Create workspace" title="Create workspace">+</button></div><div id="workspace-list" class="workspace-list"></div></div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-card"><div class="sidebar-card__icon"><span class="pulse"></span></div><div><b>Saved on this device</b><p>Your workspace stays in this browser. No account required.</p></div></div>
    <div class="sidebar-bottom"><span class="status-led"></span><span>Local mode</span><span class="sidebar-version">v0.1</span></div>
  </aside>
  <main class="main-area">
    <header class="topbar"><div class="breadcrumb"><span>Workspace</span><span class="breadcrumb-separator">/</span><strong id="breadcrumb-name">My workspace</strong></div>
      <div class="topbar-actions"><span class="privacy-label"><span></span> Private by default</span><button id="install-button" class="install-button" hidden><span>↓</span> Install app</button>
        <button id="export-button" class="top-icon-button" title="Export workspaces" aria-label="Export workspaces"></button><button id="import-button" class="top-icon-button" title="Import workspaces" aria-label="Import workspaces"></button><input id="import-file" type="file" accept="application/json,.json" hidden/></div>
    </header>
    <section class="page-content">
      <div class="hero-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR BROWSER, MULTIPLIED</div><h1>One screen.<br/><span>Many perspectives.</span></h1><p class="hero-description">Bring your favourite websites into one workspace. Compare, monitor and move between them without juggling tabs.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="art-window art-window--back"><i></i><i></i><i></i><b></b><b></b></div><div class="art-window art-window--front"><i></i><i></i><i></i><div class="art-grid"><b></b><b></b><b></b><b></b></div></div><span class="art-spark art-spark--one">✳</span><span class="art-spark art-spark--two">✦</span></div></div>
      <div class="workspace-heading"><div class="workspace-name-group"><span class="section-kicker">CURRENT WORKSPACE</span><input id="workspace-name" class="workspace-name-input" maxlength="48" aria-label="Workspace name"/></div><div class="workspace-stats"><span id="active-count">0 active</span><span class="stat-divider"></span><span id="panel-count">4 panels</span></div></div>
      <section class="control-panel">
        <div class="control-panel__top"><div class="control-title"><span class="control-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span><div><b>View layout</b><small>Choose how your windows are arranged</small></div></div><div class="layout-options" id="layout-options"></div></div>
        <div class="control-panel__bottom"><div class="refresh-control"><span class="refresh-label">AUTO REFRESH</span><select id="refresh-interval" aria-label="Auto refresh interval"><option value="0">Off</option><option value="15">Every 15 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option><option value="300">Every 5 minutes</option></select><span class="refresh-note">Refreshes while this app is open</span></div><div class="refresh-actions"><button id="pause-refresh" class="quiet-button"></button><button id="reload-all" class="primary-button"></button></div></div>
      </section>
      <section class="add-sites"><div class="add-sites__copy"><span class="add-sites__icon">↗</span><div><b>Add websites to this workspace</b><p>Paste one URL per line to fill multiple panels at once.</p></div></div><form id="add-sites-form" class="add-sites__form"><textarea id="bulk-urls" rows="1" placeholder="https://example.com&#10;https://another-site.com" aria-label="Website URLs"></textarea><button class="add-sites-button" type="submit"><span>+</span> Add websites</button></form></section>
      <div class="views-heading"><div><h2>Your views</h2><span>Each panel works independently</span></div><span class="views-hint"><span class="views-hint-dot"></span> Saved workspace</span></div><div id="view-grid" class="view-grid"></div>
      <footer class="app-footer"><span><b>MultiView</b> · Your workspace, your way.</span><span>Websites control whether they allow embedded viewing.</span></footer>
    </section>
  </main>
</div><div id="toast-mount"></div>`;

export class MultiViewApp {
  constructor(root){
    this.root=root;this.state=loadState();this.panelNodes=new Map();this.focusedViewId=null;
    this.installPrompt=null;this.refreshPaused=false;this.refreshController=new RefreshController(()=>this.reloadAll(false));this.toast=null;
  }
  start(){
    this.root.innerHTML=APP_MARKUP;this.toast=createToastHost(this.root.querySelector("#toast-mount"));
    this.bindStaticEvents();this.render();
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&this.focusedViewId){this.focusedViewId=null;this.renderViews();}});
  }
  get workspace(){return this.state.workspaces.find(item=>item.id===this.state.activeWorkspaceId)||this.state.workspaces[0];}
  setInstallPrompt(prompt){this.installPrompt=prompt;const button=this.root.querySelector("#install-button");if(button)button.hidden=!prompt;}
  bindStaticEvents(){
    const $=selector=>this.root.querySelector(selector);
    $("#new-workspace").addEventListener("click",()=>{
      const workspace=createWorkspace(`Workspace ${this.state.workspaces.length+1}`);
      this.state.workspaces.push(workspace);this.state.activeWorkspaceId=workspace.id;this.focusedViewId=null;this.refreshPaused=false;this.persistAndRender();
      this.toast("A new workspace is ready.","success");
    });
    $("#workspace-name").addEventListener("change",event=>{this.workspace.name=event.target.value.trim().slice(0,48)||"My workspace";this.persistAndRender();});
    $("#layout-options").addEventListener("click",event=>{
      const choice=event.target.closest("[data-layout]");if(!choice)return;
      changeLayout(this.workspace,Number(choice.dataset.layout));this.focusedViewId=null;this.persistAndRender();
    });
    $("#refresh-interval").addEventListener("change",event=>{this.workspace.refreshInterval=Number(event.target.value);this.refreshPaused=false;this.persistAndRender();});
    $("#pause-refresh").addEventListener("click",()=>{
      if(!this.workspace.refreshInterval)return this.toast("Choose a refresh interval first.");
      this.refreshPaused=!this.refreshPaused;this.configureRefresh();this.renderRefreshControls();
    });
    $("#reload-all").addEventListener("click",()=>this.reloadAll(true));
    $("#add-sites-form").addEventListener("submit",event=>{
      event.preventDefault();const input=$("#bulk-urls");
      const urls=input.value.split(/[\n,]+/).map(line=>line.trim()).filter(Boolean);
      if(!urls.length)return this.toast("Paste at least one website address.");
      try{const count=addUrls(this.workspace,urls);input.value="";this.focusedViewId=null;this.persistAndRender();this.toast(`${count} website${count===1?"":"s"} added to this workspace.`,"success");}
      catch(error){this.toast(error.message,"error");}
    });
    $("#export-button").append(icon("download"));
    $("#export-button").addEventListener("click",()=>{downloadBackup(this.state);this.toast("Workspace backup exported.","success");});
    $("#import-button").append(icon("upload"));$("#import-button").addEventListener("click",()=>$("#import-file").click());
    $("#import-file").addEventListener("change",async event=>{
      const file=event.target.files?.[0];if(!file)return;
      try{
        const imported=await readBackup(file);const existing=new Set(this.state.workspaces.map(workspace=>workspace.id));
        imported.workspaces.forEach(workspace=>{if(existing.has(workspace.id)){workspace.id=`imported-${Date.now()}-${workspace.id}`;existing.add(workspace.id);}});
        this.state.workspaces.push(...imported.workspaces);this.state.activeWorkspaceId=imported.workspaces[0]?.id||this.state.activeWorkspaceId;
        this.persistAndRender();this.toast("Backup imported.","success");
      }catch(error){this.toast(error.message||"Could not import that backup.","error");}
      finally{event.target.value="";}
    });
    $("#install-button").addEventListener("click",async()=>{
      if(!this.installPrompt)return;this.installPrompt.prompt();await this.installPrompt.userChoice;this.installPrompt=null;$("#install-button").hidden=true;
    });
  }
  persistAndRender(){if(!saveState(this.state))this.toast("Browser storage is full. Export a backup before continuing.","error");this.render();}
  render(){this.renderWorkspaces();this.renderWorkspaceHeader();this.renderLayoutOptions();this.renderRefreshControls();this.renderViews();this.configureRefresh();}
  renderWorkspaces(){
    const list=this.root.querySelector("#workspace-list");list.replaceChildren();
    this.state.workspaces.forEach(workspace=>{
      const active=workspace.id===this.state.activeWorkspaceId;
      const visibleCount=workspace.views.slice(0,workspace.layout).filter(view=>view.url).length;
      list.append(el("button",{className:`workspace-item ${active?"is-active":""}`,type:"button",on:{click:()=>{
        this.state.activeWorkspaceId=workspace.id;this.focusedViewId=null;this.refreshPaused=false;this.persistAndRender();
      }}},[
        el("span",{className:"workspace-item__icon"},[icon("layers")]),
        el("span",{className:"workspace-item__name",text:workspace.name}),
        el("span",{className:"workspace-item__count",text:String(visibleCount)})
      ]));
    });
  }
  renderWorkspaceHeader(){
    const workspace=this.workspace;this.root.querySelector("#breadcrumb-name").textContent=workspace.name;
    const input=this.root.querySelector("#workspace-name");if(document.activeElement!==input)input.value=workspace.name;
    this.root.querySelector("#active-count").textContent=`${workspace.views.slice(0,workspace.layout).filter(view=>view.url).length} active`;
    this.root.querySelector("#panel-count").textContent=`${workspace.layout} panels`;
    this.root.querySelector("#refresh-interval").value=String(workspace.refreshInterval);
  }
  renderLayoutOptions(){
    const mount=this.root.querySelector("#layout-options");mount.replaceChildren();
    LAYOUTS.forEach(layout=>mount.append(el("button",{type:"button",className:`layout-choice ${this.workspace.layout===layout?"is-selected":""}`,text:String(layout),dataset:{layout},title:`${layout} view layout`,attrs:{"aria-label":`${layout} view layout`,"aria-pressed":String(this.workspace.layout===layout)}})));
  }
  renderRefreshControls(){
    const pause=this.root.querySelector("#pause-refresh");pause.disabled=!this.workspace.refreshInterval;
    pause.replaceChildren(icon(this.refreshPaused?"play":"pause"),el("span",{text:this.refreshPaused?"Resume":"Pause"}));
    this.root.querySelector("#reload-all").replaceChildren(icon("refresh"),el("span",{text:"Refresh all"}));
  }
  configureRefresh(){this.refreshController.configure(this.workspace.refreshInterval,this.refreshPaused);}
  renderViews(){
    const grid=this.root.querySelector("#view-grid");grid.dataset.layout=String(this.workspace.layout);
    const handlers={
      navigate:(id,raw)=>{try{setViewUrl(this.workspace,id,raw);this.persistAndRender();}catch(error){this.toast(error.message,"error");}},
      reload:id=>this.reloadView(id),open:id=>this.openView(id),
      clear:id=>{clearView(this.workspace,id);if(this.focusedViewId===id)this.focusedViewId=null;this.persistAndRender();},
      focus:id=>{this.focusedViewId=this.focusedViewId===id?null:id;this.renderViews();}
    };
    const fragment=document.createDocumentFragment();const visibleViews=this.workspace.views.slice(0,this.workspace.layout);
    visibleViews.forEach((view,index)=>{
      let card=this.panelNodes.get(view.id);
      if(!card){card=createViewCard(view,index,handlers);this.panelNodes.set(view.id,card);}
      updateViewCard(card,view,index,this.focusedViewId===view.id);
      card.hidden=Boolean(this.focusedViewId&&this.focusedViewId!==view.id);fragment.append(card);
    });
    grid.replaceChildren(fragment);grid.classList.toggle("is-focused",Boolean(this.focusedViewId));
    const knownIds=new Set(this.workspace.views.map(view=>view.id));
    for(const [id,card] of this.panelNodes){if(!knownIds.has(id)){card.remove();this.panelNodes.delete(id);}}
  }
  reloadView(id){
    const view=this.workspace.views.find(item=>item.id===id);const frame=this.panelNodes.get(id)?._parts?.frame;
    if(!view?.url||!frame)return this.toast("Add a website to this panel first.");
    frame.src=view.url;this.toast(`Reloading ${new URL(view.url).hostname}.`);
  }
  reloadAll(showToast=true){
    let count=0;this.workspace.views.slice(0,this.workspace.layout).forEach(view=>{
      if(!view.url)return;const frame=this.panelNodes.get(view.id)?._parts?.frame;if(frame){frame.src=view.url;count++;}
    });
    if(showToast)this.toast(count?`Refreshing ${count} website${count===1?"":"s"}.`:"Add a website before refreshing.");
  }
  openView(id){
    const view=this.workspace.views.find(item=>item.id===id);
    if(!view?.url)return this.toast("Add a website to this panel first.");
    window.open(view.url,"_blank","noopener,noreferrer");
  }
}