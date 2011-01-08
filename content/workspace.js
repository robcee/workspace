const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/PropertyPanel.jsm");

Workspace = {
  win: null,

  get textbox() {
    return document.getElementById("workspace-textbox");
  },

  get selectedText() {
    let text = this.textbox.value;
    let selectionStart = this.textbox.selectionStart;
    let selectionEnd = this.textbox.selectionEnd;
    if (selectionStart != selectionEnd)
      return text.substring(selectionStart, selectionEnd);
    return "";
  },

  get browserWindow() {
    return Services.wm.getMostRecentWindow("navigator:browser");
  },

  get gBrowser() {
    let recentWin = this.browserWindow;
    if (!recentWin)
      return null;
    return recentWin.gBrowser;
  },

  get sandbox() {
    // need to cache sandboxes if currentBrowser == previousBrowser
    let contentWindow = this.gBrowser.selectedBrowser.contentWindow;
    let sandbox = new Cu.Sandbox(contentWindow,
      { sandboxPrototype: contentWindow, wantXrays: false });
    return sandbox;
  },

  evalInSandbox: function WS_evalInSandbox(aString) {
    return Cu.evalInSandbox(aString, this.sandbox, "1.8", "Workspace", 1);
  },

  execute: function WS_execute(aEvent) {
    let selection = this.selectedText;
    this.evalInSandbox(selection);
    this.deselect();
  },

  inspect: function WS_inspect(aEvent) {
    let selection = this.selectedText;
    let result = this.evalInSandbox(selection);
    if (result)
      this.openPropertyPanel(selection, result, this);
    this.deselect();
  },

  print: function WS_print(aEvent) {
    let selection = this.selectedText;
    let selectionStart = this.textbox.selectionStart;
    let selectionEnd = this.textbox.selectionEnd;
    let result = this.evalInSandbox(selection);
    if (result) {
      let firstPiece = this.textbox.value.slice(0, selectionEnd);
      let lastPiece = this.textbox.value.slice(selectionEnd + 1, this.textbox.value.length);
      this.textbox.value = firstPiece + " " + result.toString() + "\n" + lastPiece;
      this.textbox.selectionStart = selectionEnd + 1;
      this.textbox.selectionEnd = this.textbox.selectionStart + result.length;
    }
    this.deselect();
  },

  openPropertyPanel: function WS_openPropertyPanel(aEvalString, aOutputObject,
                                                  aAnchor)
  {
    let self = this;
    let propPanel;
    // The property panel has two buttons:
    // 1. `Update`: reexecutes the string executed on the command line. The
    //    result will be inspected by this panel.
    // 2. `Close`: destroys the panel.
    let buttons = [];

    // If there is a evalString passed to this function, then add a `Update`
    // button to the panel so that the evalString can be reexecuted to update
    // the content of the panel.
    if (aEvalString !== null) {
      buttons.push({
        label: "Update",
        accesskey: "U",
        oncommand: function () {
          try {
            let result = self.evalInSandbox(aEvalString);

            if (result !== undefined)
              propPanel.treeView.data = result;
          } catch (ex) {
          }
        }
      });
    }

    buttons.push({
      label: "Close",
      accesskey: "C",
      class: "jsPropertyPanelCloseButton",
      oncommand: function () {
        propPanel.destroy();
        aAnchor._panelOpen = false;
      }
    });

    let doc = this.browserWindow.document;
    let parent = doc.getElementById("mainPopupSet");
    let title = "Object";
    propPanel = new PropertyPanel(parent, doc, title, aOutputObject, buttons);

    let panel = propPanel.panel;
    panel.openPopup(aAnchor, "after_pointer", 0, 0, false, false);
    panel.sizeTo(200, 400);
    return propPanel;
  },
}
