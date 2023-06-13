package ourpaths

import (
	"os"
	"os/user"
	"path/filepath"
	"runtime"
)

var (
	Username string
	WorkDir string
	LibexecDir string
	ResourcesDir string
)

// XXX: the only reason we do this, is that we have to hook setting PATH before clipboard.init() runs
func init() {
	executablePath, err := os.Executable()
	if err != nil {
		panic(err)
	}

	executablePath, err = filepath.EvalSymlinks(executablePath)
	if err != nil {
		panic(err)
	}

	currentUser, err := user.Current()
	if err != nil {
		panic(err)
	}
	Username = currentUser.Username

	binDir := filepath.Dir(executablePath)

	switch runtime.GOOS {
	case "darwin":
		WorkDir = currentUser.HomeDir + "/Library/Application Support/lace-blockchain-services"
		LibexecDir = binDir
		ResourcesDir = filepath.Clean(binDir + "/../Resources")
	case "linux":
		WorkDir = currentUser.HomeDir + "/.local/share/lace-blockchain-services"
		LibexecDir = filepath.Clean(binDir + "/../libexec")
		ResourcesDir = filepath.Clean(binDir + "/../share")
	case "windows":
		WorkDir = os.Getenv("AppData") + "\\lace-blockchain-services"
		LibexecDir = filepath.Clean(binDir + "\\libexec")
		ResourcesDir = binDir
	default:
		panic("cannot happen, unknown OS: " + runtime.GOOS)
	}

	// Prepend our libexec to PATH – e.g. for xclip on Linux, which is not installed on all distributions
	err = os.Setenv("PATH", LibexecDir + string(filepath.ListSeparator) + os.Getenv("PATH"))
	if err != nil {
		panic(err)
	}
}
