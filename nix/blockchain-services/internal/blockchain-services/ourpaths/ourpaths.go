package ourpaths

import (
	"os"
	"os/user"
	"path/filepath"
	"runtime"
)

const (
	OurLogPrefix = "blockchain-services"
)

var (
	ExecutablePath string
	Username string
	WorkDir string
	LibexecDir string
	ResourcesDir string
	NetworkConfigDir string
	CardanoServicesDir string
	ExeSuffix string
)

// XXX: we do this because:
//   • we have to hook setting PATH before "github.com/atotto/clipboard".init() – otherwise xclip is not found,
//   • and also set XKB_CONFIG_EXTRA_PATH before "github.com/sqweek/dialog".init() – otherwise gtk3 segfaults
func init() {
	var err error

	ExecutablePath, err = os.Executable()
	if err != nil {
		panic(err)
	}

	ExecutablePath, err = filepath.EvalSymlinks(ExecutablePath)
	if err != nil {
		panic(err)
	}

	currentUser, err := user.Current()
	if err != nil {
		panic(err)
	}
	Username = currentUser.Username

	binDir := filepath.Dir(ExecutablePath)

	switch runtime.GOOS {
	case "darwin":
		WorkDir = currentUser.HomeDir + "/Library/Application Support/blockchain-services"
		LibexecDir = binDir
		ResourcesDir = filepath.Clean(binDir + "/../Resources")
	case "linux":
		WorkDir = currentUser.HomeDir + "/.local/share/blockchain-services"
		LibexecDir = filepath.Clean(binDir + "/../../libexec")
		ResourcesDir = filepath.Clean(binDir + "/../../share")
	case "windows":
		WorkDir = os.Getenv("AppData") + "\\blockchain-services"
		LibexecDir = filepath.Clean(binDir + "\\libexec")
		ResourcesDir = binDir
	default:
		panic("cannot happen, unknown OS: " + runtime.GOOS)
	}

	sep := string(filepath.Separator)

	NetworkConfigDir = ResourcesDir + sep + "cardano-node-config"

	CardanoServicesDir = ResourcesDir + sep + "cardano-js-sdk" + sep + "packages" + sep + "cardano-services"

	ExeSuffix = ""
	if runtime.GOOS == "windows" {
		ExeSuffix = ".exe"
	}

	// Prepend our libexec/xclip to PATH – for xclip on Linux, which is not installed on all distributions
	if runtime.GOOS == "linux" {
		err = os.Setenv("PATH", LibexecDir + sep + "xclip" + string(filepath.ListSeparator) + os.Getenv("PATH"))
		if err != nil {
			panic(err)
		}
	}

	// Prevent a gtk3 segfault:
	if runtime.GOOS == "linux" {
		err = os.Setenv("XKB_CONFIG_EXTRA_PATH", ResourcesDir + "/xkb")
		if err != nil {
			panic(err)
		}
	}
}
