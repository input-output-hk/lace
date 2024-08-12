#import <Cocoa/Cocoa.h>

void lbs__ui__bring_app_to_foreground() {
  [[NSApplication sharedApplication] setActivationPolicy:NSApplicationActivationPolicyAccessory];
  [NSApp activateIgnoringOtherApps:YES];
}
