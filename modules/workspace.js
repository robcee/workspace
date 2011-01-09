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
 *   Erik Vold
 */

var EXPORTED_SYMBOLS = ["Workspace"];

const Cu = Components.utils;
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/PropertyPanel.jsm");

const WS_CONTEXT_CONTENT = 1;
const WS_CONTEXT_CHROME = 2;

function Workspace(win) {
  this._win = win;
  this.$ = function(id) win.document.getElementById(id);
  return this;
}

Workspace.prototype = {
  WS_CONTEXT_CONTENT: WS_CONTEXT_CONTENT,
  WS_CONTEXT_CHROME: WS_CONTEXT_CHROME,

  _win: null,
  executionContext: WS_CONTEXT_CONTENT,

  get textbox() this.$("workspace-textbox"),

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

  hasSelection: function WS_hasSelection() {
    return !!this.textbox.selectedText;
  },

  hasClipboard: function WS_hasClipboard() {
    return false; //tbd
  },

  updateEditUIVisibility: function WS_updateEditUIVisibility() {
    if (this.hasSelection) {
      this.$("ws-menu-cut").removeAttribute("disabled");
      this.$("ws-menu-copy").removeAttribute("disabled");
    } else {
      this.$("ws-menu-cut").setAttribute("disabled", true);
      this.$("ws-menu-copy").setAttribute("disabled", true);
    }
    this.$("ws-menu-paste").setAttribute("disabled", !this.hasClipboard());
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

  evalForContext: function WS_evaluateForContext(aString) {
    if (this.executionContext == WS_CONTEXT_CONTENT)
      return this.evalInSandbox(aString);

    // chrome
    return eval(aString);
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

  setContentContext: function WS_setContentContext() {
    this.$("ws-menu-chrome").removeAttribute("checked");
    this.$("ws-menu-content").setAttribute("checked", true);
    this.executionContext = WS_CONTEXT_CONTENT;
  },

  setChromeContext: function WS_setChromeContext() {
    this.$("ws-menu-content").removeAttribute("checked");
    this.$("ws-menu-chrome").setAttribute("checked", true);
    this.executionContext = WS_CONTEXT_CHROME;
  }
}
