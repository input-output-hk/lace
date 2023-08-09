// +build windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"

	"lace.io/lace-blockchain-services/ourpaths"
)

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
//   · https://github.com/input-output-hk/cardano-node/issues/726
//   · https://github.com/input-output-hk/cardano-launcher/blob/master/docs/windows-clean-shutdown.md

func setManagedChildSysProcAttr(cmd *exec.Cmd) {
	// XXX: we have to create it in a new process group, because Ctrl-Break "signals"
	// are sent to the whole process group on Windows, and we don’t want to kill ourselves.
	// Ctrl+C will be ignored by processes in the new process groups
	//
	// HideWindow is not CREATE_NO_WINDOW (that won’t work with "signals"),
	// but STARTF_USESHOWWINDOW, and ShowWindow = SW_HIDE
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.CreationFlags = syscall.CREATE_NEW_PROCESS_GROUP
	cmd.SysProcAttr.HideWindow = true
}

// XXX: we can’t make these WinAPI calls from the current process, as they change to much regarding
// consoles attached to processes. Let’s offload them to a small C program:
func windowsSendCtrlBreak(pid int) {
	path := ourpaths.LibexecDir + string(filepath.Separator) + "sigbreak.exe"
	var cmd *exec.Cmd
	cmd = exec.Command(path, "break", fmt.Sprintf("%d", pid))
	cmd.SysProcAttr = &syscall.SysProcAttr{
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

func inheritExtraFiles(cmd *exec.Cmd, extraFiles []*os.File) {
	handles := []syscall.Handle{}
	for _, file := range extraFiles {
		handles = append(handles, syscall.Handle(file.Fd()))
	}
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.NoInheritHandles = false
	cmd.SysProcAttr.AdditionalInheritedHandles = handles

	// This is needed so that the child can see our extra handles under stable fd=3,4,5… (`_get_osfhandle(3)`).
	// See documentation for `mkStartupInfoLpReserved2` for more details.
	handleMapping := []syscall.Handle{}
	appendFD := func(stream interface{}) {
		if file, ok := stream.(*os.File); ok {
			handleMapping = append(handleMapping, syscall.Handle(file.Fd()))
		} else {
			handleMapping = append(handleMapping, syscall.InvalidHandle)
		}
	}
	appendFD(cmd.Stdin)
	appendFD(cmd.Stdout)
	appendFD(cmd.Stderr)
	for _, file := range extraFiles {
		appendFD(file)
	}

	lpReserved2 := mkStartupInfoLpReserved2(handleMapping)

	cmd.SysProcAttr.StartupInfoCbReserved2 = uint16(len(lpReserved2))
	cmd.SysProcAttr.StartupInfoLpReserved2 = &lpReserved2[0]
}
