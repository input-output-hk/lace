// +build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"

	"lace.io/lace-blockchain-services/ourpaths"

	"gopkg.in/natefinch/npipe.v2"
)

func probeWindowsNamedPipe(path string, timeout time.Duration) error {
	conn, err := npipe.DialTimeout(path, timeout)
	if err == nil {
		defer conn.Close()
	}

	return err
}

// XXX: Reading:
//   · https://learn.microsoft.com/en-us/windows/console/generateconsolectrlevent
//   · https://learn.microsoft.com/en-us/windows/console/ctrl-c-and-ctrl-break-signals
//   · https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags
//   · https://learn.microsoft.com/en-us/windows/console/creation-of-a-console
//   · https://learn.microsoft.com/en-us/windows/console/setconsolectrlhandler
//   · https://learn.microsoft.com/en-us/windows/console/registering-a-control-handler-function
//   · https://github.com/ElyDotDev/windows-kill
//   · https://github.com/walware/statet/blob/master/de.walware.statet.r.console.core/cppSendSignal/sendsignal.cpp
//   · https://github.com/vim/vim/blob/master/src/os_win32.c
//   · https://github.com/input-output-hk/cardano-node/issues/726#issuecomment-609470524
//   · https://github.com/input-output-hk/cardano-launcher/blob/master/docs/windows-clean-shutdown.md

func makeSysProcAttr() *syscall.SysProcAttr {
	// XXX: we have to create it in a new process group, because Ctrl-Break "signals"
	// are sent to the whole process group on Windows, and we don’t want to kill ourselves.
	// Ctrl+C will be ignored by processes in the new process groups
	//
	// HideWindow is not CREATE_NO_WINDOW (that won’t work with "signals"),
	// but STARTF_USESHOWWINDOW, and ShowWindow = SW_HIDE
	return &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
		HideWindow: true,
	}
}

// XXX: we can’t make these WinAPI calls from the current process, as they change to much regarding
// consoles attached to processes. Let’s offload them to a small C program:
func windowsSendCtrlBreak(pid int) {
	path := ourpaths.LibexecDir + string(filepath.Separator) + "sigbreak.exe"
	var cmd *exec.Cmd
	cmd = exec.Command(path, fmt.Sprintf("%d", pid))
	cmd.SysProcAttr =  &syscall.SysProcAttr{
		// XXX: if we don’t create a new console for sigbreak.exe, the signal not always lands
		CreationFlags: 0x00000010, // CREATE_NEW_CONSOLE not defined in syscall.*
		HideWindow: true,
	}
	err := cmd.Run()
	if err != nil {
		fmt.Printf("%s[%d]: error: failed to run '%s': %v\n",
			OurLogPrefix, os.Getpid(), filepath.Base(path), err)
	}
}
