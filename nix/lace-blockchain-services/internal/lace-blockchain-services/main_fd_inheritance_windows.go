// +build windows

package main

import (
	"encoding/binary"
	"syscall"
	"unsafe"
)

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

	if len(handlesToMap) < 3 {
		panic("in lpReserved2, you have to pass at least stdin, stdout, and stderr (in this order)")
	}

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
		if idx <= 2 {
			setFlags(idx, FOPEN | FDEV)
		} else {
			setFlags(idx, FOPEN | FPIPE)
		}
		setHandle(idx, handle)
	}

	return buf
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
