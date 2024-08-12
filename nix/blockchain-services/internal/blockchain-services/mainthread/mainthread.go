package mainthread

import (
	"sync"
)

/*
#cgo linux pkg-config: gtk+-3.0

#cgo darwin CFLAGS: -DDARWIN -x objective-c -fobjc-arc
#cgo darwin LDFLAGS: -framework Cocoa -framework Webkit

void lbs__mainthread__schedule();
*/
import "C"

// XXX: we can’t pass Go function pointers to C, so let’s use a synchronized global variable instead

var mu sync.Mutex
var currentFunction *func()

func Schedule(f func()) {
	mu.Lock()
	currentFunction = &f
	C.lbs__mainthread__schedule()
}

func freeCurrentFunction() {
	currentFunction = nil
}

//export lbs__mainthread__call_current_function
func lbs__mainthread__call_current_function() {
	defer mu.Unlock()
	defer freeCurrentFunction()
	(*currentFunction)()
}

