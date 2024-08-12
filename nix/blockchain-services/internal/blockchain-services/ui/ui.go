package ui

import (
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"bytes"
	"strconv"

	t "lace.io/blockchain-services/types"
	"lace.io/blockchain-services/ourpaths" // has to be imported before clipboard.init()
	"lace.io/blockchain-services/assets"
	"lace.io/blockchain-services/appconfig"
	"lace.io/blockchain-services/mainthread"

	"github.com/getlantern/systray"
	"github.com/atotto/clipboard"
	"github.com/sqweek/dialog"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type CommChannels struct {
	ServiceUpdate        <-chan t.ServiceStatus
	BlockRestartUI       <-chan bool
	HttpSwitchesNetwork  <-chan t.NetworkMagic

	NetworkSwitch        chan<- string
	InitiateShutdownCh   chan<- struct{}
	TriggerMithril       chan<- struct{}
}

func SetupTray(
	comm CommChannels,
	logFile string,
	networks map[t.NetworkMagic]string,
	appConfig appconfig.AppConfig,
) func() { return func() {
	iconData, err := assets.Asset("tray-icon")
	if err != nil {
	    panic(err)
	}
	systray.SetTemplateIcon(iconData, iconData)

	mChooseNetwork := systray.AddMenuItem("Network", "")

	mNetworks := make(map[string](*systray.MenuItem))
	currentNetwork := ""
	{
		reverseNetworks := map[string]t.NetworkMagic{}
		sortedNames := []string{}
		for a, b := range networks { reverseNetworks[b] = a; sortedNames = append(sortedNames, b) }
		sort.Strings(sortedNames)
		for _, network := range sortedNames {
			mNetworks[network] = mChooseNetwork.AddSubMenuItemCheckbox(network, "", false)
		}
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
					appconfig.Save(appConfig)
					comm.NetworkSwitch <- network
				}
			}
		}(network)
	}

	if _, cfgNetExists := mNetworks[appConfig.LastNetwork]; !cfgNetExists {
		appConfig.LastNetwork = networks[0]
		appconfig.Save(appConfig)
	}

	mNetworks[appConfig.LastNetwork].ClickedCh <- struct{}{}

	go func() {
		for httpMagic := range comm.HttpSwitchesNetwork {
			mNetworks[networks[httpMagic]].ClickedCh <- struct{}{}
		}
	}()

	// FIXME: this has to be done smarter
	chMithrilStatus := make(chan t.ServiceStatus)
	fixme_CardanoNodeStatus := make(chan string)
	fixme_CardanoSubmitApiStatus := make(chan string)
	fixme_OgmiosStatus := make(chan string)
	fixme_PostgresStatus := make(chan string)
	fixme_SetOgmiosDashboard := make(chan string)
	fixme_SetCardanoSubmitApiUrl := make(chan string)
	fixme_ProviderServerStatus := make(chan string)
	fixme_ProjectorStatus := make(chan string)

	go func(){
		for upd := range comm.ServiceUpdate {
			formatted := upd.Status
			if upd.Progress >= 0 && upd.Progress <= 1 {
				formatted += fmt.Sprintf(" · %0.2f%%", upd.Progress * 100)
			} else if upd.Progress >= 0 {
				formatted += fmt.Sprintf(" · %0.0f", upd.Progress)
			}
			switch upd.ServiceName {
			case "cardano-node":
				fixme_CardanoNodeStatus <- formatted
			case "cardano-submit-api":
				fixme_CardanoSubmitApiStatus <- formatted
				fixme_SetCardanoSubmitApiUrl <- upd.Url
			case "ogmios":
				fixme_OgmiosStatus <- formatted
				fixme_SetOgmiosDashboard <- upd.Url
			case "postgres":
				fixme_PostgresStatus <- formatted
			case "provider-server":
				fixme_ProviderServerStatus <- formatted
			case "projector":
				fixme_ProjectorStatus <- formatted
			case "mithril-client":
				chMithrilStatus <- upd
			}
		}
	}()

	//systray.AddMenuItemCheckbox("Run Full Backend (projector)", "", false)

	mCopyUrl := systray.AddMenuItem("Copy Backend URL", "")
	go func() {
		for range mCopyUrl.ClickedCh {
			url := fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort)
			err := clipboard.WriteAll(url)
			if err != nil {
				fmt.Printf("%s[%d]: error: failed to copy '%s' to clipboard: %s\n",
					OurLogPrefix, os.Getpid(), url, err)
			}
		}
	}()

	mCopyCardanoSubmitApiUrl := systray.AddMenuItem("Copy Cardano Submit API URL", "")
	go func() {
		url := ""
		mCopyCardanoSubmitApiUrl.Disable()
		for { select {
		case <-mCopyCardanoSubmitApiUrl.ClickedCh:
			err := clipboard.WriteAll(url)
			if err != nil {
				fmt.Printf("%s[%d]: error: failed to copy '%s' to clipboard: %s\n",
					OurLogPrefix, os.Getpid(), url, err)
			}
		case url = <-fixme_SetCardanoSubmitApiUrl:
			if url == "" {
				mCopyCardanoSubmitApiUrl.Disable()
			} else {
				mCopyCardanoSubmitApiUrl.Enable()
			}
		}}
	}()

	systray.AddSeparator()

	// XXX: this weird type because we want order, and there are no tuples:
	statuses := []map[string](<-chan string) {
		{ "cardano-node":       fixme_CardanoNodeStatus },
		{ "ogmios":             fixme_OgmiosStatus },
		{ "cardano-submit-api": fixme_CardanoSubmitApiStatus },
		{ "postgres":           fixme_PostgresStatus },
		{ "provider-server":    fixme_ProviderServerStatus },
		{ "projector":          fixme_ProjectorStatus },
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

	mMithrilStatus := systray.AddMenuItem("", "")
	mMithrilStatusETA := mMithrilStatus.AddSubMenuItem("", "")
	mMithrilStatusDledSize := mMithrilStatus.AddSubMenuItem("", "")
	mMithrilStatusTotalSize := mMithrilStatus.AddSubMenuItem("", "")

	mMithrilExplorer := mMithrilStatus.AddSubMenuItem("Mithril Explorer", "")
	mithrilExplorerUrl := ""
	go func() {
		for range mMithrilExplorer.ClickedCh {
			if mithrilExplorerUrl != "" {
				openWithDefaultApp(mithrilExplorerUrl)
			}
		}
	}()

	mMithrilStatusETA.Disable()
	mMithrilStatusDledSize.Disable()
	mMithrilStatusTotalSize.Disable()
	mMithrilStatus.Hide()

	go func(){
		for upd := range chMithrilStatus {
			mithrilExplorerUrl = upd.Url

			if upd.Status == "off" {
				mainthread.Schedule(mMithrilStatus.Hide)
			} else {
				mainthread.Schedule(mMithrilStatus.Show)
			}

			formatted := upd.Status
			if upd.Progress >= 0 && upd.Progress <= 1 {
				formatted += fmt.Sprintf(" · %0.2f%%", upd.Progress * 100)
			}
			mMithrilStatus.SetTitle("mithril · " + formatted)

			eta := "—"
			if upd.SecondsLeft >= 0 { eta = "in " + secondsToHuman(upd.SecondsLeft) }
			mMithrilStatusETA.SetTitle("ETA: " + eta)

			downloaded := "—                 "  // extra spaces to accomodate future value in UI
			if upd.Progress >= 0 && upd.TaskSize >= 0 {
				downloaded = bytesToHuman(upd.Progress * upd.TaskSize)
			}
			mMithrilStatusDledSize.SetTitle("Downloaded: " + downloaded)

			total := "—"
			if upd.TaskSize >= 0 { total = bytesToHuman(upd.TaskSize) }
			mMithrilStatusTotalSize.SetTitle("Total: " + total)
		}
	}()

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

	systray.AddSeparator()

	mSwaggerUI := systray.AddMenuItem("OpenAPI Specification v3.0", "")
	go func() {
		for range mSwaggerUI.ClickedCh {
			url := fmt.Sprintf("http://127.0.0.1:%d/swagger-ui/", appConfig.ApiPort)
			openWithDefaultApp(url)
		}
	}()

	mDashboard := systray.AddMenuItem("Dashboard", "")
	go func() {
		for range mDashboard.ClickedCh {
			url := fmt.Sprintf("http://127.0.0.1:%d/dashboard/", appConfig.ApiPort)
			openWithDefaultApp(url)
		}
	}()

	mOgmiosDashboard := systray.AddMenuItem("Ogmios Dashboard", "")
	go func() {
		url := ""
		mOgmiosDashboard.Disable()
		for { select {
		case <-mOgmiosDashboard.ClickedCh:
			openWithDefaultApp(url)
		case url = <-fixme_SetOgmiosDashboard:
			if url == "" {
				mOgmiosDashboard.Disable()
			} else {
				mOgmiosDashboard.Enable()
			}
		}}
	}()

	systray.AddSeparator()

	mResyncMithril := systray.AddMenuItem("Resync with Mithril", "")
	go func() {
		// Calculate these? How?
		eta := map[string](string) {
			"preview": "about 5 minutes",
			"preprod": "about 5 minutes",
			"mainnet": "about 2 hours",
		}
		_ = eta
		for range mResyncMithril.ClickedCh {
			fmt.Printf("%s[%d]: info: Mithril from goroutine %v\n",
				OurLogPrefix, os.Getpid(), goid())

			mainthread.Schedule(func() {
				fmt.Printf("%s[%d]: info: Mithril from goroutine %v\n",
					OurLogPrefix, os.Getpid(), goid())
				BringAppToForeground()
				ans := dialog.Message(
					"Resync the entire blockchain from scratch with Mithril?\n\n" +
					"This will delete your current cardano-node DB.\n\n" +
					"Estimated time: %s.",
					eta[currentNetwork]).Title("Resync with Mithril?").YesNo()
				if ans {
					comm.TriggerMithril <- struct{}{}
				}
			})
		}
	}()

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

func goid() int {
	buf := make([]byte, 32)
	n := runtime.Stack(buf, false)
	buf = buf[:n]
	buf, ok := bytes.CutPrefix(buf, []byte("goroutine "))
	if !ok { return -1 }
	i := bytes.IndexByte(buf, ' ')
	if i < 0 { return -1 }
	rv, err := strconv.Atoi(string(buf[:i]))
	if err != nil { return -1 }
	return rv
}

func bytesToHuman(bytes float64) string {
	if bytes > 1024*1024*1024 { return fmt.Sprintf("%.2f GiB", bytes / (1024*1024*1024)) }
	if bytes > 1024*1024      { return fmt.Sprintf("%.2f MiB", bytes / (1024*1024)) }
	if bytes > 1024           { return fmt.Sprintf("%.2f KiB", bytes / (1024)) }
	return fmt.Sprintf("%.0f B", bytes)
}

func secondsToHuman(seconds float64) string {
	if seconds > 24*60*60 {
		days := math.Floor(seconds / (24*60*60))
		return fmt.Sprintf("%.0fd %s", days, secondsToHuman(seconds - days * (24*60*60)))
	}
	if seconds > 60*60 {
		hours := math.Floor(seconds / (60*60))
		return fmt.Sprintf("%.0fh %s", hours, secondsToHuman(seconds - hours * (60*60)))
	}
	if seconds > 60 {
		minutes := math.Floor(seconds / (60))
		return fmt.Sprintf("%.0fm %s", minutes, secondsToHuman(seconds - minutes * (60)))
	}
	return fmt.Sprintf("%.0fs", seconds)
}
