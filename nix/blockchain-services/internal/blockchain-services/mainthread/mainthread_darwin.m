#import <Foundation/Foundation.h>

extern void lbs__mainthread__call_current_function();

void lbs__mainthread__schedule() {
    dispatch_async(dispatch_get_main_queue(), ^{
        lbs__mainthread__call_current_function();
    });
}
