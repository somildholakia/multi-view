export class RefreshController {
  constructor(onTick) { this.onTick=onTick; this.timer=null; }
  configure(seconds,paused=false) {
    this.stop();
    if(!seconds||paused) return;
    this.timer=window.setInterval(()=>{if(document.visibilityState==="visible") this.onTick();},seconds*1000);
  }
  stop() { if(this.timer!==null) window.clearInterval(this.timer); this.timer=null; }
}