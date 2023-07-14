// +build !windows

package main

import (
	"os"
	"os/exec"
	"time"
	"errors"
)

func probeWindowsNamedPipe(path string, timeout time.Duration) error {
	return errors.New("probeWindowsNamedPipe is only supported on Windows")
}

func setManagedChildSysProcAttr(cmd *exec.Cmd) {
}

func windowsSendCtrlBreak(pid int) {
	panic("windowsSendCtrlBreak is only supported on Windows")
}

func inheritExtraFiles(cmd *exec.Cmd, extraFiles []*os.File) {
	cmd.ExtraFiles = extraFiles
}
