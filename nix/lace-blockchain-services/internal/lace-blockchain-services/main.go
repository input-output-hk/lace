package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"sync"
	"net"
	"net/http"
	"bufio"
	"io/ioutil"
	"path/filepath"
	"runtime"
	"time"
	"sort"
	"strings"
	"strconv"
	"regexp"
	"encoding/json"

	"lace.io/lace-blockchain-services/ourpaths" // has to be imported before clipboard.init()

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/sqweek/dialog"
	"github.com/getlantern/systray"
	"github.com/allan-simon/go-singleinstance"
	"github.com/acarl005/stripansi"
	"github.com/atotto/clipboard"
)

const (
	OurLogPrefix = "lace-blockchain-services"
)

func main() {
	hostInfo, err := host.Info()
	if err != nil {
		panic(err)
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		panic(err)
	}

	sep := string(filepath.Separator)

	fmt.Printf("%s[%d]: work directory: %s\n", OurLogPrefix, os.Getpid(), ourpaths.WorkDir)
	os.MkdirAll(ourpaths.WorkDir, 0755)
	os.Chdir(ourpaths.WorkDir)

	lockFile := ourpaths.WorkDir + sep + "instance.lock"
	lockFileFile, err := singleinstance.CreateLockFile(lockFile)
	if err != nil {
		dialog.Message("Another instance of ‘%s’ is already running.\n\nCheck in the system tray area.",
			OurLogPrefix).Title("Already running!").Error()
		os.Exit(1)
	}
	defer lockFileFile.Close() // or else, it will be GC’d (and unlocked!)

	logFile := ourpaths.WorkDir + sep + "logs" + sep + time.Now().UTC().Format("2006-01-02--15-04-05Z") + ".log"
	fmt.Printf("%s[%d]: logging to file: %s\n", OurLogPrefix, os.Getpid(), logFile)
	os.MkdirAll(filepath.Dir(logFile), 0755)
	closeOutputs := duplicateOutputToFile(logFile)
	defer closeOutputs()

	var stdArch string
	switch runtime.GOARCH {
	case "amd64": stdArch = "x86_64"
	case "arm64": stdArch = "aarch64"
	default: stdArch = runtime.GOARCH
	}

	fmt.Printf("%s[%d]: running as %s@%s\n", OurLogPrefix, os.Getpid(),
		ourpaths.Username, hostInfo.Hostname)
	fmt.Printf("%s[%d]: logging to file: %s\n", OurLogPrefix, os.Getpid(), logFile)
	fmt.Printf("%s[%d]: executable: %s\n", OurLogPrefix, os.Getpid(), ourpaths.ExecutablePath)
	fmt.Printf("%s[%d]: work directory: %s\n", OurLogPrefix, os.Getpid(), ourpaths.WorkDir)
	fmt.Printf("%s[%d]: timezone: %s\n", OurLogPrefix, os.Getpid(), time.Now().Format("UTC-07:00 (MST)"))
	fmt.Printf("%s[%d]: HostID: %s\n", OurLogPrefix, os.Getpid(), hostInfo.HostID)
	fmt.Printf("%s[%d]: OS: (%s-%s) %s %s %s (family: %s)\n", OurLogPrefix, os.Getpid(),
		stdArch, runtime.GOOS,
		hostInfo.OS, hostInfo.Platform, hostInfo.PlatformVersion, hostInfo.PlatformFamily)
	fmt.Printf("%s[%d]: CPU: %s (%d physical thread(s), %d core(s) each, at %.2f GHz)\n",
		OurLogPrefix, os.Getpid(),
		cpuInfo[0].ModelName, len(cpuInfo), cpuInfo[0].Cores, float64(cpuInfo[0].Mhz) / 1000.0)

	logSystemHealth()
	go func() {
		for {
			time.Sleep(60 * time.Second)
			logSystemHealth()
		}
	}()

	networks := readDirAsStrings(ourpaths.NetworkConfigDir)
	sort.Strings(networks)

	commUI, commManager := func() (CommChannels_UI, CommChannels_Manager) {
		ogmiosStatus := make(chan string, 1)
		ogmiosStatus <- "off"
		cardanoNodeStatus := make(chan string, 1)
		cardanoNodeStatus <- "off"
		providerServerStatus := make(chan string, 1)
		providerServerStatus <- "off"
		setBackendUrl := make(chan string)
		setOgmiosDashboard := make(chan string)
		blockRestartUI := make(chan bool)

		networkSwitch := make(chan string)
		initiateShutdownCh := make(chan struct{}, 1)

		return CommChannels_UI {
			OgmiosStatus: ogmiosStatus,
			CardanoNodeStatus: cardanoNodeStatus,
			ProviderServerStatus: providerServerStatus,
			SetBackendUrl: setBackendUrl,
			SetOgmiosDashboard: setOgmiosDashboard,
			BlockRestartUI: blockRestartUI,
			NetworkSwitch: networkSwitch,
			InitiateShutdownCh: initiateShutdownCh,
		}, CommChannels_Manager {
			OgmiosStatus: ogmiosStatus,
			CardanoNodeStatus: cardanoNodeStatus,
			ProviderServerStatus: providerServerStatus,
			SetBackendUrl: setBackendUrl,
			SetOgmiosDashboard: setOgmiosDashboard,
			BlockRestartUI: blockRestartUI,
			NetworkSwitch: networkSwitch,
			InitiateShutdownCh: initiateShutdownCh,
		}
	}()

	// XXX: os.Interrupt is the regular SIGINT on Unix, but also something rare on Windows
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM, syscall.SIGHUP, syscall.SIGQUIT)

	go func(){
		alreadySignaled := false
		for sig := range sigCh {
			if !alreadySignaled {
				alreadySignaled = true
				fmt.Fprintf(os.Stderr, "%s[%d]: got signal (%s), will shutdown...\n",
					OurLogPrefix, os.Getpid(), sig)
				commUI.InitiateShutdownCh <- struct{}{}
			} else {
				fmt.Fprintf(os.Stderr, "%s[%d]: got another signal (%s), but already in shutdown\n",
					OurLogPrefix, os.Getpid(), sig)
			}
		}
	}()

	// Both macOS and Windows require that UI happens on the main thread:
	var wgManager sync.WaitGroup
	wgManager.Add(1)
	go func() {
		defer systray.Quit()
		defer wgManager.Done()
		manageChildren(commManager)
	}()

	systray.Run(setupTrayUI(commUI, logFile, networks), func(){
		wgManager.Wait()
		fmt.Printf("%s[%d]: all good, exiting\n", OurLogPrefix, os.Getpid())
	})
}

type AppConfig struct {
	LastNetwork string `json:"lastNetwork"`
}

type CommChannels_UI struct {
	OgmiosStatus         <-chan string
	CardanoNodeStatus    <-chan string
	ProviderServerStatus <-chan string
	SetBackendUrl        <-chan string
	SetOgmiosDashboard   <-chan string
	BlockRestartUI       <-chan bool

	NetworkSwitch        chan<- string
	InitiateShutdownCh   chan<- struct{}
}

type CommChannels_Manager struct {
	OgmiosStatus         chan<- string
	CardanoNodeStatus    chan<- string
	ProviderServerStatus chan<- string
	SetBackendUrl        chan<- string
	SetOgmiosDashboard   chan<- string
	BlockRestartUI       chan<- bool

	NetworkSwitch        <-chan string
	InitiateShutdownCh   <-chan struct{}
}

func setupTrayUI(
	comm CommChannels_UI,
	logFile string,
	networks []string,
) func() { return func() {
	iconData, err := Asset("tray-icon")
	if err != nil {
	    panic(err)
	}
	systray.SetTemplateIcon(iconData, iconData)

	mChooseNetwork := systray.AddMenuItem("Network", "")

	appConfig := loadAppConfig()

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
					appConfig.LastNetwork = network
					saveAppConfig(appConfig)
					comm.NetworkSwitch <- network
				}
			}
		}(network)
	}

	if _, cfgNetExists := mNetworks[appConfig.LastNetwork]; !cfgNetExists {
		appConfig.LastNetwork = networks[0]
		saveAppConfig(appConfig)
	}

	mNetworks[appConfig.LastNetwork].ClickedCh <- struct{}{}

	//systray.AddMenuItemCheckbox("Run Full Backend (projector)", "", false)

	mCopyUrl := systray.AddMenuItem("Copy Backend URL", "")
	go func() {
		url := ""
		mCopyUrl.Disable()
		for { select {
		case <-mCopyUrl.ClickedCh:
			err := clipboard.WriteAll(url)
			if err != nil {
				fmt.Printf("%s[%d]: error: failed to copy '%s' to clipboard: %s\n",
					OurLogPrefix, os.Getpid(), url, err)
			}
		case url = <-comm.SetBackendUrl:
			if url == "" {
				mCopyUrl.Disable()
			} else {
				mCopyUrl.Enable()
			}
		}}
	}()

	systray.AddSeparator()

	// XXX: this weird type because we want order, and there are no tuples:
	statuses := []map[string](<-chan string) {
		{ "cardano-node":    comm.CardanoNodeStatus },
		{ "Ogmios":          comm.OgmiosStatus },
		{ "provider-server": comm.ProviderServerStatus },
	}

	for _, statusItem := range statuses {
		for component, statusCh := range statusItem {
			menuItem := systray.AddMenuItem("", "")
			menuItem.Disable()
			go func(component string, statusCh <-chan string, menuItem *systray.MenuItem) {
				prevStatus := "" // lessen refreshing, too often causes glitching on Windows
				for newStatus := range statusCh {
					if newStatus != prevStatus {
						menuItem.SetTitle(component + " · " + newStatus)
						prevStatus = newStatus
					}
				}
			}(component, statusCh, menuItem)
		}
	}

	systray.AddSeparator()

	mCurrentLog := systray.AddMenuItem("Open Current Log", "")
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

	mOgmiosDashboard := systray.AddMenuItem("Ogmios Dashboard", "")
	go func() {
		url := ""
		mOgmiosDashboard.Disable()
		for { select {
		case <-mOgmiosDashboard.ClickedCh:
			openWithDefaultApp(url)
		case url = <-comm.SetOgmiosDashboard:
			if url == "" {
				mOgmiosDashboard.Disable()
			} else {
				mOgmiosDashboard.Enable()
			}
		}}
	}()

	systray.AddSeparator()

	mForceRestart := systray.AddMenuItem("Force Restart", "")
	go func() {
		for range mForceRestart.ClickedCh {
			comm.NetworkSwitch <- currentNetwork
		}
	}()

	// XXX: additional spaces are there so that the width of the menu doesn’t change with updates:
	mQuit := systray.AddMenuItem("Quit                                                               ", "")
	go func() {
		<-mQuit.ClickedCh
		mQuit.Disable()
		comm.InitiateShutdownCh <- struct{}{}
	}()

	go func() {
		for doBlock := range comm.BlockRestartUI {
			if doBlock {
				for _, mNetwork := range mNetworks {
					mNetwork.Disable()
				}
				mForceRestart.Disable()
				mQuit.Disable()
			} else {
				for _, mNetwork := range mNetworks {
					mNetwork.Enable()
				}
				mForceRestart.Enable()
				mQuit.Enable()
			}
		}
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
	LogMonitor  func(string) LogMonitorStatus
	LogModifier func(string) string // e.g. to drop redundant timestamps
	AfterExit   func()
	ForceKillAfter time.Duration // graceful exit timeout, after which we SIGKILL the child
	Enabled     bool // for isolated tests etc.
}

type HealthStatus struct {
	Initialized bool          // whether to continue with launching other dependant processes
	DoRestart bool            // restart everything (even before it's considered initialized)
	NextProbeIn time.Duration // when to schedule the next HealthProbe
	LastErr error
}

type LogMonitorStatus struct {
	ForceKill bool
}

func manageChildren(comm CommChannels_Manager) {
	sep := string(filepath.Separator)

	exeSuffix := ""
	if (runtime.GOOS == "windows") {
		exeSuffix = ".exe"
	}

	network := <-comm.NetworkSwitch

	firstIteration := true
	omitSleep := false
	keepGoing := true

	windowsPipeCounter := -1
	mkNewWindowsPipeName := func() string {
		windowsPipeCounter += 1
		return fmt.Sprintf("\\\\.\\pipe\\cardano-node-%s.%d.%d",
			network, os.Getpid(), windowsPipeCounter)
	}

	// XXX: we nest a function here, so that we can defer cleanups, and return early on errors etc.
	for keepGoing { func() {
		if !firstIteration && !omitSleep {
			time.Sleep(5 * time.Second)
		}
		firstIteration = false
		omitSleep = false
		comm.BlockRestartUI <- false

		fmt.Printf("%s[%d]: starting session for network %s\n", OurLogPrefix, os.Getpid(), network)

		cardanoServicesDir := (ourpaths.ResourcesDir + sep + "cardano-js-sdk" + sep + "packages" +
			sep + "cardano-services")
		cardanoNodeConfigDir := ourpaths.NetworkConfigDir + sep + network
		cardanoNodeSocket := ourpaths.WorkDir + sep + network + sep + "cardano-node.socket"

		cardanoServicesAvailable := true
		if _, err := os.Stat(cardanoServicesDir); os.IsNotExist(err) {
			fmt.Printf("%s[%d]: warning: no cardano-services available, will run without them " +
				"(No such file or directory: %s)\n", OurLogPrefix, os.Getpid(), cardanoServicesDir)
			cardanoServicesAvailable = false
		}

		if (runtime.GOOS == "windows") {
			cardanoNodeSocket = mkNewWindowsPipeName()
		}

		var ogmiosPort int
		var providerServerPort int

		tokenMetadataServerUrl := "https://tokens.cardano.org"
		if network != "mainnet" {
			tokenMetadataServerUrl = "https://metadata.cardano-testnet.iohkdev.io/"
		}

		// XXX: we take that from Ogmios, we should probably calculate ourselves
		syncProgress := -1.0

		childrenDefsAll := []ManagedChild{
			func() ManagedChild {
				hostname, _ := os.Hostname()
				trimmedHostname := hostname
				if (len(trimmedHostname) > 8) {
					trimmedHostname = trimmedHostname[:8]
				}
				droppedHostname := fmt.Sprintf("[%s:cardano.node.", trimmedHostname)
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
				reValidatingChunk := regexp.MustCompile(`^.*ChainDB:Info.*Validating chunk no. \d+ out of \d+\. Progress: (\d*\.\d+%)$`)
				reReplayingLedger := regexp.MustCompile(`^.*ChainDB:Info.*Replayed block: slot \d+ out of \d+\. Progress: (\d*\.\d+%)$`)
				rePushingLedger := regexp.MustCompile(`^.*ChainDB:Info.*Pushing ledger state for block [0-9a-f]+ at slot \d+. Progress: (\d*\.\d+%)$`)
				reSyncing := regexp.MustCompile(`^.*ChainDB:Notice.*Chain extended, new tip: [0-9a-f]+ at slot (\d+)$`)
				return ManagedChild{
					LogPrefix: "cardano-node",
					PrettyName: "cardano-node",
					ExePath: ourpaths.LibexecDir + sep + "cardano-node" + exeSuffix,
					MkArgv: func() []string {
						args := []string {
							"run",
							"--topology", cardanoNodeConfigDir + sep + "topology.json",
							"--database-path", ourpaths.WorkDir + sep + network + sep +
								"chain",
							"--port", fmt.Sprintf("%d", getFreeTCPPort()),
							"--host-addr", "0.0.0.0",
							"--config", cardanoNodeConfigDir + sep + "config.json",
							"--socket-path", cardanoNodeSocket,
						}
						return args
					},
					MkExtraEnv: func() []string { return []string{} },
					StatusCh: comm.CardanoNodeStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						tmout := 1 * time.Second
						var err error
						if runtime.GOOS == "windows" {
							err = probeWindowsNamedPipe(cardanoNodeSocket, tmout)
						} else {
							err = probeUnixSocket(cardanoNodeSocket, tmout)
						}
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) LogMonitorStatus {
					        if ms := reValidatingChunk.FindStringSubmatch(line); len(ms) > 0 {
							comm.CardanoNodeStatus <- "validating chunks · " + ms[1]
						} else if strings.Index(line, "Started opening Volatile DB") != -1 {
							comm.CardanoNodeStatus <- "opening volatile DB…"
						} else if strings.Index(line, "Started opening Ledger DB") != -1 {
							comm.CardanoNodeStatus <- "opening ledger DB…"
						} else if ms :=reReplayingLedger.FindStringSubmatch(line);len(ms)>0 {
							comm.CardanoNodeStatus <- "replaying ledger · " + ms[1]
						} else if strings.Index(line, "Opened lgr db") != -1 {
							comm.CardanoNodeStatus <- "replaying ledger · 100.00%"
						} else if ms := rePushingLedger.FindStringSubmatch(line); len(ms)>0 {
							comm.CardanoNodeStatus <- "pushing ledger · " + ms[1]
						} else if ms := reSyncing.FindStringSubmatch(line); len(ms) > 0 {
							sp := ms[1] // fallback
							if (syncProgress >= 0) {
								sp = fmt.Sprintf("%.2f%%", syncProgress * 100.0)
							}
							textual := "syncing"
							if (syncProgress == 1.0) {
								textual = "synced"
							}
							comm.CardanoNodeStatus <- textual + " · " + sp
						}
						return LogMonitorStatus {
							// XXX: for whatever reason, cardano-node is not always
							// exiting on Windows, but instead hangs, after closing
							// the immutable DB; let’s kill it then, as it’s safe
							ForceKill: (runtime.GOOS == "windows" &&
								strings.Index(line, "Closed Immutable DB") != -1),
						}
					},
					LogModifier: func(line string) string {
						now := time.Now().UTC()
						line = removeTimestamp(line, now)
						line = removeTimestamp(line, now.Add(-1 * time.Second))
						line = strings.ReplaceAll(line, droppedHostname, "[")
						if (runtime.GOOS == "windows") {
							// garbled output on cmd.exe instead:
							line = stripansi.Strip(line)
						}
						return line
					},
					AfterExit: func() {},
					ForceKillAfter: 10 * time.Second,
					Enabled: true,
				}
			}(),
			func() ManagedChild {
				reSyncProgress := regexp.MustCompile(`"networkSynchronization"\s*:\s*(\d*\.\d+)`)
				return ManagedChild{
					LogPrefix: "ogmios",
					PrettyName: "Ogmios",
					ExePath: ourpaths.LibexecDir + sep + "ogmios" + exeSuffix,
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
					StatusCh: comm.OgmiosStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						ogmiosUrl := fmt.Sprintf("http://127.0.0.1:%d", ogmiosPort)
						err := probeHttp200(ogmiosUrl + "/health", 1 * time.Second)
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							comm.OgmiosStatus <- "listening"
							comm.SetOgmiosDashboard <- ogmiosUrl
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) LogMonitorStatus {
						if ms := reSyncProgress.FindStringSubmatch(line); len(ms) > 0 {
							num, err := strconv.ParseFloat(ms[1], 64)
							if err == nil {
								syncProgress = num
							}
						}
						return LogMonitorStatus {
							ForceKill: false,
						}
					},
					LogModifier: func(line string) string { return line },
					AfterExit: func() {
						comm.SetOgmiosDashboard <- ""
					},
					ForceKillAfter: 5 * time.Second,
					Enabled: true,
				}
			}(),
			func() ManagedChild {
				return ManagedChild{
					LogPrefix: "provider-server",
					PrettyName: "provider-server",
					ExePath: ourpaths.LibexecDir + sep + "node" + exeSuffix,
					MkArgv: func() []string {
						return []string{
							cardanoServicesDir + sep + "dist" + sep + "cjs" +
								sep + "cli.js",
							"start-provider-server",
						}
					},
					MkExtraEnv: func() []string {
						providerServerPort = getFreeTCPPort()
						return []string{
							"NETWORK=" + network,
							"TOKEN_METADATA_SERVER_URL=" + tokenMetadataServerUrl,
							"CARDANO_NODE_CONFIG_PATH=" + cardanoNodeConfigDir +
								sep + "config.json",
							"API_URL=http://0.0.0.0:" +
								fmt.Sprintf("%d", providerServerPort),
							"ENABLE_METRICS=true",
							"LOGGER_MIN_SEVERITY=info",
							"SERVICE_NAMES=tx-submit",
							"USE_QUEUE=false",
							"USE_BLOCKFROST=false",
							"OGMIOS_URL=ws://127.0.0.1:" +
								fmt.Sprintf("%d", ogmiosPort),
						}
					},
					StatusCh: comm.ProviderServerStatus,
					HealthProbe: func(prev HealthStatus) HealthStatus {
						backendUrl := fmt.Sprintf("http://127.0.0.1:%d",
							providerServerPort)
						err := probeHttp200(backendUrl + "/health", 1 * time.Second)
						nextProbeIn := 1 * time.Second
						if (err == nil) {
							comm.ProviderServerStatus <- "listening"
							comm.SetBackendUrl <- backendUrl
							nextProbeIn = 60 * time.Second
						}
						return HealthStatus {
							Initialized: err == nil,
							DoRestart: false,
							NextProbeIn: nextProbeIn,
							LastErr: err,
						}
					},
					LogMonitor: func(line string) LogMonitorStatus {
						return LogMonitorStatus {
							ForceKill: false,
						}
					},
					LogModifier: func(line string) string { return line },
					AfterExit: func() {
						comm.SetBackendUrl <- ""
					},
					ForceKillAfter: 5 * time.Second,
					Enabled: cardanoServicesAvailable,
				}
			}(),
		}

		var wgChildren sync.WaitGroup

		defer func(networkMemo string) {
			if r := recover(); r != nil {
				fmt.Fprintf(os.Stderr, "%s[%d]: panic: %s\n", OurLogPrefix, os.Getpid(), r)
			}
			comm.BlockRestartUI <- true
			wgChildren.Wait()
			for _, child := range childrenDefsAll {
				// Reset all statuses to "off" (not all children might’ve been started
				// and they’re "waiting" now)
				child.StatusCh <- "off"
			}
			fmt.Printf("%s[%d]: session ended for network %s\n", OurLogPrefix, os.Getpid(), networkMemo)
		}("" + network)

		var childrenDefs []ManagedChild
		for _, childUnsafe := range childrenDefsAll {
			if childUnsafe.Enabled {
				childrenDefs = append(childrenDefs, childUnsafe)
			}
		}

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
				child.LogModifier, outputLines, terminateCh, &childPid,
				child.ForceKillAfter)
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
					lmStatus := child.LogMonitor(line)
					if lmStatus.ForceKill {
						// In a rare event that it hangs, we cannot afford a deadlock here:
						go func() {
							rawProcess, err := os.FindProcess(childPid)
							if err == nil {
								rawProcess.Kill()
							}
						}()
					}
				}
				childDidExit = true
				fmt.Printf("%s[%d]: process ended: %s[%d]\n", OurLogPrefix, os.Getpid(),
					child.LogPrefix, childPid)
				child.AfterExit()
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
			case newNetwork := <-comm.NetworkSwitch:
				if newNetwork != network {
					omitSleep = true
					network = newNetwork
				}
				return
			case <-comm.InitiateShutdownCh:
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
	gracefulExitTimeout time.Duration,
) {
	defer close(outputLines)

	var wgOuts sync.WaitGroup
	wgOuts.Add(2)

	cmd := exec.Command(path, argv...)

	cmd.SysProcAttr = makeSysProcAttr()

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
			fmt.Printf("%s[%d]: sending CTRL_BREAK_EVENT to %s[%d]\n",
				OurLogPrefix, os.Getpid(), filepath.Base(path), cmd.Process.Pid)
			windowsSendCtrlBreak(cmd.Process.Pid)
		} else {
			cmd.Process.Signal(syscall.SIGTERM)
		}

		doForceKill := make(chan struct{}, 1)
		go func() {
			time.Sleep(gracefulExitTimeout)
			doForceKill <- struct{}{}
		}()
		select {
		case <-doForceKill:
			fmt.Printf("%s[%d]: %s[%d] did not exit gracefully in %s, killing it forcefully...\n",
				OurLogPrefix, os.Getpid(),
				filepath.Base(path), cmd.Process.Pid, gracefulExitTimeout)
			// In a rare event that it hangs, we cannot afford a deadlock here:
			go cmd.Process.Kill()
			<-waitDone
		case <-waitDone:
		}
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
		// XXX: there’s this "cmd.exe /c start ${target}" thing, but if we don’t pass our targets
		// through "explorer.exe" instead, we can’t open the log file that’s currently being written to
		// Note: don’t HideWindow, because then when opening the logs directory, it won’t show any window
		cmd = exec.Command("explorer.exe", target)
	default:
		panic("cannot happen, unknown OS: " + runtime.GOOS)
	}
	err := cmd.Run()

	if err != nil {
		fmt.Printf("%s[%d]: error: failed to open '%s' with a default app: %s\n",
			OurLogPrefix, os.Getpid(), target, err)
	}

	return err
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

func readDirAsStrings(dirPath string) []string {
	files, err := ioutil.ReadDir(ourpaths.NetworkConfigDir)
	if err != nil {
		panic(err)
	}
	rv := []string{}
	for _, file := range files {
		name := file.Name()
		if name == "." || name == ".." {
			continue
		}
		rv = append(rv, name)
	}
	return rv
}

func loadAppConfig() AppConfig {
	configFile := ourpaths.WorkDir + string(filepath.Separator) + "app-config.json"

	defaults := AppConfig {
		LastNetwork: "mainnet",
	}

	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		return defaults
	}

	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot read the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return defaults
	}

	err = json.Unmarshal(data, &defaults)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot unmarshal the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return defaults
	}

	return defaults
}

func saveAppConfig(config AppConfig) {
	configFile := ourpaths.WorkDir + string(filepath.Separator) + "app-config.json"

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot marshal the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return
	}

	err = ioutil.WriteFile(configFile, data, 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot save the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
	}
}
