import { el, icon } from "./core/dom.js";
import { loadState, saveState } from "./core/storage.js";
import { getMediaDescriptor } from "./core/url.js";
import { savePlaybackPosition } from "./features/media/playback-store.js";
import { createWorkspace, duplicateWorkspace, LAYOUTS } from "./features/workspaces/workspace-model.js";
import { addUrls, changeLayout, clearView, reorderViews, setAllViewsUrl, setViewUrl } from "./features/views/view-manager.js";
import { createViewCard, updateViewCard } from "./features/views/view-card.js";
import { RefreshController } from "./features/refresh/refresh-controller.js";
import { downloadBackup, readBackup } from "./features/import-export/backup.js";
import { createToastHost } from "./ui/toast.js";
import { addBookmark, removeBookmark } from "./features/bookmarks/bookmark-manager.js";

const APP_MARKUP = `
<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="./" aria-label="MultiView home"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span class="brand-copy"><b>MultiView</b><small>Browse in parallel</small></span></a>
    <div class="sidebar-section"><div class="sidebar-heading"><span>Workspaces</span><button id="new-workspace" class="sidebar-add" aria-label="Create workspace" title="Create workspace">+</button></div><div id="workspace-list" class="workspace-list"></div></div>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-card"><div class="sidebar-card__icon"><span class="pulse"></span></div><div><b>Saved on this device</b><p>Your workspace stays in this browser. No account required.</p></div></div>
    <div class="sidebar-bottom"><span class="status-led"></span><span>Local mode</span><span class="sidebar-version">v0.3</span></div>
  </aside>
  <main class="main-area">
    <header class="topbar"><div class="breadcrumb"><span>Workspace</span><span class="breadcrumb-separator">/</span><strong id="breadcrumb-name">My workspace</strong></div>
      <div class="topbar-actions"><span class="privacy-label"><span></span> Private by default</span><button id="install-button" class="install-button" hidden><span>↓</span> Install app</button>
        <button id="export-button" class="top-icon-button" title="Export workspaces" aria-label="Export workspaces"></button><button id="import-button" class="top-icon-button" title="Import workspaces" aria-label="Import workspaces"></button><input id="import-file" type="file" accept="application/json,.json" hidden/></div>
    </header>
    <section class="page-content">
      <div class="hero-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR BROWSER, MULTIPLIED</div><h1>One screen.<br/><span>Many perspectives.</span></h1><p class="hero-description">Bring your favourite websites into one workspace. Compare, monitor and move between them without juggling tabs.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="art-window art-window--back"><i></i><i></i><i></i><b></b><b></b></div><div class="art-window art-window--front"><i></i><i></i><i></i><div class="art-grid"><b></b><b></b><b></b><b></b></div></div><span class="art-spark art-spark--one">✳</span><span class="art-spark art-spark--two">✦</span></div></div>
      <div class="workspace-heading"><div class="workspace-name-group"><span class="section-kicker">CURRENT WORKSPACE</span><input id="workspace-name" class="workspace-name-input" maxlength="48" aria-label="Workspace name"/></div><div class="workspace-stats"><span id="active-count">0 active</span><span class="stat-divider"></span><span id="panel-count">4 panels</span><button id="duplicate-workspace" class="quiet-button workspace-action" type="button" title="Duplicate this workspace">Duplicate</button><button id="delete-workspace" class="quiet-button workspace-action workspace-action--danger" type="button" title="Delete this workspace">Delete</button></div></div>
      <section class="control-panel">
        <div class="control-panel__top"><div class="control-title"><span class="control-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span><div><b>Window count</b><small>Choose anywhere from 1 to 20 panels</small></div></div><div class="panel-count-control"><label for="panel-count-select">WINDOWS</label><select id="panel-count-select" aria-label="Choose number of windows"></select><span class="panel-count-note">1–20</span></div></div>
        <div class="control-panel__bottom"><label class="autoplay-toggle" for="autoplay-videos"><input id="autoplay-videos" type="checkbox" checked/><span><b>Autoplay videos</b><small>Starts muted so browsers are more likely to allow playback</small></span></label><div class="refresh-control"><span class="refresh-label">AUTO REFRESH</span><select id="refresh-interval" aria-label="Auto refresh interval"><option value="0">Off</option><option value="15">Every 15 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option><option value="300">Every 5 minutes</option></select><span class="refresh-note">Refreshes while this app is open</span></div><div class="refresh-actions"><button id="pause-refresh" class="quiet-button"></button><button id="reload-all" class="primary-button"></button></div></div>
      </section>
      <section class="all-windows-site"><div class="all-windows-site__copy"><span class="all-windows-site__icon">↗</span><div><b>Open the same website in every window</b><p>Paste one URL to load it in all <strong id="all-windows-total">4</strong> panels.</p></div></div><form id="all-windows-form" class="all-windows-site__form"><input id="all-windows-url" type="text" inputmode="url" placeholder="https://example.com" aria-label="Website URL for all windows"/><button class="all-windows-site__button" type="submit"><span>↗</span> Open in all windows</button></form></section>
      <section class="add-sites"><div class="add-sites__copy"><span class="add-sites__icon">↗</span><div><b>Add websites to this workspace</b><p>Paste one URL per line to fill multiple panels at once.</p></div></div><form id="add-sites-form" class="add-sites__form"><textarea id="bulk-urls" rows="1" placeholder="https://example.com&#10;https://another-site.com" aria-label="Website URLs"></textarea><button class="add-sites-button" type="submit"><span>+</span> Add websites</button></form></section>
      <section class="bookmark-section"><div class="bookmark-section__heading"><div><span class="section-kicker">QUICK ACCESS</span><span class="bookmark-section__subtitle">Your saved websites, ready to open in a panel</span></div><span class="bookmark-count" id="bookmark-count">0 saved</span></div><div id="bookmark-list" class="bookmark-list"></div></section>
      <div class="views-heading"><div><h2>Your views</h2><span>Drag panels to rearrange · Each panel works independently</span></div><div class="views-heading__actions"><button id="open-video-tabs" class="quiet-button" type="button" title="Open video links in separate tabs so they can continue while MultiView is closed">▶ Keep videos playing in tabs</button><button id="open-all" class="quiet-button" type="button" title="Open every configured website in its own browser tab">↗ Open all in tabs</button><span class="views-hint"><span class="views-hint-dot"></span> Saved workspace</span></div></div><div id="view-grid" class="view-grid"></div>
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
    $("#panel-count-select").addEventListener("change",event=>{
      changeLayout(this.workspace,Number(event.target.value));this.focusedViewId=null;this.persistAndRender();
    });
    $("#autoplay-videos").addEventListener("change",event=>{
      this.workspace.autoPlayVideos=event.target.checked;
      this.persistAndRender();
      this.toast(event.target.checked?"Muted video autoplay enabled.":"Video autoplay disabled.");
    });
    $("#refresh-interval").addEventListener("change",event=>{this.workspace.refreshInterval=Number(event.target.value);this.refreshPaused=false;this.persistAndRender();});
    $("#pause-refresh").addEventListener("click",()=>{
      if(!this.workspace.refreshInterval)return this.toast("Choose a refresh interval first.");
      this.refreshPaused=!this.refreshPaused;this.configureRefresh();this.renderRefreshControls();
    });
    $("#reload-all").addEventListener("click",()=>this.reloadAll(true));
    $("#duplicate-workspace").addEventListener("click",()=>{
      const copy=duplicateWorkspace(this.workspace,`${this.workspace.name} copy`);
      this.state.workspaces.push(copy);this.state.activeWorkspaceId=copy.id;
      this.focusedViewId=null;this.refreshPaused=false;this.persistAndRender();
      this.toast("Workspace duplicated with its website layout.","success");
    });
    $("#delete-workspace").addEventListener("click",()=>{
      if(this.state.workspaces.length===1)return this.toast("Keep at least one workspace.");
      if(!window.confirm(`Delete "${this.workspace.name}" and its saved panel URLs?`))return;
      this.state.workspaces=this.state.workspaces.filter(item=>item.id!==this.workspace.id);
      this.state.activeWorkspaceId=this.state.workspaces[0].id;
      this.focusedViewId=null;this.refreshPaused=false;this.persistAndRender();
      this.toast("Workspace deleted.","success");
    });
    $("#open-all").addEventListener("click",()=>this.openAllViews());
    $("#open-video-tabs").addEventListener("click",()=>this.openVideoTabs());
    $("#add-sites-form").addEventListener("submit",event=>{
      event.preventDefault();const input=$("#bulk-urls");
      const urls=input.value.split(/[\n,]+/).map(line=>line.trim()).filter(Boolean);
      if(!urls.length)return this.toast("Paste at least one website address.");
      try{const count=addUrls(this.workspace,urls);input.value="";this.focusedViewId=null;this.persistAndRender();this.toast(`${count} website${count===1?"":"s"} added to this workspace.`,"success");}
      catch(error){this.toast(error.message,"error");}
    });
    $("#all-windows-form").addEventListener("submit",event=>{
      event.preventDefault();const input=$("#all-windows-url");
      try{
        const count=setAllViewsUrl(this.workspace,input.value);
        input.value="";this.focusedViewId=null;this.persistAndRender();
        this.toast(`Opened the website in all ${count} windows.`,"success");
      }catch(error){this.toast(error.message,"error");}
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
        const savedUrls=new Set(this.state.bookmarks.map(item=>item.url));
        imported.bookmarks.forEach(item=>{if(!savedUrls.has(item.url)){this.state.bookmarks.push(item);savedUrls.add(item.url);}});
        this.persistAndRender();this.toast("Backup imported.","success");
      }catch(error){this.toast(error.message||"Could not import that backup.","error");}
      finally{event.target.value="";}
    });
    $("#install-button").addEventListener("click",async()=>{
      if(!this.installPrompt)return;this.installPrompt.prompt();await this.installPrompt.userChoice;this.installPrompt=null;$("#install-button").hidden=true;
    });
  }
  persistAndRender(){if(!saveState(this.state))this.toast("Browser storage is full. Export a backup before continuing.","error");this.render();}
  render(){this.renderWorkspaces();this.renderWorkspaceHeader();this.renderLayoutOptions();this.renderRefreshControls();this.renderBookmarks();this.renderViews();this.configureRefresh();}
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
    this.root.querySelector("#panel-count").textContent=`${workspace.layout} windows`;
    this.root.querySelector("#all-windows-total").textContent=String(workspace.layout);
    this.root.querySelector("#refresh-interval").value=String(workspace.refreshInterval);
    this.root.querySelector("#autoplay-videos").checked=workspace.autoPlayVideos!==false;
  }
  renderLayoutOptions(){
    const select=this.root.querySelector("#panel-count-select");
    const options=LAYOUTS.map(count=>{
      const option=document.createElement("option");
      option.value=String(count);option.textContent=`${count} window${count===1?"":"s"}`;
      return option;
    });
    select.replaceChildren(...options);
    select.value=String(this.workspace.layout);
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
      bookmark:id=>this.toggleBookmark(id),
      reorder:(sourceId,targetId)=>{if(reorderViews(this.workspace,sourceId,targetId)){this.focusedViewId=null;this.persistAndRender();this.toast("Panels reordered.","success");}},
      focus:id=>{this.focusedViewId=this.focusedViewId===id?null:id;this.renderViews();},
      pictureInPicture:id=>this.togglePictureInPicture(id),
      progress:(id,url,seconds)=>this.saveVideoProgress(id,url,seconds)
    };
    const fragment=document.createDocumentFragment();const visibleViews=this.workspace.views.slice(0,this.workspace.layout);
    visibleViews.forEach((view,index)=>{
      let card=this.panelNodes.get(view.id);
      if(!card){card=createViewCard(view,index,handlers);this.panelNodes.set(view.id,card);}
      updateViewCard(card,view,index,this.focusedViewId===view.id,this.state.bookmarks.some(item=>item.url===view.url),this.workspace.autoPlayVideos!==false);
      card.hidden=Boolean(this.focusedViewId&&this.focusedViewId!==view.id);fragment.append(card);
    });
    grid.replaceChildren(fragment);grid.classList.toggle("is-focused",Boolean(this.focusedViewId));
    const knownIds=new Set(this.workspace.views.map(view=>view.id));
    for(const [id,card] of this.panelNodes){if(!knownIds.has(id)){card.remove();this.panelNodes.delete(id);}}
  }
  renderBookmarks(){
    const mount=this.root.querySelector("#bookmark-list");
    mount.replaceChildren();
    const bookmarks=this.state.bookmarks||[];
    this.root.querySelector("#bookmark-count").textContent=`${bookmarks.length} saved`;
    if(!bookmarks.length){
      mount.append(el("div",{className:"bookmark-empty"},[
        icon("bookmark"),
        el("span",{text:"Save a website from any panel using its bookmark icon. Your quick access list stays on this device."})
      ]));
      return;
    }
    bookmarks.forEach(bookmark=>{
      const chip=el("div",{className:"bookmark-chip"},[
        el("button",{type:"button",className:"bookmark-chip__open",title:`Open ${bookmark.title} in a panel`,on:{click:()=>this.openBookmark(bookmark)}},[
          icon("bookmark"),
          el("span",{text:bookmark.title}),
          el("small",{text:new URL(bookmark.url).hostname.replace(/^www[.]/,"")})
        ]),
        el("button",{type:"button",className:"bookmark-chip__remove",title:`Remove ${bookmark.title} from quick access`,attrs:{"aria-label":`Remove ${bookmark.title}`},on:{click:()=>{removeBookmark(this.state,bookmark.id);this.persistAndRender();this.toast("Bookmark removed.");}}},[icon("trash")])
      ]);
      mount.append(chip);
    });
  }
  toggleBookmark(viewId){
    const view=this.workspace.views.find(item=>item.id===viewId);
    if(!view?.url)return this.toast("Add a website to this panel first.");
    const existing=this.state.bookmarks.find(item=>item.url===view.url);
    if(existing){
      removeBookmark(this.state,existing.id);
      this.persistAndRender();
      this.toast("Removed from quick access.");
      return;
    }
    const result=addBookmark(this.state,view);
    this.persistAndRender();
    this.toast(result.created?"Saved to quick access.":"This website is already saved.",result.created?"success":"info");
  }
  openBookmark(bookmark){
    if(this.workspace.views.some(view=>view.url===bookmark.url))return this.toast("This website is already open in the current workspace.");
    try{
      addUrls(this.workspace,[bookmark.url]);
      this.focusedViewId=null;this.persistAndRender();
      this.toast(`Opened ${bookmark.title} in this workspace.`,"success");
    }catch(error){this.toast(error.message,"error");}
  }
  reloadView(id){
    const view=this.workspace.views.find(item=>item.id===id);
    const parts=this.panelNodes.get(id)?._parts;
    if(!view?.url||!parts)return this.toast("Add a website or video to this panel first.");
    const media=getMediaDescriptor(view.url,{autoPlay:this.workspace.autoPlayVideos!==false});
    if(media.type==="video"&&parts.video){
      parts.video.pause();parts.video.src=media.src;parts.video.load();
    }else if(parts.frame){
      parts.frame.src=media.src;
    }
    this.toast(`Reloading ${new URL(view.url).hostname}.`);
  }
  async saveVideoProgress(viewId,url,seconds){
    const view=this.workspace.views.find(item=>item.id===viewId);
    if(!view?.url||view.url!==url||!Number.isFinite(seconds))return;
    await savePlaybackPosition(url,seconds);
  }
  async togglePictureInPicture(viewId){
    const video=this.panelNodes.get(viewId)?._parts?.video;
    if(!video||typeof video.requestPictureInPicture!=="function"){
      return this.toast("Picture-in-Picture is available for supported direct video files. Use the video tab for YouTube.");
    }
    try{
      if(document.pictureInPictureElement===video)await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    }catch(error){
      this.toast("Picture-in-Picture was blocked by the browser. Try opening the video in its own tab.","error");
    }
  }
  openVideoTabs(){
    const targets=this.workspace.views.slice(0,this.workspace.layout).filter(view=>{
      if(!view.url)return false;
      return getMediaDescriptor(view.url).type!=="website";
    });
    if(!targets.length)return this.toast("Add a YouTube link or video URL first.");
    let opened=0;
    targets.forEach(view=>{
      if(window.open(view.url,"_blank","noopener,noreferrer"))opened++;
    });
    this.toast(`Opened ${opened} of ${targets.length} video tabs. Keep those tabs open; you can close the MultiView dashboard.`);
  }
  openAllViews(){
    const targets=this.workspace.views.slice(0,this.workspace.layout).filter(view=>view.url);
    if(!targets.length)return this.toast("Add at least one website before opening tabs.");
    targets.forEach(view=>window.open(view.url,"_blank","noopener,noreferrer"));
    this.toast(`Requested ${targets.length} browser tabs. Allow pop-ups for MultiView if any were blocked; keep those tabs open after closing this dashboard.`);
  }
  reloadAll(showToast=true){
    let count=0;this.workspace.views.slice(0,this.workspace.layout).forEach(view=>{
      if(!view.url)return;
      const parts=this.panelNodes.get(view.id)?._parts;
      if(!parts)return;
      const media=getMediaDescriptor(view.url,{autoPlay:this.workspace.autoPlayVideos!==false});
      if(media.type==="video"&&parts.video){
        parts.video.pause();parts.video.src=media.src;parts.video.load();count++;
      }else if(parts.frame){
        parts.frame.src=media.src;count++;
      }
    });
    if(showToast)this.toast(count?`Refreshing ${count} panel${count===1?"":"s"}.`:"Add a website or video before refreshing.");
  }
  openView(id){
    const view=this.workspace.views.find(item=>item.id===id);
    if(!view?.url)return this.toast("Add a website to this panel first.");
    window.open(view.url,"_blank","noopener,noreferrer");
  }
}