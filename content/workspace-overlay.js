gWorkspaceWindows = [];

const WS_WINDOW_URL = "chrome://workspace/content/workspace.xul";
const WS_WINDOW_FEATURES = "chrome,titlebar,toolbar,centerscreen,dialog=no";

function openWorkspace() {
  let win = Services.ww.openWindow(null, WS_WINDOW_URL, "_blank", WS_WINDOW_FEATURES, null);
  registerWorkspace(win);
}

function registerWorkspace(aWindow) {
  gWorkspaceWindows.push(aWindow);
}
