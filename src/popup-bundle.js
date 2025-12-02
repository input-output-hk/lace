// Popup bundle - switches between V1 and LMP based on stored mode
import { storage } from "webextension-polyfill";
import { STORAGE_KEY, APP_MODE } from "./const";

const stored = await storage.local.get(STORAGE_KEY.APP_MODE);
const mode = stored[STORAGE_KEY.APP_MODE];

if (mode === APP_MODE.LMP) {
  // Load Lace Midnight Preview popup script
  loadScript("/js/popup-script.js");
} else {
  // Default to Lace V1 (Cardano+Bitcoin)
  loadScript("/app/popup.js");
}

// PERF: appending to body might perform better
function loadScript(src) {
  const script = document.createElement("script");
  script.src = src;
  document.head.appendChild(script);
}
