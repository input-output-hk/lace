#include <stdlib.h>

// XXX: our main event loop is in
// <https://github.com/getlantern/systray/blob/d57f43fe06ae79bce7ad747fe2d338e77839e9b5/systray_windows.go#L248>,
// and we patch it to call `lbs__mainthread__call_current_function()`
// once it gets `WM_USER+2`
//
// I’m sorry it’s so awkward, but it’s Windows
//
// See also ‘../../getlantern-systray--windows-schedule-on-main-thread.patch’

extern void lbs__mainthread__windows_post_message();

void lbs__mainthread__schedule() {
  lbs__mainthread__windows_post_message();
}
