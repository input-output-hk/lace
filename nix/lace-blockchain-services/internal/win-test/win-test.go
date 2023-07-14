package main

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"
	"syscall"
	"unsafe"
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

func _get_osfhandle(fd uintptr) (uintptr, error) {
	// Windows SDK → Include/10.0.19041.0/um/handleapi.h contains:
	// #define INVALID_HANDLE_VALUE ((HANDLE)(LONG_PTR)-1)
	// ^ means maximum value, so the same bits as casting a -1 to uint
	var INVALID_HANDLE_VALUE = ^uintptr(0)

	dll, err := syscall.LoadDLL("msvcrt.dll")
	if err != nil {
		return INVALID_HANDLE_VALUE, err
	}
	proc, err := dll.FindProc("_get_osfhandle")
	if err != nil {
		return INVALID_HANDLE_VALUE, err
	}
	rv, _, err := proc.Call(fd)
	if rv == INVALID_HANDLE_VALUE {
		return INVALID_HANDLE_VALUE, err
	}
	return rv, nil
}

// XXX: there is an undocumented API on Windows that enables you to pass something similar
// to standard POSIX file descriptors, by providing a mapping between true Windows file
// `Handle`s and those small fd numbers. The child can then use `_get_osfhandle` to turn 0
// back to a Handle for stdin, 1 to stdout etc., including additional inherited Handles
// See <https://learn.microsoft.com/en-us/cpp/c-runtime-library/reference/get-osfhandle>
// See <https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/ns-processthreadsapi-startupinfoa>
// The official documentation lies that	`cbReserved2` must be zero, and `lpReserved2` must be NULL.
//
// Reference implementation: <https://github.com/libuv/libuv/blob/d09441ca03e399fe641da88624c8ea0476967187/src/win/process-stdio.c#L169-L171>
func mkStartupInfoLpReserved2(handlesToMap []syscall.Handle) []byte {
	// <https://github.com/libuv/libuv/blob/d09441ca03e399fe641da88624c8ea0476967187/src/win/process-stdio.c#L32-L41>
	// #define CHILD_STDIO_SIZE(count)                     \
	//     (sizeof(int) +                                  \
	//      sizeof(unsigned char) * (count) +              \
	//      sizeof(uintptr_t) * (count))
	bufSize := unsafe.Sizeof(int32(0)) +
		uintptr(len(handlesToMap)) * unsafe.Sizeof(uint8(0)) +
		uintptr(len(handlesToMap)) * unsafe.Sizeof(uintptr(0))
	buf := make([]byte, bufSize)

	if len(handlesToMap) > 255 {
		panic("we cannnot map more than 255 handles in lpReserved2")
	}

	binary.LittleEndian.PutUint32(buf, uint32(len(handlesToMap)))

	FOPEN      := uint8(0x01)
	FEOFLAG    := uint8(0x02)
	FCRLF      := uint8(0x04)
	FPIPE      := uint8(0x08)
	FNOINHERIT := uint8(0x10)
	FAPPEND    := uint8(0x20)
	FDEV       := uint8(0x40)
	FTEXT      := uint8(0x80)

	// Silence "declared and not used"
	_ = []byte{FOPEN, FEOFLAG, FCRLF, FPIPE, FNOINHERIT, FAPPEND, FDEV, FTEXT}

	setFlags := func(idx int, value uint8) {
		// #define CHILD_STDIO_CRT_FLAGS(buffer, fd)           \
		//     *((unsigned char*) (buffer) + sizeof(int) + fd)
		position := unsafe.Sizeof(int32(0)) + uintptr(idx)
		buf[position] = value
	}

	setHandle := func(idx int, value syscall.Handle) {
		// #define CHILD_STDIO_HANDLE(buffer, fd)              \
		//     *((HANDLE*) ((unsigned char*) (buffer) +        \
		//                  sizeof(int) +                      \
		//                  sizeof(unsigned char) *            \
		//                  CHILD_STDIO_COUNT((buffer)) +      \
		//                  sizeof(HANDLE) * (fd)))
		position := unsafe.Sizeof(int32(0)) +
			uintptr(len(handlesToMap)) * unsafe.Sizeof(uint8(0)) +
			uintptr(idx) * unsafe.Sizeof(uintptr(0))
		binary.LittleEndian.PutUint64(buf[position:], uint64(uintptr(value)))
	}

	for idx, handle := range handlesToMap {
		// XXX: if we passed something else than an os.Pipe() end, the flags would likely have to change!
		setFlags(idx, FOPEN | FPIPE)
		setHandle(idx, handle)
	}

	return buf
}
