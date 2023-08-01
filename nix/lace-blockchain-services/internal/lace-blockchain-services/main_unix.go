// +build !windows

package main

import (
	"os"
	"os/exec"
)

func setManagedChildSysProcAttr(cmd *exec.Cmd) {
}

func windowsSendCtrlBreak(pid int) {
	panic("windowsSendCtrlBreak is only supported on Windows")
}

func inheritExtraFiles(cmd *exec.Cmd, extraFiles []*os.File) {
	cmd.ExtraFiles = extraFiles
}
