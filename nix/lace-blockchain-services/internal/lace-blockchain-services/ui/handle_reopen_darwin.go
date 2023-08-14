package ui

import "C"

//export lbs__ui__handle_app_reopen
func lbs__ui__handle_app_reopen(flag int8) int8 {
	HandleAppReopened()
	return 0  // i.e. Objective-C ‘NO’ (false) – prevent default processing of this event
}
