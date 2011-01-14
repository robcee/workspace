const WS_WINDOW_URL = "chrome://workspace/content/workspace.xul";
const WS_WINDOW_FEATURES = "chrome,titlebar,toolbar,centerscreen,resizable,dialog=no";

function openWorkspace() {
  Services.ww.openWindow(null, WS_WINDOW_URL, "_blank",
                         WS_WINDOW_FEATURES, null);
}
