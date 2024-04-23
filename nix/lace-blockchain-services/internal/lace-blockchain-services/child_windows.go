// +build windows

package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"strings"
	"time"

	"lace.io/lace-blockchain-services/ourpaths"
	"github.com/UserExistsError/conpty"
	"github.com/acarl005/stripansi"
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
	sep := string(filepath.Separator)
	path := ourpaths.LibexecDir + sep + "sigbreak" + sep + "sigbreak.exe"
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

// XXX: this is only temporary, until Mithril doesn’t give us reliable machine-readable output
func childProcessPTYWindows(
	path string, argv []string, extraEnv []string,
	logModifier func(string) string, // e.g. to drop redundant timestamps
	outputLines chan<- string, terminate <-chan struct{}, pid *int,
	terminateGracefullyByInheritedFd3 bool,
	gracefulExitTimeout time.Duration,
) {
	defer close(outputLines)

	if terminateGracefullyByInheritedFd3 {
		outputLines <- "fatal: terminateGracefullyByInheritedFd3 not compatible with PTY (yet?)"
		return
	}

	cmdLine := syscall.EscapeArg(path)
	for _, arg := range argv {
		cmdLine += " "
		cmdLine += syscall.EscapeArg(arg)
	}

	cptyEnv := conpty.ConPtyEnv(nil)
	if len(extraEnv) > 0 {
		envBlock, err := syscall.CreateEnvBlock(append(os.Environ(), extraEnv...))
		if err != nil {
			outputLines <- fmt.Sprintf("fatal: exec.CreateEnvBlock: %v", err)
			return
		}
		cptyEnv = conpty.ConPtyEnv(envBlock)
	}

	cpty, err := conpty.Start(cmdLine, cptyEnv)
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %v", err)
		return
	}

	process, err :=	os.FindProcess(int(cpty.GetPid()))
	if err != nil {
		// can’t happen
		outputLines <- fmt.Sprintf("fatal: os.FindProcess: %v", err)
		return
	}

	//defer cpty.Close()
	//defer cpty.Wait(context.Background())

	// XXX: cpty handles aren’t closed (they’re pipes) automatically when the command exits, so let’s do this:
	go func(){
		_, err := cpty.Wait(context.Background())
		if err != nil {
			outputLines <- fmt.Sprintf("fatal: error during cpty.Wait(): %v", err)
		}
		cpty.Close()
	}()

	waitDone := make(chan struct{})

	if (pid != nil) {
		*pid = process.Pid
	}

	go func() {
		defer func(){
			waitDone <- struct{}{}
		}()
		buf := make([]byte, 1024)
		for {
			num, err := cpty.Read(buf)
			if err != nil { return }

			lines := string(buf[:num])
			lines = stripansi.Strip(lines)
			lines =	strings.ReplaceAll(lines, string(rune(0x07)), "")  // remove bells

			// XXX: it’s possible that 2+ TTY updates will be clumped together in a single ‘read’, so:
			for _, line := range strings.FieldsFunc(lines, func(c rune) bool {
				return (c == '\n' || c == '\r' || c == rune(0x08))  // 0x08 for Windows
			}) {
				if len(line) > 0 {
					line = logModifier(line)
					if len(line) > 0 {
						outputLines <- line
					}
				}
			}
		}
	}()

	gracefulExitOverride := func() {
		// Ctrl-C according to <https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/>
		fmt.Printf("%s[%d]: writing Ctrl-C (0x03) to %s[%d]\n",
			OurLogPrefix, os.Getpid(), filepath.Base(path), process.Pid)
		cpty.Write([]byte{0x03})
	}

	__internal__terminateGracefully(terminate, waitDone, gracefulExitTimeout, nil, path, process, gracefulExitOverride)
}
