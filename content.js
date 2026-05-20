// Bridge: isolated world -> main world
if (typeof browser === "undefined") {
  var browser = chrome;
}

// Listen for messages from the main world (tiktokmod.js)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "tiktokmod:getSettings") {
    chrome.storage.sync.get(null, (settings) => {
      window.postMessage({ type: "tiktokmod:settings", settings }, "*");
    });
  }
  if (event.data?.type === "tiktokmod:saveSettings") {
    chrome.storage.sync.set(event.data.settings);
  }
});

// Inject meta info on load
document.addEventListener("DOMContentLoaded", () => {
  window.postMessage({
    type: "tiktokmod:meta",
    meta: {
      EXTENSION_VERSION: browser.runtime.getManifest().version,
      EXTENSION_BASE_URL: browser.runtime.getURL(""),
    }
  }, "*");
}, { once: true });
