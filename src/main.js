import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/layouts.css";
import { MultiViewApp } from "./app.js";
const app = new MultiViewApp(document.querySelector("#app"));
app.start();
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js")
      .catch(error => console.warn("Service worker registration failed:", error));
  });
}
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  app.setInstallPrompt(event);
});