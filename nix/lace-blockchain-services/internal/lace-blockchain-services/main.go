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
	"encoding/json"

	t "lace.io/lace-blockchain-services/types"
	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/appconfig"
	"lace.io/lace-blockchain-services/httpapi"
	"lace.io/lace-blockchain-services/ui"
	"lace.io/lace-blockchain-services/mithrilcache"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
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
		ui.HandleAppReopened()
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

	networks, err := readAvailableNetworks()
	if err != nil { panic(err) }

	appConfig := appconfig.Load()

	commUI, commManager, commHttp := func() (ui.CommChannels, CommChannels_Manager, httpapi.CommChannels) {
		blockRestartUI := make(chan bool)

		serviceUpdateFromManager := make(chan t.ServiceStatus)
		serviceUpdateToUI := make(chan t.ServiceStatus)
		serviceUpdateToHttp := make(chan t.ServiceStatus)

		networkFromUI := make(chan string)
		networkFromHttp := make(chan t.NetworkMagic)
		networkToHttp := make(chan t.NetworkMagic)
		networkToManager := make(chan string)

		triggerMithril := make(chan struct{})

		go func(){
			reverseNetworks := map[string]t.NetworkMagic{}
			for a, b := range networks { reverseNetworks[b] = a }
			for name := range networkFromUI {
				networkToManager <- name
				networkToHttp <- reverseNetworks[name]
			}
		}()

		go func(){
			for ss := range serviceUpdateFromManager {
				serviceUpdateToUI <- ss
				serviceUpdateToHttp <- ss
			}
		}()

		serviceUpdateFromManager <- t.ServiceStatus {
			ServiceName: "lace-blockchain-services",
			Status: "listening",
			Progress: -1,
			TaskSize: -1,
			SecondsLeft: -1,
			Url: fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort),
			Version: constants.LaceBlockchainServicesVersion,
			Revision: constants.LaceBlockchainServicesRevision,
		}

		initiateShutdownCh := make(chan struct{}, 16)

		return ui.CommChannels {
			ServiceUpdate: serviceUpdateToUI,
			BlockRestartUI: blockRestartUI,
			HttpSwitchesNetwork: networkFromHttp,
			NetworkSwitch: networkFromUI,
			InitiateShutdownCh: initiateShutdownCh,
			TriggerMithril: triggerMithril,
		}, CommChannels_Manager {
			ServiceUpdate: serviceUpdateFromManager,
			BlockRestartUI: blockRestartUI,
			NetworkSwitch: networkToManager,
			InitiateShutdownCh: initiateShutdownCh,
			TriggerMithril: triggerMithril,
		}, httpapi.CommChannels {
			SwitchNetwork: networkFromHttp,
			SwitchedNetwork: networkToHttp,
			ServiceUpdate: serviceUpdateToHttp,
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

	go func(){ for {
		err := httpapi.Run(appConfig, commHttp, networks)
		fmt.Fprintf(os.Stderr, "%s[%d]: HTTP server failed: %v\n",
			OurLogPrefix, os.Getpid(), err)
		time.Sleep(1 * time.Second)
	}}()

	mithrilCachePort := -1
	if (appConfig.ForceMithrilSnapshot.Preview.Digest != ""	||
		appConfig.ForceMithrilSnapshot.Preprod.Digest != ""	||
		appConfig.ForceMithrilSnapshot.Mainnet.Digest != "") {
		mithrilCachePort = getFreeTCPPort()
		go func(){ for {
			err := mithrilcache.Run(appConfig, mithrilCachePort)
			fmt.Fprintf(os.Stderr, "%s[%d]: mithril-cache HTTP server failed: %v\n",
				OurLogPrefix, os.Getpid(), err)
			time.Sleep(1 * time.Second)
		}}()
	}

	// Both macOS and Windows require that UI happens on the main thread:
	var wgManager sync.WaitGroup
	wgManager.Add(1)
	go func() {
		defer systray.Quit()
		defer wgManager.Done()
		manageChildren(commManager, appConfig, mithrilCachePort)
	}()

	systray.Run(ui.SetupTray(commUI, logFile, networks, appConfig), func(){
		// It’s possible that this callback is called from macOS “Quit” even from the Dock area
		// (we’re briefly shown there while dialogs are displayed) – let’s (re)initiate a clean shutdown:
		commUI.InitiateShutdownCh <- struct{}{}

		wgManager.Wait()
		fmt.Printf("%s[%d]: all good, exiting\n", OurLogPrefix, os.Getpid())
	})
}

type CommChannels_Manager struct {
	ServiceUpdate        chan<- t.ServiceStatus
	BlockRestartUI       chan<- bool

	NetworkSwitch        <-chan string
	InitiateShutdownCh   <-chan struct{}
	TriggerMithril       <-chan struct{}
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

// A map from network magic to name
func readAvailableNetworks() (map[t.NetworkMagic]string, error) {
	rv := map[t.NetworkMagic]string{}
	sep := string(filepath.Separator)
	names, err := readDirAsStrings(ourpaths.NetworkConfigDir)
	if err != nil { return nil, err }
	for _, name := range names {
		configFile := ourpaths.NetworkConfigDir + sep + name + sep + "cardano-node" + sep + "config.json"

		configBytes, err := ioutil.ReadFile(configFile)
		var config map[string]interface{}
		err = json.Unmarshal(configBytes, &config)
		if err != nil { return nil, err }

		byronFile := config["ByronGenesisFile"].(string)
		if !filepath.IsAbs(byronFile) {
			byronFile = filepath.Join(filepath.Dir(configFile), byronFile)
		}

		byronBytes, err := ioutil.ReadFile(byronFile)
		var byron map[string]interface{}
		err = json.Unmarshal(byronBytes, &byron)
		if err != nil { return nil, err }

		magic := t.NetworkMagic(int(
			byron["protocolConsts"].(map[string]interface{})["protocolMagic"].(float64)))

		rv[magic] = name
	}
	return rv, nil
}

func readDirAsStrings(dirPath string) ([]string, error) {
	files, err := ioutil.ReadDir(dirPath)
	if err != nil { return nil, err }
	rv := []string{}
	for _, file := range files {
		name := file.Name()
		if name == "." || name == ".." {
			continue
		}
		rv = append(rv, name)
	}
	return rv, nil
}
