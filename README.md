# Workspace #

## Description ##

A **Workspace** is a simple editor for entering and executing Javascript on a content window. Enter some text, select what you want to run and pick Execute from the context menu to evaluate it against the currently-active tab in a browser window.

## Installation ##

For an installable version, please visit the [Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/workspace/ "Workspace on AMO")

## Build Instructions ##

zip -r ../workspace.xpi * -x ".git/*"

## License ##

All Copyright dedicated to the Public Domain.

## Changelog ##

**0.5.3** [2011-02-16] Removed close button on PropertyPanel, incorporated erikvold-issue-20.

**0.5.1** [2011-02-03] changed WS_ to WORKSPACE_ per AMO review request.

**0.5** [2011-01-26] chrome sandbox, edit menus operational.

**0.4.4** [2011-01-23] added shortcut key to error console.

**0.4.3** [2011-01-23] replaced statusbar text with chrome/content status.

**0.4.2** - [2011-01-23] bug fix for issue 11.

**0.4.1** - [2011-01-23] Added Tools menu and Error Console access. (erikvold-issue-9)

**0.4** - [2011-01-13] Added File functions.

**0.3.1** - [2011-01-12] Revved maxVersion in install.rdf

**0.3** - [2011-01-09] Chrome and Content context menu options working.

**0.2** - [2011-01-08] Menus roughed in, execution of whole window or selection. Some cleanup.

**0.1** - [2011-01-05] initial prototype, basic execution

## Todo ##

Lots. This is a prototype.

* Persist on restart
* Import from pastebin, github, etc.
* Better styling, ACE?
* Much more!