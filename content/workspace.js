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
 *   Mihai Sucan <mihai.sucan@gmail.com>
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/PropertyPanel.jsm");
Cu.import("resource://gre/modules/HUDService.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "clipboardHelper",
                                   "@mozilla.org/widget/clipboardhelper;1",
                                   "nsIClipboardHelper");

const WORKSPACE_CONTEXT_CONTENT = 1;
const WORKSPACE_CONTEXT_CHROME = 2;
const WORKSPACE_WINDOW_URL = "chrome://workspace/content/workspace.xul";
const WORKSPACE_WINDOW_FEATURES = "chrome,titlebar,toolbar,centerscreen,resizable,dialog=no";

Workspace = {
  win: null,
  executionContext: WORKSPACE_CONTEXT_CONTENT,

  get textboxContainer() document.getElementById("workspace-source-container"),
  get textbox() document.getElementById("workspace-source-input"),
  get statusbar() document.getElementById("workspace-statusbar"),
  get statusbarStatus() document.getElementById("workspace-status"),

  getSelectedText: function WS_getSelectedText() {
    return this.editor.getCopyText();
  },

  getTextboxValue: function WS_getTextboxValue() {
    return this.editor.getSession().getValue();
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
    var win = HUDService.getChromeWindowFromContentWindow(this.browserWindow);

    let sandbox = new Cu.Sandbox(win,
                                 { sandboxPrototype: win, wantXrays: false });

    return sandbox;
  },

  undo: function WS_undo() {
    return this.editor.undo();
  },

  redo: function WS_redo() {
    return this.editor.redo();
  },

  copySelection: function WS_copySelection() {
    let text = this.getSelectedText();
    if (text) {
      clipboardHelper.copyString(text);
    }
  },

  cutSelection: function WS_cutSelection() {
    let text = this.getSelectedText();
    if (text) {
      clipboardHelper.copyString(text);
      this.editor.onCut();
    }
  },

  pasteSelection: function WS_pasteSelection() {
    let text = this.getClipboardContent();
    if (text) {
      this.editor.insert(text);
    }
  },

  hasSelection: function WS_hasSelection() {
    return !this.editor.getSelectionRange().isEmpty();
  },

  getClipboardContent: function WS_getClipboardContent() {
    let clip = Cc["@mozilla.org/widget/clipboard;1"].getService(Ci.nsIClipboard);
    if (!clip)
      return "";

    let trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
    if (!trans)
      return "";

    trans.addDataFlavor("text/unicode");

    clip.getData(trans, clip.kGlobalClipboard);

    let str = new Object();
    let strLength = new Object();

    trans.getTransferData("text/unicode", str, strLength);

    let result = "";
    if (str && str.value && strLength.value) {
      str = str.value.QueryInterface(Ci.nsISupportsString);
      result = str.data.substring(0, strLength.value / 2);
    }

    return result;
  },

  updateEditUIVisibility: function WS_updateEditUIVisibility() {
    let cmdUndo = document.getElementById("ws-cmd-undo");
    let cmdRedo = document.getElementById("ws-cmd-redo");
    let cmdCut = document.getElementById("ws-cmd-cutSelection");
    let cmdCopy = document.getElementById("ws-cmd-copySelection");
    let cmdPaste = document.getElementById("ws-cmd-pasteSelection");

    if (this.hasSelection()) {
      cmdCut.removeAttribute("disabled");
      cmdCopy.removeAttribute("disabled");
    } else {
      cmdCut.setAttribute("disabled", "true");
      cmdCopy.setAttribute("disabled", "true");
    }

    if (this.getClipboardContent()) {
      cmdPaste.removeAttribute("disabled");
    } else {
      cmdPaste.setAttribute("disabled", "true");
    }

    let undoManager = this.editor.getSession().getUndoManager();
    if (undoManager.hasUndo()) {
      cmdUndo.removeAttribute("disabled");
    } else {
      cmdUndo.setAttribute("disabled", "true");
    }

    if (undoManager.hasRedo()) {
      cmdRedo.removeAttribute("disabled");
    } else {
      cmdRedo.setAttribute("disabled", "true");
    }
  },

  deselect: function WS_deselect() {
    this.editor.clearSelection();
    return this;
  },

  selectAll: function WS_selectAll() {
    this.editor.selectAll();
    return this;
  },

  evalInSandbox: function WS_evalInSandbox(aString) {
    return Cu.evalInSandbox(aString, this.sandbox, "1.8", "Workspace", 1);
  },

  evalInChromeSandbox: function WS_evalInChromeSandbox(aString) {
    return Cu.evalInSandbox(aString, this.chromeSandbox, "1.8", "Workspace", 1);
  },

  evalForContext: function WS_evaluateForContext(aString) {
    if (this.executionContext == WORKSPACE_CONTEXT_CONTENT)
      return this.evalInSandbox(aString);

    // chrome
    return this.evalInChromeSandbox(aString);
  },

  execute: function WS_execute(aEvent) {
    let selection = this.getSelectedText() || this.getTextboxValue();
    this.evalForContext(selection);
    this.deselect();
  },

  inspect: function WS_inspect(aEvent) {
    let selection = this.getSelectedText() || this.getTextboxValue();
    let result = this.evalForContext(selection);

    if (result)
      this.openPropertyPanel(selection, result, this);

    this.deselect();
  },

  print: function WS_print(aEvent) {
    let selection = this.getSelectedText() || this.getTextboxValue();
    let result = this.evalForContext(selection);
    if (!result) return;

    this.editor.insert(result.toString());
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

    let doc = this.browserWindow.document;
    let parent = doc.getElementById("mainPopupSet");
    let title = aOutputObject.toString();
    propPanel = new PropertyPanel(parent, doc, title, aOutputObject, buttons);

    let panel = propPanel.panel;
    panel.openPopup(aAnchor, "after_pointer", 0, 0, false, false);
    panel.sizeTo(200, 400);

    return propPanel;
  },

  // Menu Operations

  openWorkspace: function WS_openWorkspace() {
    Services.ww.openWindow(null, WORKSPACE_WINDOW_URL, "_blank",
                           WORKSPACE_WINDOW_FEATURES, null);
  },

  exportToFile: function WS_exportToFile(aFile) {
    if (aFile.exists() && !window.confirm("File exists. Overwrite?"))
      return;

    let fs = Cc["@mozilla.org/network/file-output-stream;1"].
              createInstance(Ci.nsIFileOutputStream);
    let modeFlags = 0x02 | 0x08 | 0x20;
    fs.init(aFile, modeFlags, 0644, 0);

    let text = this.getTextboxValue();
    fs.write(text, text.length);

    fs.close();
  },

  importFromFile: function WS_importFromFile(aFile) {
    let fs = Cc["@mozilla.org/network/file-input-stream;1"].
                createInstance(Ci.nsIFileInputStream);
    fs.init(aFile, -1, -1, 0);
    let sis = Cc["@mozilla.org/scriptableinputstream;1"].
                 createInstance(Ci.nsIScriptableInputStream);
    sis.init(fs);

    this.editor.getSession().setValue(sis.read(sis.available()));

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
    this.executionContext = WORKSPACE_CONTEXT_CONTENT;
  },

  setChromeContext: function WS_setChromeContext() {
    document.getElementById("ws-menu-content").removeAttribute("checked");
    document.getElementById("ws-menu-chrome").setAttribute("checked", true);
    this.statusbarStatus.label = "chrome";
    this.executionContext = WORKSPACE_CONTEXT_CHROME;
  },

  onLoad: function WS_onLoad() {
    window.removeEventListener("load", this.onLoad, false);
    this.editor = ace.edit(this.textbox);

    this.editor.renderer.setHScrollBarAlwaysVisible(false);

    let JavaScriptMode = require("ace/mode/javascript").Mode;

    let session = this.editor.getSession();

    session.setMode(new JavaScriptMode());
    session.setUseWrapMode(true);
    session.setWrapLimitRange(null, null);
    this.editor.renderer.setPrintMarginColumn(80);

    // Override the default editor context menu implementation.
    this.editor.onContextMenu = this.editor.onContextMenuClose =
      function() { };

    window.addEventListener("resize", this.onResize, false);
    this.onResize();
  },

  onResize: function WS_onResize() {
    this.textbox.style.width = 0;
    this.textbox.style.height = 0;

    this.textbox.style.width = this.textboxContainer.clientWidth + "px";
    this.textbox.style.height = this.textboxContainer.clientHeight + "px";
    this.editor.resize();
  },

  init: function WS_init() {
    this.onLoad = this.onLoad.bind(this);
    this.onResize = this.onResize.bind(this);

    window.addEventListener("load", this.onLoad, false);
  },
};

Workspace.init();


