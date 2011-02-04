const WORKSPACE_WINDOW_URL = "chrome://workspace/content/workspace.xul";
const WORKSPACE_WINDOW_FEATURES = "chrome,titlebar,toolbar,centerscreen,resizable,dialog=no";

function openWorkspace() {
  Services.ww.openWindow(null, WORKSPACE_WINDOW_URL, "_blank",
                         WORKSPACE_WINDOW_FEATURES, null);
}
