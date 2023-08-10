// +build !windows

package main

import (
	"os"
	"os/exec"
	"time"
)

func setManagedChildSysProcAttr(cmd *exec.Cmd) {
}

func windowsSendCtrlBreak(pid int) {
	panic("windowsSendCtrlBreak is only supported on Windows")
}

func inheritExtraFiles(cmd *exec.Cmd, extraFiles []*os.File) {
	cmd.ExtraFiles = extraFiles
}

func childProcessPTYWindows(
	path string, argv []string, extraEnv []string,
	logModifier func(string) string, // e.g. to drop redundant timestamps
	outputLines chan<- string, terminate <-chan struct{}, pid *int,
	terminateGracefullyByInheritedFd3 bool,
	gracefulExitTimeout time.Duration,
) {
	panic("childProcessPTYWindows is only supported on Windows")
}
