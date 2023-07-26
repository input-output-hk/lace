package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"sync"
	"io/ioutil"
	"path/filepath"
	"runtime"
	"time"
	"sort"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/appconfig"
	"lace.io/lace-blockchain-services/httpapi"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/sqweek/dialog"
	"github.com/getlantern/systray"
	"github.com/allan-simon/go-singleinstance"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
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

		// FIXME: get rid of that, right now we have to slurp the channel, or writing to it will block
		go func(){
			for url := range setBackendUrl {
				fmt.Printf("%s[%d]: info: new provider-server: %s\n",
					OurLogPrefix, os.Getpid(), url)
			}
		}()

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

	appConfig := appconfig.Load()

	go func(){ for {
		err := httpapi.Run(appConfig, []int{764824073, 1, 2})
		fmt.Fprintf(os.Stderr, "%s[%d]: HTTP server failed: %v\n",
			OurLogPrefix, os.Getpid(), err)
		time.Sleep(1 * time.Second)
	}}()

	// Both macOS and Windows require that UI happens on the main thread:
	var wgManager sync.WaitGroup
	wgManager.Add(1)
	go func() {
		defer systray.Quit()
		defer wgManager.Done()
		manageChildren(commManager)
	}()

	systray.Run(setupTrayUI(commUI, logFile, networks, appConfig), func(){
		wgManager.Wait()
		fmt.Printf("%s[%d]: all good, exiting\n", OurLogPrefix, os.Getpid())
	})
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
