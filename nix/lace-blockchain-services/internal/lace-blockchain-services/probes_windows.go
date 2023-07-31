// +build windows

package main

import (
	"time"

	"gopkg.in/natefinch/npipe.v2"
)

func probeWindowsNamedPipe(path string, timeout time.Duration) error {
	conn, err := npipe.DialTimeout(path, timeout)
	if err == nil {
		defer conn.Close()
	}

	return err
}
