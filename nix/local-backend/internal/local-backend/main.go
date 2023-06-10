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
	"strings"
	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/mem"
	"github.com/shirou/gopsutil/host"
	"github.com/shirou/gopsutil/load"
	"github.com/sqweek/dialog"
	"github.com/getlantern/systray"
	"github.com/allan-simon/go-singleinstance"
	"github.com/acarl005/stripansi"
	"github.com/atotto/clipboard"
)

const (
	OurLogPrefix = "local-backend"
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

	hostInfo, err := host.Info()
	if err != nil {
		panic(err)
	}

	cpuInfo, err := cpu.Info()
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
	fmt.Printf("%s[%d]: work directory: %s\n", OurLogPrefix, os.Getpid(), workDir)
	os.MkdirAll(workDir, 0755)
	os.Chdir(workDir)

	lockFile := workDir + sep + "instance.lock"
	lockFileFile, err := singleinstance.CreateLockFile(lockFile)
	if err != nil {
		dialog.Message("Another instance of ‘%s’ is already running.",
			filepath.Base(executablePath)).Title("Already running!").Error()
		os.Exit(1)
	}
	defer lockFileFile.Close() // or else, it will be GC’d (and unlocked!)

	logFile := workDir + sep + "logs" + sep + time.Now().UTC().Format("2006-01-02--15-04-05Z") + ".log"
	fmt.Printf("%s[%d]: logging to file: %s\n", OurLogPrefix, os.Getpid(), logFile)
	os.MkdirAll(filepath.Dir(logFile), 0755)
	closeOutputs := duplicateOutputToFile(logFile)
	defer closeOutputs()

	fmt.Printf("%s[%d]: running as %s@%s\n", OurLogPrefix, os.Getpid(),
		currentUser.Username, hostInfo.Hostname)
	fmt.Printf("%s[%d]: logging to file: %s\n", OurLogPrefix, os.Getpid(), logFile)
	fmt.Printf("%s[%d]: work directory: %s\n", OurLogPrefix, os.Getpid(), workDir)
	fmt.Printf("%s[%d]: timezone: %s\n", OurLogPrefix, os.Getpid(), time.Now().Format("UTC-07:00 (MST)"))
	fmt.Printf("%s[%d]: HostID: %s\n", OurLogPrefix, os.Getpid(), hostInfo.HostID)
	fmt.Printf("%s[%d]: OS: (%s-%s) %s %s %s (family: %s)\n", OurLogPrefix, os.Getpid(),
		runtime.GOOS, runtime.GOARCH, hostInfo.OS, hostInfo.Platform, hostInfo.PlatformVersion,
		hostInfo.PlatformFamily)
	fmt.Printf("%s[%d]: CPU: %dx %s\n", OurLogPrefix, os.Getpid(), len(cpuInfo), cpuInfo[0].ModelName)

	logSystemHealth()
	go func() {
		for {
			time.Sleep(60 * time.Second)
			logSystemHealth()
		}
	}()

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
				fmt.Fprintf(os.Stderr, "%s[%d]: got signal (%s), will shutdown...\n",
					OurLogPrefix, os.Getpid(), sig)
				initiateShutdownCh <- struct{}{}
			} else {
				fmt.Fprintf(os.Stderr, "%s[%d]: got another signal (%s), but already in shutdown\n",
					OurLogPrefix, os.Getpid(), sig)
			}
		}
	}()

	providerServerPort := 3000

	go systray.Run(setupTrayUI(
		ogmiosStatus, cardanoNodeStatus, providerServerStatus, networkSwitch, initiateShutdownCh,
		logFile, &providerServerPort,
	), func(){})
	defer systray.Quit()

	manageChildren(libexecDir, resourcesDir, workDir,
		networkSwitch,
		initiateShutdownCh,
		cardanoNodeStatus,
		ogmiosStatus,
		providerServerStatus,
		&providerServerPort,
	)

	fmt.Printf("%s[%d]: all good, exiting\n", OurLogPrefix, os.Getpid())
}

func setupTrayUI(
	ogmiosStatus <-chan string,
	cardanoNodeStatus <-chan string,
	providerServerStatus <-chan string,
	networkSwitch chan<- string,
	initiateShutdownCh chan<- struct{},
	logFile string,
	providerServerPort *int,
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
					fmt.Printf("%s[%d]: switching network to: %s\n",
						OurLogPrefix, os.Getpid(), network)
					networkSwitch <- network
				}
			}
		}(network)
	}

	mNetworks[networks[0]].ClickedCh <- struct{}{}

	//systray.AddMenuItemCheckbox("Run Full Backend (projector)", "", false)

	systray.AddSeparator()

	// XXX: this weird type because we want order, and there are no tuples:
	statuses := []map[string](<-chan string) {
		{ "cardano-node":    cardanoNodeStatus },
		{ "Ogmios":          ogmiosStatus },
		{ "provider-server": providerServerStatus },
	}

	for _, statusItem := range statuses {
		for component, statusCh := range statusItem {
			menuItem := systray.AddMenuItem("", "")
			menuItem.Disable()
			go func(component string, statusCh <-chan string, menuItem *systray.MenuItem) {
				for newStatus := range statusCh {
					menuItem.SetTitle(component + " · " + newStatus)
				}
			}(component, statusCh, menuItem)
		}
	}

	systray.AddSeparator()

	mCopyUrl := systray.AddMenuItem("Copy Backend URL", "")
	go func() {
		for range mCopyUrl.ClickedCh {
			url := fmt.Sprintf("http://127.0.0.1:%d", *providerServerPort)
			err := clipboard.WriteAll(url)
			if err != nil {
				fmt.Printf("%s[%d]: error: failed to copy '%s' to clipboard: %s\n",
					OurLogPrefix, os.Getpid(), url, err)
			}
		}
	}()

	mCurrentLog := systray.AddMenuItem("Open Current Log", "")
	go func() {
		for range mCurrentLog.ClickedCh {
			openWithDefaultApp(logFile)
		}
	}()

	mLogsDirectory := systray.AddMenuItem("Open Logs Directory", "")
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
	mQuit := systray.AddMenuItem("Quit                                                               ", "")
	go func() {
		<-mQuit.ClickedCh
		mQuit.Disable()
		initiateShutdownCh <- struct{}{}
	}()
}}

type ManagedChild struct {
	LogPrefix   string
	PrettyName  string // used in auto-generated messages to StatusCh
	ExePath     string
	MkArgv      func() []string // XXX: it’s a func to run `getFreeTCPPort()` at the very last moment
	MkExtraEnv  func() []string
	StatusCh    chan<- string
	HealthProbe func(HealthStatus) HealthStatus // the argument is the previous HealthStatus
	LogMonitor  func(string)
	LogModifier func(string) string // e.g. to drop redundant timestamps
}

type HealthStatus struct {
	Initialized bool          // whether to continue with launching other dependant processes
	DoRestart bool               // restart everything (even before it's considered initialized)
	NextProbeIn time.Duration // when to schedule the next HealthProbe
	LastErr error
}

func manageChildren(libexecDir string, resourcesDir string, workDir string,
	networkSwitch <-chan string,
	initiateShutdownCh <-chan struct{},
	cardanoNodeStatus chan<- string,
	ogmiosStatus chan<- string,
	providerServerStatus chan<- string,
	providerServerPort *int,
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
		if !firstIteration && !omitSleep {
			time.Sleep(5 * time.Second)
		}
		firstIteration = false
		omitSleep = false

		fmt.Printf("%s[%d]: starting session for network %s\n", OurLogPrefix, os.Getpid(), network)

		cardanoServicesDir := (resourcesDir + sep + "cardano-js-sdk" + sep + "packages" +
			sep + "cardano-services")
		cardanoNodeConfigDir := (cardanoServicesDir + sep + "config" + sep + "network" +
			sep + network + sep + "cardano-node")
		cardanoNodeSocket := workDir + sep + network + sep + "cardano-node.socket"

		var ogmiosPort int

		tokenMetadataServerUrl := "https://tokens.cardano.org"
		if network != "mainnet" {
			tokenMetadataServerUrl = "https://metadata.cardano-testnet.iohkdev.io/"
		}

		childrenDefs := []ManagedChild{
			func() ManagedChild {
				hostname, _ := os.Hostname()
				droppedHostname := fmt.Sprintf("[%s:cardano.node.", hostname)
				removeTimestamp := func(line string, when time.Time) string {
					needle := when.Format("[2006-01-02 15:04:05.")
					index := strings.Index(line, needle)
					if index != -1 {
						end := index + len(needle) + 8
						if end > len(line) {
							end = len(line)
						}
						return line[:index] + line[end:]
					}
					return line
				}
				return ManagedChild{
					LogPrefix: "cardano-node",
					PrettyName: "cardano-node",
					ExePath: libexecDir + sep + "cardano-node" + exeSuffix,
					MkArgv: func() []string {
						return []string {
							"run",
							"--topology", cardanoNodeConfigDir + sep + "topology.json",
							"--database-path", workDir + sep + network + sep + "chain",
							"--port", fmt.Sprintf("%d", getFreeTCPPort()),
							"--host-addr", "0.0.0.0",
							"--config", cardanoNodeConfigDir + sep + "config.json",
							"--socket-path", cardanoNodeSocket,
						}
					},
					MkExtraEnv: func() []string { return []string{} },
					StatusCh: cardanoNodeStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						err := probeUnixSocket(cardanoNodeSocket, 1 * time.Second)
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							cardanoNodeStatus <- "socket listening"
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) {},
					LogModifier: func(line string) string {
						now := time.Now().UTC()
						line = removeTimestamp(line, now)
						line = removeTimestamp(line, now.Add(-1 * time.Second))
						line = strings.ReplaceAll(line, droppedHostname, "[")
						return line
					},
				}
			}(),
			func() ManagedChild {
				return ManagedChild{
					LogPrefix: "ogmios",
					PrettyName: "Ogmios",
					ExePath: libexecDir + sep + "ogmios" + exeSuffix,
					MkArgv: func() []string {
						ogmiosPort = getFreeTCPPort()
						return []string{
							"--host", "127.0.0.1",
							"--port", fmt.Sprintf("%d", ogmiosPort),
							"--node-config", cardanoNodeConfigDir + sep + "config.json",
							"--node-socket", cardanoNodeSocket,
						}
					},
					MkExtraEnv: func() []string { return []string{} },
					StatusCh: ogmiosStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						err := probeHttp200(
							fmt.Sprintf("http://127.0.0.1:%d/health", ogmiosPort),
							1 * time.Second)
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							ogmiosStatus <- "listening"
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) {},
					LogModifier: func(line string) string { return line },
				}
			}(),
			func() ManagedChild {
				return ManagedChild{
					LogPrefix: "provider-server",
					PrettyName: "provider-server",
					ExePath: libexecDir + sep + "node" + exeSuffix,
					MkArgv: func() []string {
						return []string{
							cardanoServicesDir + sep + "dist" + sep + "cjs" +
								sep + "cli.js",
							"start-provider-server",
						}
					},
					MkExtraEnv: func() []string {
						return []string{
							"NETWORK=" + network,
							"TOKEN_METADATA_SERVER_URL=" + tokenMetadataServerUrl,
							"CARDANO_NODE_CONFIG_PATH=" + cardanoNodeConfigDir +
								sep + "config.json",
							"API_URL=http://0.0.0.0:" +
								fmt.Sprintf("%d", *providerServerPort),
							"ENABLE_METRICS=true",
							"LOGGER_MIN_SEVERITY=info",
							"SERVICE_NAMES=tx-submit",
							"USE_QUEUE=false",
							"USE_BLOCKFROST=false",
							"OGMIOS_URL=ws://127.0.0.1:" +
								fmt.Sprintf("%d", ogmiosPort),
						}
					},
					StatusCh: providerServerStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						err := probeHttp200(
							fmt.Sprintf("http://127.0.0.1:%d/health",
								*providerServerPort),
							1 * time.Second)
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							providerServerStatus <- "listening"
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) {},
					LogModifier: func(line string) string { return line },
				}
			}(),
		}

		var wgChildren sync.WaitGroup

		defer func(networkMemo string) {
			if r := recover(); r != nil {
				fmt.Fprintf(os.Stderr, "%s[%d]: panic: %s\n", OurLogPrefix, os.Getpid(), r)
			}
			wgChildren.Wait()
			for _, child := range childrenDefs {
				// Reset all statuses to "off" (not all children might’ve been started
				// and they’re "waiting" now)
				child.StatusCh <- "off"
			}
			fmt.Printf("%s[%d]: session ended for network %s\n", OurLogPrefix, os.Getpid(), networkMemo)
		}("" + network)

		anyChildExitedCh := make(chan struct{}, len(childrenDefs))

		for childIdx, childUnsafe := range childrenDefs {
			child := childUnsafe // or else all interations will get the same ref (last child)
			wgChildren.Add(1)
			fmt.Printf("%s[%d]: starting %s...\n", OurLogPrefix, os.Getpid(), child.LogPrefix)
			for _, dependant := range childrenDefs[(childIdx+1):] {
				dependant.StatusCh <- fmt.Sprintf("waiting for %s", child.PrettyName)
			}
			child.StatusCh <- "starting…"
			outputLines := make(chan string)
			terminateCh := make(chan struct{}, 1)
			childDidExit := false
			childPid := 0
			go childProcess(child.ExePath, child.MkArgv(), child.MkExtraEnv(),
				child.LogModifier, outputLines, terminateCh, &childPid)
			defer func() {
				if !childDidExit {
					child.StatusCh <- "terminating…"
					terminateCh <- struct{}{}
				}
			}()
			initializedCh := make(chan struct{}, 1)

			// monitor output:
			go func() {
				for line := range outputLines {
					fmt.Printf("%s[%d]: %s\n", child.LogPrefix, childPid, line)
					child.LogMonitor(line)
				}
				childDidExit = true
				fmt.Printf("%s[%d]: process ended: %s[%d]\n", OurLogPrefix, os.Getpid(),
					child.LogPrefix, childPid)
				child.StatusCh <- "off"
				wgChildren.Done()
				anyChildExitedCh <- struct{}{}
			}()

			// monitor health:
			go func() {
				prev := HealthStatus {
					Initialized: false,
					DoRestart: false,
					NextProbeIn: 1 * time.Second,
					LastErr: nil,
				}
				for {
					next := child.HealthProbe(prev)
					if next.DoRestart {
						fmt.Printf("%s[%d]: health probe of %s[%d] requested restart\n",
							OurLogPrefix, os.Getpid(), child.LogPrefix, childPid)
						terminateCh <- struct{}{}
						return
					}
					next.Initialized = prev.Initialized || next.Initialized // remember true
					if !prev.Initialized && next.Initialized {
						fmt.Printf("%s[%d]: health probe reported %s[%d] as initialized\n",
							OurLogPrefix, os.Getpid(), child.LogPrefix, childPid)
						initializedCh <- struct{}{} // continue launching the next process
					}
					time.Sleep(next.NextProbeIn)
					prev = next
				}
			}()

		OneFinalWait:
			select {
			case <-anyChildExitedCh:
				return // if any exited, fail the whole session, and restart
			case <-initializedCh:
				if childIdx + 1 == len(childrenDefs) {
					fmt.Printf("%s[%d]: initialized all children\n", OurLogPrefix, os.Getpid())
					// if it was the last child, continue waiting:
					goto OneFinalWait
				}
				// else: continue starting the next child
				fmt.Printf("%s[%d]: will continue launching the next child\n",
					OurLogPrefix, os.Getpid())
			case newNetwork := <-networkSwitch:
				if newNetwork != network {
					omitSleep = true
					network = newNetwork
				}
				return
			case <-initiateShutdownCh:
				fmt.Printf("%s[%d]: initiating a graceful shutdown...\n", OurLogPrefix, os.Getpid())
				keepGoing = false
				return
			}
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

	fp, err := os.Create(logFile)
	if err != nil {
	    panic(err)
	}

	introLine := "-- Log begins at " + time.Now().UTC().Format("Mon 2006-01-02 15:04:05") + " UTC. --"
	fmt.Println(introLine)
	fp.WriteString(introLine + newLine)

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

	logTime := func() string {
		return time.Now().UTC().Format("Jan 2 15:04:05.000Z")
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
	logModifier func(string) string, // e.g. to drop redundant timestamps
	outputLines chan<- string, terminate <-chan struct{}, pid *int,
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
			outputLines <- "[stderr] " + logModifier(scanner.Text())
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
			outputLines <- logModifier(scanner.Text())
		}
		wgOuts.Done()
	}()

	if err := cmd.Start(); err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}

	if (pid != nil) {
		*pid = cmd.Process.Pid
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

func probeUnixSocket(path string, timeout time.Duration) error {
	// XXX: for Windows named pipes this would be:
	// net.DialTimeout("pipe", `\\.\pipe\mypipe`, timeout)
	conn, err := net.DialTimeout("unix", path, timeout)
	if err == nil {
		defer conn.Close()
	}
	return err
}

func probeHttp200(url string, timeout time.Duration) error {
	httpClient := http.Client{Timeout: timeout}
	resp, err := httpClient.Get(url)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			return nil
		} else {
			return fmt.Errorf("got a non-200 response: %s for %s", resp.StatusCode, url)
		}
	}
	return err
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

func logSystemHealth() {
	ourPrefix := fmt.Sprintf("%s[%d]", OurLogPrefix, os.Getpid())

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: RAM err: %s\n", ourPrefix, err)
	}

	fmt.Printf("%s: memory: %.2fGi total, %.2fGi free\n", ourPrefix,
		float64(memInfo.Total) / (1024.0 * 1024.0 * 1024.0),
		float64(memInfo.Free) / (1024.0 * 1024.0 * 1024.0))

	avgStat, err := load.Avg()
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: load err: %s\n", ourPrefix, err)
	}

	fmt.Printf("%s: load average: %.2f, %.2f, %.2f\n", ourPrefix,
		avgStat.Load1, avgStat.Load5, avgStat.Load15)
}
