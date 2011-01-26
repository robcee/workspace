/*
 * workspace.js
 *
 * Main Workspace logic.
 *
 * All Copyright dedicated to the Public Domain.
 * January 7, 2011
 *
 * Contributors:
 *   Rob Campbell <robcee@mozilla.com>, original author
 *   Erik Vold <erikvvold@gmail.com>
 *   David Dahl <ddahl@mozilla.com>
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/PropertyPanel.jsm");

const WS_CONTEXT_CONTENT = 1;
const WS_CONTEXT_CHROME = 2;
const WS_WINDOW_URL = "chrome://workspace/content/workspace.xul";
const WS_WINDOW_FEATURES = "chrome,titlebar,toolbar,centerscreen,resizable,dialog=no";

Workspace = {
  win: null,
  executionContext: WS_CONTEXT_CONTENT,

  get textbox() document.getElementById("workspace-textbox"),
  get statusbar() document.getElementById("workspace-statusbar"),
  get statusbarStatus() document.getElementById("workspace-status"),

  get selectedText() {
    let text = this.textbox.value;
    let selectionStart = this.textbox.selectionStart;
    let selectionEnd = this.textbox.selectionEnd;
    if (selectionStart != selectionEnd)
      return text.substring(selectionStart, selectionEnd);
    return "";
  },

  get browserWindow() Services.wm.getMostRecentWindow("navigator:browser"),

  get gBrowser() {
    let recentWin = this.browserWindow;
    return (recentWin) ? recentWin.gBrowser : null;
  },

  get sandbox() {
    // need to cache sandboxes if currentBrowser == previousBrowser
    let contentWindow = this.gBrowser.selectedBrowser.contentWindow;
    let sandbox = new Cu.Sandbox(contentWindow,
      { sandboxPrototype: contentWindow, wantXrays: false });
    return sandbox;
  },

  get chromeSandbox() {
    var win = this.browserWindow.QueryInterface(Ci.nsIDOMWindow)
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIWebNavigation)
      .QueryInterface(Ci.nsIDocShellTreeItem)
      .rootTreeItem
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow)
      .QueryInterface(Ci.nsIDOMChromeWindow);

    let sandbox = new Cu.Sandbox(win,
                                 { sandboxPrototype: win, wantXrays: false });

    return sandbox;
  },

  hasSelection: function WS_hasSelection() {
    return !!this.textbox.selectedText;
  },

  hasClipboard: function WS_hasClipboard() {
    return false; //tbd
  },

  updateEditUIVisibility: function WS_updateEditUIVisibility() {
    if (this.hasSelection) {
      document.getElementById("ws-menu-cut").removeAttribute("disabled");
      document.getElementById("ws-menu-copy").removeAttribute("disabled");
    } else {
      document.getElementById("ws-menu-cut").setAttribute("disabled", true);
      document.getElementById("ws-menu-copy").setAttribute("disabled", true);
    }
    document.getElementById("ws-menu-paste").setAttribute("disabled", !this.hasClipboard());
  },

  deselect: function WS_deselect() {
    this.textbox.selectionEnd = this.textbox.selectionStart;
    return this;
  },

  selectRange: function WS_selectRange(aStart, aEnd) {
    this.textbox.selectionStart = aStart;
    this.textbox.selectionEnd = aEnd;
  },

  evalInSandbox: function WS_evalInSandbox(aString) {
    return Cu.evalInSandbox(aString, this.sandbox, "1.8", "Workspace", 1);
  },

  evalInChromeSandbox: function WS_evalInChromeSandbox(aString) {
    return Cu.evalInSandbox(aString, this.chromeSandbox, "1.8", "Workspace", 1);
  },

  evalForContext: function WS_evaluateForContext(aString) {
    if (this.executionContext == WS_CONTEXT_CONTENT)
      return this.evalInSandbox(aString);

    // chrome
    return this.evalInChromeSandbox(aString);
  },

  execute: function WS_execute(aEvent) {
    let selection = this.selectedText || this.textbox.value;
    this.evalForContext(selection);
    this.deselect();
  },

  inspect: function WS_inspect(aEvent) {
    let selection = this.selectedText || this.textbox.value;
    let result = this.evalForContext(selection);

    if (result)
      this.openPropertyPanel(selection, result, this);

    this.deselect();
  },

  print: function WS_print(aEvent) {
    let selection = this.selectedText || this.textbox.value;
    let selectionStart = this.textbox.selectionStart;
    let selectionEnd = this.textbox.selectionEnd;
    if (selectionStart == selectionEnd)
      selectionEnd = this.textbox.value.length;
    let result = this.evalForContext(selection);
    if (!result) return;
    let firstPiece = this.textbox.value.slice(0, selectionEnd);
    let lastPiece = this.textbox.value.slice(selectionEnd + 1, this.textbox.value.length);
    this.textbox.value = firstPiece + "\n " + result.toString() + "\n" + lastPiece;
    this.selectRange(this.textbox.selectionEnd + 2,
      this.textbox.selectionStart + result.length);
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
            let result = self.evalForContext(aEvalString);

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

  // Menu Operations

  openWorkspace: function WS_openWorkspace() {
    Services.ww.openWindow(null, WS_WINDOW_URL, "_blank",
                           WS_WINDOW_FEATURES, null);
  },

  exportToFile: function WS_exportToFile(aFile) {
    if (aFile.exists() && !window.confirm("File exists. Overwrite?"))
      return;

    let fs = Cc["@mozilla.org/network/file-output-stream;1"].
              createInstance(Ci.nsIFileOutputStream);
    let modeFlags = 0x02 | 0x08 | 0x20;
    fs.init(aFile, modeFlags, 0644, 0);
    fs.write(this.textbox.value, this.textbox.value.length);
    fs.close();
  },

  importFromFile: function WS_importFromFile(aFile) {
    let fs = Cc["@mozilla.org/network/file-input-stream;1"].
                createInstance(Ci.nsIFileInputStream);
    fs.init(aFile, -1, -1, 0);
    let sis = Cc["@mozilla.org/scriptableinputstream;1"].
                 createInstance(Ci.nsIScriptableInputStream);
    sis.init(fs);
    this.textbox.value = sis.read(sis.available());
    sis.close();
    fs.close();
  },

  openFile: function WS_openFile() {
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(window, "Open File",
            Ci.nsIFilePicker.modeOpen);
    fp.defaultString = "";
    if (fp.show() != Ci.nsIFilePicker.returnCancel) {
      document.title = this.filename = fp.file.path;
      this.importFromFile(fp.file);
    }
  },

  saveFile: function WS_saveFile() {
    if (!this.filename)
      return this.saveFileAs();
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(this.filename);
    this.exportToFile(file);
  },

  saveFileAs: function WS_saveFileAs() {
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(window, "Save File As",
            Ci.nsIFilePicker.modeSave);
    fp.defaultString = "workspace.js";
    if (fp.show() != Ci.nsIFilePicker.returnCancel) {
      document.title = this.filename = fp.file.path;
      this.exportToFile(fp.file);
    }
  },

  openErrorConsole: function WS_openErrorConsole() {
    this.browserWindow.toJavaScriptConsole();
  },

  setContentContext: function WS_setContentContext() {
    document.getElementById("ws-menu-chrome").removeAttribute("checked");
    document.getElementById("ws-menu-content").setAttribute("checked", true);
    this.statusbarStatus.label = "content";
    this.executionContext = WS_CONTEXT_CONTENT;
  },

  setChromeContext: function WS_setChromeContext() {
    document.getElementById("ws-menu-content").removeAttribute("checked");
    document.getElementById("ws-menu-chrome").setAttribute("checked", true);
    this.statusbarStatus.label = "chrome";
    this.executionContext = WS_CONTEXT_CHROME;
  }
};
