# Handy little Makefile

all:
	zip -r ~/Public/fx-extensions/workspace.xpi * -x ".git/*" -x ".*" -x "*~" -x "*.bak" -x "*.swp"
