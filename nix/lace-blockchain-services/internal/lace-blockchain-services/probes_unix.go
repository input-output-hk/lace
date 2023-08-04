// +build !windows

package main

import (
	"time"
	"errors"
)

func probeWindowsNamedPipe(path string, timeout time.Duration) error {
	return errors.New("probeWindowsNamedPipe is only supported on Windows")
}
