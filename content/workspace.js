const Cu = Components.utils;

var jsm = {};

Cu.import("resource://gre/modules/Services.jsm", jsm);

Services = jsm.Services;

Workspace = {
  win: null,
  execute: function WS_execute(aEvent) {
    let textbox = document.getElementById("workspace-textbox");
    let text = textbox.value;
    let recentWin = Services.wm.getMostRecentWindow("navigator:browser");
    if (!recentWin)
      return null;
    this.gBrowser = recentWin.gBrowser;
    this.contentWindow = this.gBrowser.selectedBrowser.contentWindow;
    this.sandbox = new Cu.Sandbox(this.contentWindow,
      { sandboxPrototype: this.contentWindow, wantXrays: false });
    Cu.evalInSandbox(text, this.sandbox, "1.8", "Workspace", 1);
  },
}
