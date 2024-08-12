package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"syscall"
)

const (
	ChildEnvVar = "TEST_IS_CHILD"
)

func main() {
	if os.Getenv(ChildEnvVar) != "" {
		child()
	} else {
		parent()
	}
}

func parent() {
	fmt.Printf("parent: called\n")

	executablePath, err := os.Executable()
	if err != nil {
		panic(err)
	}

	sharedReader, sharedWriter, err := os.Pipe()
	if err != nil {
		panic(err)
	}
	inheritedPipe := sharedReader

	sInheritedHandle := strconv.FormatUint(uint64(inheritedPipe.Fd()), 10)

	var cmd *exec.Cmd
	cmd = exec.Command(executablePath, sInheritedHandle)
	cmd.Env = append(os.Environ(), ChildEnvVar + "=true")

	childStdout, err := cmd.StdoutPipe()
	if err != nil {	panic(err) }
	go func() {
		scanner := bufio.NewScanner(childStdout)
		for scanner.Scan() {
			fmt.Fprintf(os.Stdout, "%s\n", scanner.Text())
		}
	}()

	childStderr, err := cmd.StderrPipe()
	if err != nil {	panic(err) }
	go func() {
		scanner := bufio.NewScanner(childStderr)
		for scanner.Scan() {
			fmt.Fprintf(os.Stderr, "%s\n", scanner.Text())
		}
	}()

	handlesToMap := []syscall.Handle{
		syscall.InvalidHandle, // syscall.Handle(cmd.Stdin.(*os.File).Fd()),
		syscall.Handle(cmd.Stdout.(*os.File).Fd()),
		syscall.Handle(cmd.Stderr.(*os.File).Fd()),
		syscall.Handle(inheritedPipe.Fd()),
	}

	lpReserved2 := mkStartupInfoLpReserved2(handlesToMap)

	fmt.Printf("parent: lpReserved2 = %v\n", lpReserved2)

	cmd.SysProcAttr = &syscall.SysProcAttr{
		NoInheritHandles: false,
		AdditionalInheritedHandles: []syscall.Handle{
			syscall.Handle(inheritedPipe.Fd()),
		},
		StartupInfoCbReserved2: uint16(len(lpReserved2)),
		StartupInfoLpReserved2: &lpReserved2[0],
	}

	fmt.Printf("parent: going to start child with inherited Handle=%s\n", sInheritedHandle)

	err = cmd.Start()
	inheritedPipe.Close()
	if err != nil { panic(err) }

	fmt.Printf("parent: writing to child...\n")
	fmt.Fprintf(sharedWriter, "hello, world\n")
	sharedWriter.Close()

	cmd.Wait()

	fmt.Printf("parent: exiting\n")
}

func child() {
	fmt.Printf("child: called\n")

	for fd := 0; fd <= 10; fd++ {
		rv, err := _get_osfhandle(uintptr(fd))
		fmt.Printf("child: _get_osfhandle(%v) = %v (err: %v)\n", fd, rv, err)
	}

	// sInheritedHandle := os.Args[1]
	// inheritedHandle, err := strconv.ParseUint(sInheritedHandle, 10, 64)
	inheritedHandle, err := _get_osfhandle(3)
	if err != nil { panic(err) }
	fmt.Printf("child: got inherited fd=%d\n", inheritedHandle)

	inheritedPipe := os.NewFile(uintptr(inheritedHandle), "")
	defer inheritedPipe.Close()

	fmt.Printf("child: reading from pipe\n")
	msg, err := io.ReadAll(inheritedPipe)

	fmt.Printf("child: read: \"%s\"\n", string(msg))

	fmt.Printf("child: exiting\n")
}
