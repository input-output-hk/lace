package ui

import (
	"github.com/sqweek/dialog"
)

func HandleAppReopened() {
	BringAppToForeground()
	dialog.Message("Another instance of ‘%s’ is already running.\n\nCheck in the system tray area.",
		OurLogPrefix).Title("Already running!").Error()
}
