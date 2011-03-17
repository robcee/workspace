# Handy little Makefile

TARGET_FILE=~/workspace.xpi

-include Makefile.conf

all:
	zip -r $(TARGET_FILE) * -x ".git/*" -x ".*" -x "*~" -x "*.bak" -x "*.swp" -x Makefile -x Makefile.conf
