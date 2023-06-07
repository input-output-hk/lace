package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"os/signal"
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
	fmt.Println("info: workDir is " + workDir)
	os.MkdirAll(workDir, 0755)
	os.Chdir(workDir)

	lockFile := workDir + sep + "instance.lock"
	_, err = singleinstance.CreateLockFile(lockFile)
	if err != nil {
		dialog.Message("Another instance of ‘%s’ is already running.",
			filepath.Base(executablePath)).Title("Already running!").Error()
		os.Exit(1)
	}

	logFile := workDir + sep + "logs" + sep + time.Now().UTC().Format("2006-01-02--15-04-05Z") + ".log"
	fmt.Printf("info: logging to file: %s\n", logFile)
	os.MkdirAll(filepath.Dir(logFile), 0755)
	closeOutputs := duplicateOutputToFile(logFile)

	ogmiosStatus := make(chan string, 1)
	cardanoNodeStatus := make(chan string, 1)
	providerServerStatus := make(chan string, 1)
	networkSwitch := make(chan string)

	ogmiosStatus <- "off"
	cardanoNodeStatus <- "off"
	providerServerStatus <- "off"

	initiateShutdownCh := make(chan struct{}, 1)

	// XXX: os.Interrupt is the regular SIGINT on Unix, but also something rare on Windows
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	go func(){
		alreadySignaled := false
		for sig := range sigCh {
			if !alreadySignaled {
				alreadySignaled = true
				fmt.Fprintf(os.Stderr, "warn: got signal (%s), will shutdown...\n", sig)
				initiateShutdownCh <- struct{}{}
			} else {
				fmt.Fprintf(os.Stderr,
					"warn: got another signal (%s), but already in shutdown\n", sig)
			}
		}
	}()

	go systray.Run(setupTrayUI(
		ogmiosStatus, cardanoNodeStatus, providerServerStatus, networkSwitch, initiateShutdownCh,
		logFile,
	), func(){})

	manageChildren(libexecDir, resourcesDir, workDir,
		networkSwitch,
		initiateShutdownCh,
		cardanoNodeStatus,
		ogmiosStatus,
		providerServerStatus,
	)

	systray.Quit()

	fmt.Println("info: all good, exiting")
	closeOutputs()
}

func setupTrayUI(
	ogmiosStatus <-chan string,
	cardanoNodeStatus <-chan string,
	providerServerStatus <-chan string,
	networkSwitch chan<- string,
	initiateShutdownCh chan<- struct{},
	logFile string,
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
	currentNetwork := ""
	for _, network := range networks {
		mNetworks[network] = mChooseNetwork.AddSubMenuItemCheckbox(network, "", false)
	}
	for _, network := range networks {
		go func(network string) {
			for range mNetworks[network].ClickedCh {
				mChooseNetwork.SetTitle("Network: " + network)
				for _, networkBis := range networks {
					mNetworks[networkBis].Uncheck()
				}
				mNetworks[network].Check()
				if network != currentNetwork {
					currentNetwork = network
					fmt.Println("info: switching network to: " + network + "...")
					networkSwitch <- network
				}
			}
		}(network)
	}

	mNetworks[networks[0]].ClickedCh <- struct{}{}

	//systray.AddMenuItemCheckbox("Run Full Backend (projector)", "", false)

	systray.AddSeparator()

	statuses := map[string](<-chan string){
		"cardano-node": cardanoNodeStatus,
		"Ogmios": ogmiosStatus,
		"provider-server": providerServerStatus,
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

	systray.AddMenuItem("Copy Backend URL", "")

	mCurrentLog := systray.AddMenuItem("Current Log", "")
	go func() {
		for range mCurrentLog.ClickedCh {
			openWithDefaultApp(logFile)
		}
	}()

	mLogsDirectory := systray.AddMenuItem("Logs Directory", "")
	go func() {
		for range mLogsDirectory.ClickedCh {
			openWithDefaultApp(filepath.Dir(logFile))
		}
	}()

	systray.AddSeparator()

	mForceRestart := systray.AddMenuItem("Force Restart", "")
	go func() {
		for range mForceRestart.ClickedCh {
			networkSwitch <- currentNetwork
		}
	}()

	// XXX: additional spaces are there so that the width of the menu doesn’t change with updates:
	mQuit := systray.AddMenuItem("Quit                                       ", "")
	go func() {
		<-mQuit.ClickedCh
		mQuit.Disable()
		initiateShutdownCh <- struct{}{}
	}()
}}

func manageChildren(libexecDir string, resourcesDir string, workDir string,
	networkSwitch <-chan string,
	initiateShutdownCh <-chan struct{},
	cardanoNodeStatus chan<- string,
	ogmiosStatus chan<- string,
	providerServerStatus chan<- string,
) {
	sep := string(filepath.Separator)

	exeSuffix := ""
	if (runtime.GOOS == "windows") {
		exeSuffix = ".exe"
	}

	network := <-networkSwitch

	firstIteration := true
	omitSleep := false
	keepGoing := true

	// XXX: we nest a function here, so that we can defer cleanups, and return early on errors etc.
	for keepGoing { func() {
		var wgChildren sync.WaitGroup

		defer func(networkMemo string) {
			if r := recover(); r != nil {
				fmt.Fprintln(os.Stderr, "panic:", r)
			}
			wgChildren.Wait()
			fmt.Printf("info: session ended for network %s\n", networkMemo)
		}("" + network)

		if !firstIteration && !omitSleep {
			time.Sleep(5 * time.Second)
		}
		firstIteration = false
		omitSleep = false

		fmt.Printf("info: starting session for network %s\n", network)

		addChild := func(
			logPrefix string, exePath string, argv []string, extraEnv []string,
			statusCh chan<- string,
		) (func(), <-chan struct{}) {
			wgChildren.Add(1)
			statusCh <- "starting…"
			outputLines := make(chan string)
			terminateCh := make(chan struct{}, 1)
			childDidExit := false
			go childProcess(exePath, argv, extraEnv, outputLines, terminateCh)
			cancelChild := func() {
				if !childDidExit {
					statusCh <- "terminating…"
					terminateCh <- struct{}{}
				}
			}
			markExitCh := make(chan struct{}, 1)
			go func() {
				for line := range outputLines {
					fmt.Printf("[%s] %s\n", logPrefix, line)
				}
				childDidExit = true
				statusCh <- "off"
				wgChildren.Done()
				markExitCh <- struct{}{}
			}()
			return cancelChild, markExitCh
		}

		// -------------------------- cardano-node -------------------------- //

		cardanoServicesDir := (resourcesDir + sep + "cardano-js-sdk" + sep + "packages" +
			sep + "cardano-services")

		cardanoNodeConfigDir := (cardanoServicesDir + sep + "config" + sep + "network" +
			sep + network + sep + "cardano-node")
		cardanoNodeSocket := workDir + sep + network + sep + "cardano-node.socket"

		cancelCardanoNode, cardanoNodeExited := addChild(
			"cardano-node",
			libexecDir + sep + "cardano-node" + exeSuffix,
			[]string{
				"run",
				"--topology", cardanoNodeConfigDir + sep + "topology.json",
				"--database-path", workDir + sep + network + sep + "chain",
				"--port", fmt.Sprintf("%d", getFreeTCPPort()),
				"--host-addr", "0.0.0.0",
				"--config", cardanoNodeConfigDir + sep + "config.json",
				"--socket-path", cardanoNodeSocket,
			}, []string{}, cardanoNodeStatus)
		defer cancelCardanoNode()

		socketListenErr := make(chan error, 1)
		go func() {
			// FIXME: a smarter health check needed
			socketListenErr <- waitForUnixSocket(cardanoNodeSocket, 120 * time.Second)
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

		ogmiosPort := getFreeTCPPort()

		cancelOgmios, ogmiosExited := addChild(
			"ogmios",
			libexecDir + sep + "ogmios" + exeSuffix,
			[]string{
				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", ogmiosPort),
				"--node-config", cardanoNodeConfigDir + sep + "config.json",
				"--node-socket", cardanoNodeSocket,
			}, []string{}, ogmiosStatus)
		defer cancelOgmios()

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

		// -------------------------- cardano-js-sdk -------------------------- //

		providerServerPort := 3000

		tokenMetadataServerUrl := "https://tokens.cardano.org"
		if network != "mainnet" {
			tokenMetadataServerUrl = "https://metadata.cardano-testnet.iohkdev.io/"
		}

		cancelProviderServer, providerServerExited := addChild(
			"provider-server",
			libexecDir + sep + "node" + exeSuffix,
			[]string{
				cardanoServicesDir + sep + "dist" + sep + "cjs" + sep + "cli.js",
				"start-provider-server",
			}, []string{
				"NETWORK=" + network,
				"TOKEN_METADATA_SERVER_URL=" + tokenMetadataServerUrl,
				"CARDANO_NODE_CONFIG_PATH=" + cardanoNodeConfigDir + sep + "config.json",
				"API_URL=http://0.0.0.0:" + fmt.Sprintf("%d", providerServerPort),
				"ENABLE_METRICS=true",
				"LOGGER_MIN_SEVERITY=info",
				"SERVICE_NAMES=tx-submit",
				"USE_QUEUE=false",
				"USE_BLOCKFROST=false",
				"OGMIOS_URL=ws://127.0.0.1:" + fmt.Sprintf("%d", ogmiosPort),
			}, providerServerStatus)
		defer cancelProviderServer()

		providerServerHealthErr := make(chan error, 1)
		go func() {
			// It usually takes <1s
			providerServerHealthErr <- waitForHttp200(fmt.Sprintf("http://127.0.0.1:%d/health", providerServerPort), 10 * time.Second)
		}()
		select {
		case err := <-providerServerHealthErr:
			if (err != nil) {
				panic(err)
			}
		case <-providerServerExited:
			panic("provider-server exited prematurely")
		}

		providerServerStatus <- "listening"

		// -------------------------- wait for disaster (or network switch) -------------------------- //

		select {
		case <-cardanoNodeExited:
		case <-ogmiosExited:
		case <-providerServerExited:
		case newNetwork := <-networkSwitch:
			if newNetwork != network {
				omitSleep = true
				network = newNetwork
			}
		case <-initiateShutdownCh:
			fmt.Println("info: initiating a clean shutdown...")
			keepGoing = false
		}
	}()}
}

func duplicateOutputToFile(logFile string) func() {
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

	var wgScanners sync.WaitGroup
	wgScanners.Add(2)

	lines := make(chan string)

	go func() {
		scanner := bufio.NewScanner(newStdoutR)
		for scanner.Scan() {
			line := logTime() + " " + scanner.Text()
			lines <- line
			originalStdout.WriteString(line + newLine)
		}
		wgScanners.Done()
	}()

	go func() {
		scanner := bufio.NewScanner(newStderrR)
		for scanner.Scan() {
			now := logTime()
			line := scanner.Text()
			lines <- now + " [stderr] " + line
			originalStderr.WriteString(now + " " + line + newLine)
		}
		wgScanners.Done()
	}()

	writerDone := make(chan struct{})

	go func() {
		defer fp.Close()
		for line := range lines {
			fp.WriteString(stripansi.Strip(line) + newLine)
		}
		writerDone <- struct{}{}
	}()

	// Wait, making sure that everything is indeed written before exiting:
	closeOutputs := func(){
		newStdoutW.Close()
		newStderrW.Close()
		wgScanners.Wait()
		close(lines)
		<-writerDone
	}

	return closeOutputs
}

func childProcess(
	path string, argv []string, extraEnv []string,
	outputLines chan<- string, terminate <-chan struct{},
) {
	defer close(outputLines)

	var wgOuts sync.WaitGroup
	wgOuts.Add(2)

	cmd := exec.Command(path, argv...)

	if len(extraEnv) > 0 {
		cmd.Env = append(os.Environ(), extraEnv...)
	}

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

func openWithDefaultApp(target string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "linux":
		cmd = exec.Command("xdg-open", target)
	case "darwin":
		cmd = exec.Command("open", target)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", target)
	default:
		panic("cannot happen, unknown OS: " + runtime.GOOS)
	}
	return cmd.Run()
}
