export class RefreshController {
  constructor(onTick) {
    this.onTick=onTick;
    this.timer=null;
    this.intervalMs=0;
    this.paused=false;
    this.nextTickAt=0;
    this.scope=null;
  }

  configure(seconds,paused=false,scope=null) {
    const intervalMs=Math.max(0,Number(seconds)||0)*1000;
    const nextPaused=Boolean(paused);
    if(this.intervalMs===intervalMs&&this.paused===nextPaused&&this.scope===scope)return;
    this.stop();
    this.intervalMs=intervalMs;
    this.paused=nextPaused;
    this.scope=scope;
    if(!this.intervalMs||this.paused)return;
    this.nextTickAt=Date.now()+this.intervalMs;
    this.timer=window.setInterval(()=>this.checkDue(),this.intervalMs);
  }

  checkDue() {
    if(!this.intervalMs||this.paused||document.visibilityState!=="visible")return false;
    const now=Date.now();
    if(now<this.nextTickAt)return false;
    // Run one refresh after a suspended/background period instead of replaying
    // every missed interval and overwhelming the phone on return.
    this.nextTickAt=now+this.intervalMs;
    this.onTick();
    return true;
  }

  resume() {
    return this.checkDue();
  }

  stop() {
    if(this.timer!==null)window.clearInterval(this.timer);
    this.timer=null;
    this.intervalMs=0;
    this.nextTickAt=0;
  }
}
