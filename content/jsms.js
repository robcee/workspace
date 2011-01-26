/*
 * JSM loader
 *
 *
 * All Copyright dedicated to the Public Domain.
 * January 21, 2011
 *
 * Contributors:
 *   David Dahl <ddahl@mozilla.com>, original author
 *
 */

const GRE_PREFIX = "resource://gre/modules/";
const MODULES_PREFIX = "resource:///modules/";

let jsms = [ 'NetUtil.jsm',
             'import_module.jsm',
             'XPCOMUtils.jsm',
             'ISO8601DateUtils.jsm',
             'PluralForm.jsm',
             'PlacesDBUtils.jsm',
             'PlacesUtils.jsm',
             'ctypes.jsm',
             'NetworkHelper.jsm',
             'HUDService.jsm',
             'PropertyPanel.jsm',
             'PerfMeasurement.jsm',
             'CommonDialog.jsm',
             'nsFormAutoCompleteResult.jsm',
             'DownloadPaths.jsm',
             'DownloadTaskbarProgress.jsm',
             'DownloadUtils.jsm',
             'DownloadLastDir.jsm',
             'PluginProvider.jsm',
             'AddonLogging.jsm',
             'XPIProvider.jsm',
             'AddonManager.jsm',
             'AddonUpdateChecker.jsm',
             'AddonRepository.jsm',
             'LightweightThemeManager.jsm',
             'CertUtils.jsm',
             'FileUtils.jsm',
             'Geometry.jsm',
             'WindowDraggingUtils.jsm',
             'Services.jsm',
             'LightweightThemeConsumer.jsm',
             'InlineSpellChecker.jsm',
             'PopupNotifications.jsm',
             'CrashSubmit.jsm',
             'instrument.jsm',
             'PlacesUIUtils.jsm',
             'WindowsJumpLists.jsm',
             'WindowsPreviewPerTab.jsm',
             'NetworkPrioritizer.jsm',
             'stylePanel.jsm',
             'domplate.jsm',
             'openLocationLastURL.jsm',
             'utils.jsm',
             'AllTabs.jsm',
             'CSPUtils.jsm',];

function loadJSM(aJSM) {
  if (Workspace.executionContext != WS_CONTEXT_CHROME) {
    return;
  }
  let log = function _log(aMsg) {
    // TODO: thios should be global somehow
    Services.console.logStringMessage(aMsg);
  };

  let scope = {};
  let uri;
  try {
    // try loading the module from gre path first:
    uri = GRE_PREFIX + aJSM;
    Cu.import(uri ,scope);
    return scope;
  }
  catch (ex) {
    // perhaps the jsm is in the modules path instead?
    log(ex);
  }

  try {
   uri = MODULES_PREFIX + aJSM;
    Cu.import(uri ,scope);
    return scope;
  }
  catch (ex) {
    // perhaps the jsm is in the modules path instead?
    log(ex);
  }
  return null;
}
