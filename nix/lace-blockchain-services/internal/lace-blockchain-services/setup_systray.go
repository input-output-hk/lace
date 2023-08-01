package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	_ "lace.io/lace-blockchain-services/ourpaths" // has to be imported before clipboard.init()

	"github.com/getlantern/systray"
	"github.com/atotto/clipboard"
)

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
