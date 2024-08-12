package ui

/*
#cgo darwin CFLAGS: -DDARWIN -x objective-c -fobjc-arc
#cgo darwin LDFLAGS: -framework Cocoa -framework Webkit

void lbs__ui__bring_app_to_foreground();
*/
import "C"

// On Darwin, we have to activate our app (bring it to foreground),
// so that our dialog boxes are shown on top.
func BringAppToForeground() {
	C.lbs__ui__bring_app_to_foreground()
}
