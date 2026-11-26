import { el, icon } from "./core/dom.js";
import { loadState, saveState } from "./core/storage.js";
import { getMediaDescriptor } from "./core/url.js";
import { savePlaybackPosition } from "./features/media/playback-store.js";
import { createWorkspace, duplicateWorkspace, LAYOUTS } from "./features/workspaces/workspace-model.js";
import { addUrls, changeLayout, clearAllViews, clearView, reorderViews, setAllViewsUrl, setViewUrl } from "./features/views/view-manager.js";
import { createViewCard, disposeViewCard, updateViewCard } from "./features/views/view-card.js";
import { RefreshController } from "./features/refresh/refresh-controller.js";
import { downloadBackup, readBackup } from "./features/import-export/backup.js";
import { createToastHost } from "./ui/toast.js";
import { addBookmark, removeBookmark } from "./features/bookmarks/bookmark-manager.js";
import { FREE_PROXY_COUNTRIES, FREE_PROXY_DURATIONS, formatProxyTimeLeft, getFreeProxyLaunchUrl, getProxyCountry, normalizeProxySettings } from "./features/proxy/free-proxy.js";

const PROXY_SETTINGS_KEY = "multi-view.free-proxy-settings.v1";

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
      <div class="hero-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> YOUR BROWSER, MULTIPLIED</div><h1>More room.<br/><span>Less tab chaos.</span></h1><p class="hero-description">A bright, flexible desk for the websites and videos you need. Panels load as you reach them, so a 20-window workspace stays easier on your device.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="art-window art-window--back"><i></i><i></i><i></i><b></b><b></b></div><div class="art-window art-window--front"><i></i><i></i><i></i><div class="art-grid"><b></b><b></b><b></b><b></b></div></div><div class="hero-art__count"><strong>20</strong><span>windows max</span></div><span class="art-spark art-spark--one">✳</span><span class="art-spark art-spark--two">✦</span></div></div>
      <div class="workspace-heading"><div class="workspace-name-group"><span class="section-kicker">CURRENT WORKSPACE</span><input id="workspace-name" class="workspace-name-input" maxlength="48" aria-label="Workspace name"/></div><div class="workspace-stats"><span id="active-count">0 active</span><span class="stat-divider"></span><span id="panel-count">4 panels</span><button id="duplicate-workspace" class="quiet-button workspace-action" type="button" title="Duplicate this workspace">Duplicate</button><button id="delete-workspace" class="quiet-button workspace-action workspace-action--danger" type="button" title="Delete this workspace">Delete</button></div></div>
      <section class="control-panel">
        <div class="control-panel__top"><div class="control-title"><span class="control-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg></span><div><b>Window count</b><small>Choose anywhere from 1 to 20 panels</small></div></div><div class="panel-count-control"><label for="panel-count-select">WINDOWS</label><select id="panel-count-select" aria-label="Choose number of windows"></select><span class="panel-count-note">1–20</span></div></div>
        <div class="control-panel__bottom"><label class="autoplay-toggle" for="autoplay-videos"><input id="autoplay-videos" type="checkbox" checked/><span><b>Autoplay videos</b><small>Starts muted so browsers are more likely to allow playback</small></span></label><div class="refresh-control"><span class="refresh-label">AUTO REFRESH</span><select id="refresh-interval" aria-label="Auto refresh interval"><option value="0">Off</option><option value="15">Every 15 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option><option value="300">Every 5 minutes</option></select><span class="refresh-note">Catches up once when you return from the background</span></div><div class="refresh-actions"><button id="pause-refresh" class="quiet-button"></button><button id="reload-all" class="primary-button"></button></div></div>
      </section>
      <section class="background-resilience-panel" aria-labelledby="background-resilience-title">
        <div class="background-resilience-panel__top">
          <span class="background-resilience-panel__icon">⏱</span>
          <div>
            <span class="section-kicker">ANDROID BACKGROUND SUPPORT</span>
            <b id="background-resilience-title">Background resilience</b>
            <p>MultiView saves your workspace before Chrome suspends this page and checks overdue auto-refresh when you return.</p>
          </div>
          <span id="background-resilience-status" class="background-resilience-status">Autosave active</span>
        </div>
        <div class="background-resilience-panel__note">
          <b>For better background retention on your Galaxy:</b>
          Settings → Battery → Background usage limits → Never sleeping apps → Add Chrome.
          This helps prevent Samsung's app sleep, but Chrome can still pause individual website tabs. Continuous background execution is not guaranteed.
        </div>
      </section>
      <section class="all-windows-site"><div class="all-windows-site__copy"><span class="all-windows-site__icon">↗</span><div><b>Open the same website in every window</b><p>Paste one URL to load it in all <strong id="all-windows-total">4</strong> panels.</p></div></div><form id="all-windows-form" class="all-windows-site__form"><input id="all-windows-url" type="text" inputmode="url" placeholder="https://example.com" aria-label="Website URL for all windows"/><button class="all-windows-site__button" type="submit"><span>↗</span> Open in all windows</button></form></section>
      <section class="free-proxy-panel">
        <div class="free-proxy-panel__top">
          <div class="free-proxy-panel__copy">
            <span class="free-proxy-panel__icon">🌐</span>
            <div><span class="section-kicker">OPTIONAL THIRD-PARTY ROUTING</span><b>External web proxy (not a VPN)</b><p>Opens a separate third-party proxy page. Dashboard panels continue to use your normal browser network.</p></div>
          </div>
          <div class="free-proxy-panel__settings">
            <label>COUNTRY<select id="proxy-country" aria-label="Free proxy country"></select></label>
            <label>AUTO-CLOSE<select id="proxy-duration" aria-label="Proxy tab auto-close timer"></select></label>
          </div>
        </div>
        <div class="free-proxy-panel__bottom">
          <p>Routing status: unverified. MultiView cannot inspect the proxy connection or confirm an exit IP. A device VPN must be connected outside this website. Do not use untrusted proxies for sensitive logins.</p>
          <div class="free-proxy-panel__sessions"><span id="proxy-session-status">No external proxy tabs launched</span><button id="close-proxy-sessions" class="quiet-button" type="button" disabled>Close proxy tabs</button></div>
          <div id="proxy-session-list" class="proxy-session-list" aria-live="polite"></div>
        </div>
      </section>
      <section class="add-sites"><div class="add-sites__copy"><span class="add-sites__icon">↗</span><div><b>Add websites to this workspace</b><p>Paste one URL per line to fill multiple panels at once.</p></div></div><form id="add-sites-form" class="add-sites__form"><textarea id="bulk-urls" rows="1" placeholder="https://example.com&#10;https://another-site.com" aria-label="Website URLs"></textarea><button class="add-sites-button" type="submit"><span>+</span> Add websites</button></form></section>
      <section class="bookmark-section"><div class="bookmark-section__heading"><div><span class="section-kicker">QUICK ACCESS</span><span class="bookmark-section__subtitle">Your saved websites, ready to open in a panel</span></div><span class="bookmark-count" id="bookmark-count">0 saved</span></div><div id="bookmark-list" class="bookmark-list"></div></section>
      <div class="views-heading"><div><h2>Your views</h2><span>Drag panels to rearrange · Each panel works independently</span></div><div class="views-heading__actions"><button id="clear-all-views" class="danger-button" type="button" title="Remove all loaded websites and reset to four blank panels">Close all windows</button><button id="open-video-tabs" class="quiet-button" type="button" title="Open video links in separate tabs so they can continue while MultiView is closed">▶ Keep videos playing in tabs</button><button id="open-all" class="quiet-button" type="button" title="Open every configured website in its own browser tab">↗ Open all in tabs</button><span class="views-hint"><span class="views-hint-dot"></span> Saved workspace</span></div></div><div id="view-grid" class="view-grid"></div>
      <footer class="app-footer"><span><b>MultiView</b> · Your workspace, your way.</span><span>Websites control whether they allow embedded viewing.</span></footer>
    </section>
  </main>
</div><div id="toast-mount"></div>`;

export class MultiViewApp {
  constructor(root){
    this.root=root;this.state=loadState();this.panelNodes=new Map();this.focusedViewId=null;
    this.installPrompt=null;this.refreshPaused=false;this.refreshController=new RefreshController(()=>this.reloadAll(false));this.toast=null;
    this.proxySettings=this.loadProxySettings();this.proxySessions=new Map();this.proxyTicker=null;
    this.lastBackgroundReturnAt=0;this.lastBackgroundAwayMs=0;
  }
  start(){
    this.root.innerHTML=APP_MARKUP;this.toast=createToastHost(this.root.querySelector("#toast-mount"));
    this.bindStaticEvents();this.render();
    document.addEventListener("keydown",event=>{if(event.key==="Escape"&&this.focusedViewId){this.focusedViewId=null;this.renderViews();}});
    document.addEventListener("visibilitychange",()=>this.handleVisibilityChange());
    document.addEventListener("freeze",()=>this.saveForBackground());
    document.addEventListener("resume",()=>this.handleForegroundReturn());
    window.addEventListener("pagehide",()=>this.saveForBackground());
    window.addEventListener("pageshow",()=>this.handleForegroundReturn());
    window.addEventListener("focus",()=>this.handleForegroundReturn());
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
    $("#proxy-country").addEventListener("change",event=>{
      this.proxySettings=normalizeProxySettings({...this.proxySettings,country:event.target.value});
      this.saveProxySettings();this.renderProxySessions();
    });
    $("#proxy-duration").addEventListener("change",event=>{
      this.proxySettings=normalizeProxySettings({...this.proxySettings,durationMinutes:Number(event.target.value)});
      this.saveProxySettings();
    });
    $("#close-proxy-sessions").addEventListener("click",()=>this.closeProxySessions());
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
    $("#clear-all-views").addEventListener("click",()=>{
      const count=this.workspace.views.filter(view=>view.url).length;
      const hasExtraPanels=this.workspace.layout>1||this.workspace.views.length>1;
      if(!count&&!hasExtraPanels)return this.toast("This workspace is already empty.");
      if(!window.confirm(`Clear all ${count} loaded websites and videos, and reset this workspace to one blank window?`))return;
      const cleared=clearAllViews(this.workspace);
      this.focusedViewId=null;
      this.persistAndRender();
      this.toast(`Closed all windows and released their page content; one blank panel remains.`,"success");
    });
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
  render(){this.renderWorkspaces();this.renderWorkspaceHeader();this.renderLayoutOptions();this.renderRefreshControls();this.renderProxyControls();this.renderProxySessions();this.renderBackgroundStatus();this.renderBookmarks();this.renderViews();this.configureRefresh();}
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
  saveForBackground(){
    // Persist workspace data at the last reliably observable point before
    // Chrome hides, freezes, navigates away from, or discards this page.
    if(!saveState(this.state))console.warn("MultiView could not save before background suspension.");
    try{sessionStorage.setItem("multi-view.last-background-at",String(Date.now()));}catch{}
  }
  handleVisibilityChange(){
    if(document.visibilityState==="hidden"){
      this.saveForBackground();
      this.updateProxySessions();
      return;
    }
    this.handleForegroundReturn();
  }
  handleForegroundReturn(){
    if(document.visibilityState!=="visible")return;
    let previous=0;
    try{
      previous=Number(sessionStorage.getItem("multi-view.last-background-at")||0);
      sessionStorage.removeItem("multi-view.last-background-at");
    }catch{}
    this.lastBackgroundAwayMs=previous?Math.max(0,Date.now()-previous):0;
    this.lastBackgroundReturnAt=previous?Date.now():0;
    const refreshed=this.refreshController.resume();
    this.updateProxySessions();
    this.renderBackgroundStatus(refreshed);
  }
  renderBackgroundStatus(refreshed=false){
    const status=this.root.querySelector("#background-resilience-status");
    if(!status)return;
    if(this.lastBackgroundAwayMs>=5000){
      const seconds=Math.round(this.lastBackgroundAwayMs/1000);
      const away=seconds>=3600?`${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}m`:seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;
      status.textContent=refreshed?`Resumed · refreshed after ${away}`:`Resumed after ${away}`;
      status.classList.add("is-resumed");
    }else{
      status.textContent=refreshed?"Overdue refresh completed":"Autosave active";
      status.classList.toggle("is-resumed",refreshed);
    }
  }
  loadProxySettings(){
    try{return normalizeProxySettings(JSON.parse(localStorage.getItem(PROXY_SETTINGS_KEY)||"{}"));}
    catch{return normalizeProxySettings();}
  }
  saveProxySettings(){
    try{localStorage.setItem(PROXY_SETTINGS_KEY,JSON.stringify(this.proxySettings));}
    catch{this.toast("Could not save proxy preferences on this browser.","error");}
  }
  renderProxyControls(){
    const countrySelect=this.root.querySelector("#proxy-country");
    const durationSelect=this.root.querySelector("#proxy-duration");
    if(!countrySelect||!durationSelect)return;
    countrySelect.replaceChildren(...FREE_PROXY_COUNTRIES.map(country=>{
      const option=document.createElement("option");
      option.value=country.code;option.textContent=`${country.flag} ${country.name}`;
      return option;
    }));
    durationSelect.replaceChildren(...FREE_PROXY_DURATIONS.map(minutes=>{
      const option=document.createElement("option");
      option.value=String(minutes);
      option.textContent=minutes===0?"No auto-close":minutes<60?`${minutes} minutes`:`${minutes/60} hour${minutes===60?"":"s"}`;
      return option;
    }));
    countrySelect.value=this.proxySettings.country;
    durationSelect.value=String(this.proxySettings.durationMinutes);
  }
  async copyProxyTarget(url){
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);return true;}
    }catch{}
    try{
      const field=document.createElement("textarea");
      field.value=url;field.setAttribute("readonly","");
      field.style.position="fixed";field.style.opacity="0";field.style.pointerEvents="none";
      document.body.append(field);field.select();
      const copied=document.execCommand("copy");field.remove();return copied;
    }catch{return false;}
  }
  launchProxyForView(viewId){
    const view=this.workspace.views.find(item=>item.id===viewId);
    if(!view?.url)return this.toast("Add a website to this panel first.");
    const country=getProxyCountry(this.proxySettings.country);
    const opened=window.open(getFreeProxyLaunchUrl(country.code),"_blank");
    if(!opened)return this.toast("The browser blocked the proxy tab. Allow pop-ups for MultiView and try again.","error");
    try{opened.opener=null;}catch{}
    const existing=this.proxySessions.get(viewId);
    if(existing&&!existing.tab?.closed){try{existing.tab.close();}catch{}}
    const panelNumber=this.workspace.views.findIndex(item=>item.id===viewId)+1;
    const durationMinutes=this.proxySettings.durationMinutes;
    this.proxySessions.set(viewId,{
      tab:opened,viewId,panelNumber,workspaceName:this.workspace.name,countryName:country.name,
      expiresAt:durationMinutes?Date.now()+durationMinutes*60_000:null,expired:false
    });
    this.ensureProxyTicker();this.renderProxySessions();
    this.copyProxyTarget(view.url).then(copied=>{
      const media=getMediaDescriptor(view.url);
      const videoWarning=media.type!=="website"?" Video streaming may fail on this free proxy.":"";
      this.toast(copied
        ?`Panel ${panelNumber}: URL copied. Paste it into the ${country.name} proxy tab and complete the verification.${videoWarning}`
        :`Panel ${panelNumber}: proxy opened. Copy the panel URL and paste it into the ${country.name} proxy tab.${videoWarning}`,
        copied?"success":"info");
    });
  }
  ensureProxyTicker(){
    if(this.proxyTicker!==null)return;
    this.proxyTicker=window.setInterval(()=>this.updateProxySessions(),1000);
  }
  updateProxySessions(){
    if(!this.proxySessions.size){
      if(this.proxyTicker!==null){window.clearInterval(this.proxyTicker);this.proxyTicker=null;}
      this.renderProxySessions();return;
    }
    let changed=false;
    const now=Date.now();
    for(const [id,session] of this.proxySessions){
      if(!session.tab||session.tab.closed){this.proxySessions.delete(id);changed=true;continue;}
      if(session.expiresAt&&now>=session.expiresAt&&!session.expired){
        session.expired=true;session.expiresAt=null;
        try{session.tab.close();}catch{}
        if(session.tab.closed)this.proxySessions.delete(id);
        else session.manualCloseRequired=true;
        changed=true;
      }
    }
    this.renderProxySessions();
    if(!this.proxySessions.size&&this.proxyTicker!==null){window.clearInterval(this.proxyTicker);this.proxyTicker=null;}
    if(changed&&[...this.proxySessions.values()].some(session=>session.manualCloseRequired)){
      this.toast("A proxy timer ended. Android may delay tab closure in the background; close any tab marked as expired manually.","info");
    }
  }
  renderProxySessions(){
    const mount=this.root.querySelector("#proxy-session-list");
    const status=this.root.querySelector("#proxy-session-status");
    const closeButton=this.root.querySelector("#close-proxy-sessions");
    if(!mount||!status||!closeButton)return;
    mount.replaceChildren();
    const sessions=[...this.proxySessions.values()];
    status.textContent=sessions.length?`${sessions.length} external proxy tab${sessions.length===1?"":"s"} tracked · routing unverified`:"No external proxy tabs launched";
    closeButton.disabled=!sessions.length;
    sessions.forEach(session=>{
      const remaining=session.expiresAt?formatProxyTimeLeft(session.expiresAt-Date.now()):"No timer";
      const detail=session.manualCloseRequired?"Timer ended · close this tab manually":session.expired?"Closing…":session.expiresAt?`Auto-close in ${remaining}`:"Auto-close off";
      mount.append(el("div",{className:"proxy-session-chip"},[
        el("strong",{text:`Panel ${session.panelNumber}`}),
        el("span",{text:`Requested: ${session.countryName} · unverified`}),
        el("small",{text:detail})
      ]));
    });
  }
  closeProxySessions(){
    if(!this.proxySessions.size)return;
    let manual=0;
    for(const [id,session] of this.proxySessions){
      try{session.tab?.close();}catch{}
      if(session.tab?.closed)this.proxySessions.delete(id);
      else{session.expired=true;session.expiresAt=null;session.manualCloseRequired=true;manual++;}
    }
    this.renderProxySessions();
    if(!this.proxySessions.size&&this.proxyTicker!==null){window.clearInterval(this.proxyTicker);this.proxyTicker=null;}
    this.toast(manual?`${manual} tab${manual===1?"":"s"} could not be closed automatically. Close them from the browser tab switcher.`:"All tracked proxy tabs were closed.","success");
  }
  renderViews(){
    const grid=this.root.querySelector("#view-grid");grid.dataset.layout=String(this.workspace.layout);
    const handlers={
      navigate:(id,raw)=>{try{setViewUrl(this.workspace,id,raw);this.persistAndRender();}catch(error){this.toast(error.message,"error");}},
      reload:id=>this.reloadView(id),open:id=>this.openView(id),proxy:id=>this.launchProxyForView(id),
      clear:id=>{clearView(this.workspace,id);if(this.focusedViewId===id)this.focusedViewId=null;this.persistAndRender();},
      bookmark:id=>this.toggleBookmark(id),
      reorder:(sourceId,targetId)=>{if(reorderViews(this.workspace,sourceId,targetId)){this.focusedViewId=null;this.persistAndRender();this.toast("Panels reordered.","success");}},
      focus:id=>{this.focusedViewId=this.focusedViewId===id?null:id;this.renderViews();},
      pictureInPicture:id=>this.togglePictureInPicture(id),
      progress:(id,url,seconds)=>this.saveVideoProgress(id,url,seconds)
    };
    const visibleViews=this.workspace.views.slice(0,this.workspace.layout);
    const visibleIds=new Set();
    visibleViews.forEach((view,index)=>{
      visibleIds.add(view.id);
      let card=this.panelNodes.get(view.id);
      if(!card){card=createViewCard(view,index,handlers);this.panelNodes.set(view.id,card);}
      updateViewCard(card,view,index,this.focusedViewId===view.id,this.state.bookmarks.some(item=>item.url===view.url),this.workspace.autoPlayVideos!==false);
      card.hidden=Boolean(this.focusedViewId&&this.focusedViewId!==view.id);
      const current=grid.children[index]||null;
      if(current!==card)grid.insertBefore(card,current);
    });
    while(grid.children.length>visibleViews.length)grid.lastElementChild.remove();
    grid.classList.toggle("is-focused",Boolean(this.focusedViewId));
    for(const [id,card] of this.panelNodes){
      if(!visibleIds.has(id)){
        disposeViewCard(card);
        card.remove();
        this.panelNodes.delete(id);
      }
    }
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
    targets.forEach(view=>{
      const playerUrl=getMediaDescriptor(view.url,{autoPlay:true}).src;
      window.open(playerUrl,"_blank","noopener,noreferrer");
    });
    this.toast(`Requested ${targets.length} video tabs with muted autoplay. Keep those tabs open; you can close the MultiView dashboard. Allow pop-ups if the browser blocks them.`);
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