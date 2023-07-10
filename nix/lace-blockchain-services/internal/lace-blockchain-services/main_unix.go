// +build !windows

package main

import (
	"time"
	"errors"
)

func probeWindowsNamedPipe(path string, timeout time.Duration) error {
	return errors.New("probeWindowsNamedPipe is only supported on Windows")
}

func makeSysProcAttr() *SysProcAttr {
	return nil
}

func windowsSendCtrlBreak(pid int) {
	panic("windowsSendCtrlBreak is only supported on Windows")
}
