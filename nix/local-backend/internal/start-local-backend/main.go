package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"syscall"
	"sync"
	"net"
	"net/http"
	"bufio"
	"path/filepath"
	"runtime"
	"time"
	"github.com/sqweek/dialog"
	"github.com/getlantern/systray"
	"github.com/allan-simon/go-singleinstance"
	"github.com/acarl005/stripansi"
)

func main() {
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

	sep := string(filepath.Separator)

	binDir := filepath.Dir(executablePath)

	var workDir string
	var libexecDir string
	var resourcesDir string
	switch runtime.GOOS {
	case "darwin":
		workDir = currentUser.HomeDir + "/Library/Application Support/lace-local-backend"
		libexecDir = binDir
		resourcesDir = filepath.Clean(binDir + "/../Resources")
	case "linux":
		workDir = currentUser.HomeDir + "/.local/share/lace-local-backend"
		libexecDir = filepath.Clean(binDir + "/../libexec")
		resourcesDir = filepath.Clean(binDir + "/../share/lace-local-backend")
	case "windows":
		workDir = os.Getenv("AppData") + "\\lace-local-backend"
		libexecDir = filepath.Clean(binDir + "\\libexec")
		resourcesDir = binDir
	default:
		panic("cannot happen, unknown OS: " + runtime.GOOS)
	}
	fmt.Println("workDir = " + workDir)
	os.MkdirAll(workDir, 0755)

	lockFile := workDir + sep + "instance.lock"
	_, err = singleinstance.CreateLockFile(lockFile)
	if err != nil {
		dialog.Message("Another instance of ‘%s’ is already running.",
			filepath.Base(executablePath)).Title("Already running!").Error()
		os.Exit(1)
	}

	logFile := workDir + sep + "logs" + sep + time.Now().UTC().Format("2006-01-02--15-04-05Z") + ".log"
	fmt.Printf("Logging to file: %s\n", logFile)
	os.MkdirAll(filepath.Dir(logFile), 0755)
	duplicateOutputToFile(logFile)

	ogmiosStatus := make(chan string, 1)
	cardanoNodeStatus := make(chan string, 1)
	cardanoJsSdkStatus := make(chan string, 1)
	networkSwitch := make(chan string)

	ogmiosStatus <- "off"
	cardanoNodeStatus <- "off"
	cardanoJsSdkStatus <- "off"

	go manageChildren(libexecDir, resourcesDir, workDir,
		networkSwitch,
		cardanoNodeStatus,
		ogmiosStatus,
	)

	systray.Run(onReady(ogmiosStatus, cardanoNodeStatus, cardanoJsSdkStatus, networkSwitch), onExit)
}

func onReady(
	ogmiosStatus <-chan string,
	cardanoNodeStatus <-chan string,
	cardanoJsSdkStatus <-chan string,
	networkSwitch chan<- string,
) func() { return func() {
	systray.SetTitle("lace-local-backend")
	// systray.SetTooltip("")

	iconData, err := Asset("cardano.png")
	if err != nil {
	    panic(err)
	}
	systray.SetTemplateIcon(iconData, iconData)

	mChooseNetwork := systray.AddMenuItem("Network", "")

	networks := []string{"mainnet", "preprod", "preview"}
	mNetworks := make(map[string](*systray.MenuItem))
	for _, network := range networks {
		mNetworks[network] = mChooseNetwork.AddSubMenuItemCheckbox(network, "", false)
	}
	for _, network := range networks {
		go func(network string) {
			for range mNetworks[network].ClickedCh {
				fmt.Println("Switching network to: " + network + "…")
				mChooseNetwork.SetTitle("Network: " + network)
				for _, networkBis := range networks {
					mNetworks[networkBis].Uncheck()
				}
				mNetworks[network].Check()
				networkSwitch <- network
			}
		}(network)
	}

	mNetworks[networks[0]].ClickedCh <- struct{}{}

	// XXX: additional spaces are there so that the width of the menu doesn’t change:
	systray.AddMenuItemCheckbox("Run Full (cardano-db-sync)                 ", "", false)

	systray.AddSeparator()

	statuses := map[string](<-chan string){
		"cardano-node": cardanoNodeStatus,
		"Ogmios": ogmiosStatus,
		"cardano-js-sdk": cardanoJsSdkStatus,
	}
	for component, statusCh := range statuses {
		menuItem := systray.AddMenuItem("", "")
		menuItem.Disable()
		go func(component string, statusCh <-chan string, menuItem *systray.MenuItem) {
			for newStatus := range statusCh {
				menuItem.SetTitle(component + " · " + newStatus)
			}
		}(component, statusCh, menuItem)
	}

	systray.AddSeparator()

	systray.AddMenuItem("Current Log", "")
	systray.AddMenuItem("Logs Directory", "")

	systray.AddSeparator()

	mQuit := systray.AddMenuItem("Quit", "Quit the application")
	go func() {
		<-mQuit.ClickedCh
		systray.Quit()
		fmt.Println("Quitting…")
	}()
}}

func onExit() {
}

func manageChildren(libexecDir string, resourcesDir string, workDir string,
	networkSwitch <-chan string,
	cardanoNodeStatus chan<- string,
	ogmiosStatus chan<- string,
) {
	sep := string(filepath.Separator)

	exeSuffix := ""
	if (runtime.GOOS == "windows") {
		exeSuffix = ".exe"
	}

	network := <-networkSwitch

	firstIteration := true

	// XXX: we nest a function here, so that we can defer cleanups, and return early on errors etc.
	for { func() {
		fmt.Printf("info: starting session for network %s\n", network)

		var wgChildren sync.WaitGroup

		defer func() {
			if r := recover(); r != nil {
				fmt.Fprintln(os.Stderr, "panic:", r)
			}
			wgChildren.Wait()
			fmt.Printf("info: session ended for network %s\n", network)
		}()

		processOutput := func(
			prefix string, lines <-chan string,
			markExit chan<- struct{}, didExit *bool, statusCh chan<- string,
		) {
			for line := range lines {
				fmt.Printf("[%s] %s\n", prefix, line)
			}
			*didExit = true
			statusCh <- "off"
			wgChildren.Done()
			markExit <- struct{}{}
		}

		if !firstIteration {
			time.Sleep(5 * time.Second)
		}
		firstIteration = false

		// -------------------------- cardano-node -------------------------- //

		cardanoNodeConfigDir := (resourcesDir + sep + "cardano-js-sdk" + sep + "packages" +
			sep + "cardano-services" + sep + "config" + sep + "network" +
			sep + network + sep + "cardano-node")
		cardanoNodeSocket := workDir + sep + network + sep + "cardano-node.socket"
		cardanoNodeStatus <- "starting…"
		cardanoNodeOut := make(chan string)
		cardanoNodeExited := make(chan struct{})
		cardanoNodeDidExit := false
		terminateCardanoNode := make(chan struct{}, 1)
		wgChildren.Add(1)
		go childProcess(
			libexecDir + sep + "cardano-node" + exeSuffix,
			[]string{
				"run",
				"--topology", cardanoNodeConfigDir + sep + "topology.json",
				"--database-path", workDir + sep + network + sep + "chain",
				"--port", fmt.Sprintf("%d", getFreeTCPPort()),
				"--host-addr", "0.0.0.0",
				"--config", cardanoNodeConfigDir + sep + "config.json",
				"--socket-path", cardanoNodeSocket,
			}, cardanoNodeOut, terminateCardanoNode)
		defer func() {
			if !cardanoNodeDidExit {
				cardanoNodeStatus <- "terminating…"
				terminateCardanoNode <- struct{}{}
			}
		}()
		go processOutput("cardano-node", cardanoNodeOut, cardanoNodeExited, &cardanoNodeDidExit, cardanoNodeStatus)

		socketListenErr := make(chan error, 1)
		go func() {
			// It usually takes ~9 seconds, let’s wait 5× that
			socketListenErr <- waitForUnixSocket(cardanoNodeSocket, 45 * time.Second)
		}()
		select {
		case err := <-socketListenErr:
			if (err != nil) {
				panic(err)
			}
		case <-cardanoNodeExited:
			panic("cardano-node exited prematurely")
		}

		cardanoNodeStatus <- "socket listening"

		// -------------------------- Ogmios -------------------------- //

		ogmiosStatus <- "starting…"
		ogmiosPort := getFreeTCPPort()
		ogmiosOut := make(chan string)
		ogmiosExited := make(chan struct{})
		ogmiosDidExit := false
		terminateOgmios := make(chan struct{}, 1)
		wgChildren.Add(1)
		go childProcess(
			libexecDir + sep + "ogmios" + exeSuffix,
			[]string{

				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", ogmiosPort),
				"--node-config", cardanoNodeConfigDir + sep + "config.json",
				"--node-socket", cardanoNodeSocket,
			}, ogmiosOut, terminateOgmios)
		defer func() {
			if (!ogmiosDidExit) {
				ogmiosStatus <- "terminating…"
				terminateOgmios <- struct{}{}
			}
		}()
		go processOutput("ogmios", ogmiosOut, ogmiosExited, &ogmiosDidExit, ogmiosStatus)

		ogmiosHealthErr := make(chan error, 1)
		go func() {
			// It usually takes <1s
			ogmiosHealthErr <- waitForHttp200(fmt.Sprintf("http://127.0.0.1:%d/health", ogmiosPort), 10 * time.Second)
		}()
		select {
		case err := <-ogmiosHealthErr:
			if (err != nil) {
				panic(err)
			}
		case <-ogmiosExited:
			panic("ogmios exited prematurely")
		}

		ogmiosStatus <- "listening"

		// -------------------------- wait for disaster (or network switch) -------------------------- //

		select {
		case <-cardanoNodeExited:
		case <-ogmiosExited:
		}
	}()}


	// TODO: continue here


	os.Exit(0)
}

func duplicateOutputToFile(logFile string) {
	originalStdout := os.Stdout
	originalStderr := os.Stderr

	newLine := "\n"
	if (runtime.GOOS == "windows") {
		newLine = "\r\n"
	}

	newStdoutR, newStdoutW, err := os.Pipe()
	if err != nil {
	    panic(err)
	}
	os.Stdout = newStdoutW

	newStderrR, newStderrW, err := os.Pipe()
	if err != nil {
	    panic(err)
	}
	os.Stderr = newStderrW

	fp, err := os.Create(logFile)
	if err != nil {
	    panic(err)
	}

	logTime := func() string {
		return time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	}

	go func() {
		defer fp.Close()
		lines := make(chan string)

		go func() {
			scanner := bufio.NewScanner(newStdoutR)
			for scanner.Scan() {
				line := logTime() + " " + scanner.Text()
				lines <- line
				originalStdout.WriteString(line + newLine)
			}
		}()

		go func() {
			scanner := bufio.NewScanner(newStderrR)
			for scanner.Scan() {
				now := logTime()
				line := scanner.Text()
				lines <- now + " [stderr] " + line
				originalStderr.WriteString(now + " " + line + newLine)
			}
		}()

		for line := range lines {
			fp.WriteString(stripansi.Strip(line) + newLine)
		}
	}()
}

func childProcess(path string, argv []string, outputLines chan<- string, terminate <-chan struct{}) {
	defer close(outputLines)

	var wgOuts sync.WaitGroup
	wgOuts.Add(2)

	cmd := exec.Command(path, argv...)

	stderr, err := cmd.StderrPipe()
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			outputLines <- "[stderr] " + scanner.Text()
		}
		wgOuts.Done()
	}()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			outputLines <- scanner.Text()
		}
		wgOuts.Done()
	}()

	if err := cmd.Start(); err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}

	waitDone := make(chan struct{})

	go func() {
		cmd.Wait()
		wgOuts.Wait()
		waitDone <- struct{}{}
	}()

	select {
	case <-terminate:
		if runtime.GOOS == "windows" {
			// FIXME: how to exit gracefully on Windows?
			cmd.Process.Kill()
		} else {
			cmd.Process.Signal(syscall.SIGTERM)
		}
		<-waitDone
	case <-waitDone:
	}
	outputLines <- "info: process ended"
}

func getFreeTCPPort() int {
	sock, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}
	defer sock.Close()

	// Retrieve the address of the listener
	address := sock.Addr().(*net.TCPAddr)
	return address.Port
}

func waitForUnixSocket(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		// XXX: for Windows named pipes this would be:
		// net.DialTimeout("pipe", `\\.\pipe\mypipe`, timeout)
		conn, err := net.DialTimeout("unix", path, 1 * time.Second)
		if err == nil {
			defer conn.Close()
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for socket: %s: %s", path, err)
		}
		time.Sleep(1 * time.Second)
	}
}

func waitForFile(path string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		_, err := os.Stat(path)
		if err == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for file: %s", path)
		}
		time.Sleep(1 * time.Second)
	}
}

func waitForHttp200(url string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	httpClient := http.Client{Timeout: 1 * time.Second}
	for {
		resp, err := httpClient.Get(url)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting for endpoint: %s: (err = %s, response = %s)", err, resp)
		}
		time.Sleep(1 * time.Second)
	}
}
