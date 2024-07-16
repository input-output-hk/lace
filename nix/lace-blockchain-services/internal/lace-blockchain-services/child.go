package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"sync"
	"bufio"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	t "lace.io/lace-blockchain-services/types"
	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/appconfig"

	"github.com/creack/pty"
	"github.com/acarl005/stripansi"
)

type ManagedChild struct {
	ServiceName string
	ExePath     string
	Version     string
	Revision    string
	MkArgv      func() ([]string, error) // XXX: it’s a func to run `getFreeTCPPort()` at the very last moment
	MkExtraEnv  func() []string
	AllocatePTY bool
	StatusCh    chan<- StatusAndUrl
	HealthProbe func(HealthStatus) HealthStatus // the argument is the previous HealthStatus
	LogMonitor  func(string)
	LogModifier func(string) string // e.g. to drop redundant timestamps
	TerminateGracefullyByInheritedFd3 bool // <https://github.com/input-output-hk/cardano-node/issues/726>
	ForceKillAfter time.Duration // graceful exit timeout, after which we SIGKILL the child
	AfterExit   func() error
}

type StatusAndUrl struct {
	Status      string
	Progress    float64
	TaskSize    float64
	SecondsLeft float64
	Url         string
	OmitUrl     bool
}

type HealthStatus struct {
	Initialized bool          // whether to continue with launching other dependant processes
	DoRestart bool            // restart everything (even before it's considered initialized)
	NextProbeIn time.Duration // when to schedule the next HealthProbe
	LastErr error
}

type SharedState struct {
	Network string
	SyncProgress *float64  // XXX: we take that from Ogmios, we should probably calculate ourselves?
	CardanoNodeConfigDir string
	CardanoSubmitApiConfigDir string
	CardanoNodeSocket string
	CardanoSubmitApiPort *int
	OgmiosPort *int
	PostgresPort *int
	PostgresPassword *string
}

func manageChildren(comm CommChannels_Manager, appConfig appconfig.AppConfig) {
	sep := string(filepath.Separator)

	network := <-comm.NetworkSwitch

	runMithril := false

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

		if !runMithril {
			fmt.Printf("%s[%d]: starting session for network %s\n", OurLogPrefix, os.Getpid(), network)
		} else {
			fmt.Printf("%s[%d]: resyncing with Mithril for network %s\n", OurLogPrefix, os.Getpid(),
				network)
		}

		shared := SharedState{
			Network: network,
			SyncProgress: &[]float64{ -1.0 }[0],  // wat
			CardanoNodeConfigDir: ourpaths.NetworkConfigDir + sep + network + sep + "cardano-node",
			CardanoSubmitApiConfigDir: ourpaths.NetworkConfigDir + sep + network + sep + "cardano-submit-api",
			CardanoNodeSocket: ourpaths.WorkDir + sep + network + sep + "cardano-node.socket",
			CardanoSubmitApiPort: new(int),
			OgmiosPort: new(int),
			PostgresPort: new(int),
			PostgresPassword: new(string),
		}

		if (runtime.GOOS == "windows") {
			shared.CardanoNodeSocket = mkNewWindowsPipeName()
		}

		cardanoServicesAvailable := true
		if _, err := os.Stat(ourpaths.CardanoServicesDir); os.IsNotExist(err) {
			fmt.Printf("%s[%d]: warning: no cardano-services available, will run without them " +
				"(No such file or directory: %s)\n", OurLogPrefix, os.Getpid(),
				ourpaths.CardanoServicesDir)
			cardanoServicesAvailable = false
		}

		ogmiosSyncProgressCh := make(chan float64)
		defer close(ogmiosSyncProgressCh)

		usedChildren := []func(SharedState, chan<- StatusAndUrl)ManagedChild{}

		if !runMithril {
			usedChildren = append(usedChildren, childCardanoNode)
			usedChildren = append(usedChildren, childOgmios(ogmiosSyncProgressCh))
			usedChildren = append(usedChildren, childCardanoSubmitApi(appConfig))
			usedChildren = append(usedChildren, childPostgres)
			if cardanoServicesAvailable {
				usedChildren = append(usedChildren, childProviderServer)
				usedChildren = append(usedChildren, childProjector)
			}
		} else {
			usedChildren = append(usedChildren, childMithril)
			runMithril = false  // one-time thing (restart to regular mode – successfully or by force)
		}

		childrenDefs := []ManagedChild{}
		for _, mkChild := range usedChildren {
			statusCh := make(chan StatusAndUrl, 1)
			initialStatus := StatusAndUrl{
				Status: "off",
				Progress: -1,
				TaskSize: -1,
				SecondsLeft: -1,
				Url: "",
			}
			statusCh <- initialStatus
			def := mkChild(shared, statusCh)
			def.StatusCh = statusCh
			go func(){
				fullStatus := t.ServiceStatus {
					ServiceName: def.ServiceName,
					Status:      initialStatus.Status,
					Progress:    -1,
					Url:         initialStatus.Url,
					Version:     def.Version,
					Revision:    def.Revision,
				}
				for upd := range statusCh {
					// lessen refreshing, too often causes glitching tray UI on Windows
					if upd.Status != fullStatus.Status ||
						upd.Progress != fullStatus.Progress ||
						upd.TaskSize != fullStatus.TaskSize ||
						upd.SecondsLeft != fullStatus.SecondsLeft ||
						(!upd.OmitUrl && upd.Url != fullStatus.Url) {
						fullStatus.Status = upd.Status
						fullStatus.Progress = upd.Progress
						fullStatus.TaskSize = upd.TaskSize
						fullStatus.SecondsLeft = upd.SecondsLeft
						if !upd.OmitUrl {
							fullStatus.Url = upd.Url
						}
						comm.ServiceUpdate <- fullStatus
					}
				}
			}()
			childrenDefs = append(childrenDefs, def)
		}

		// We want to fake an update to cardano-node’s ServiceStatus as soon as Ogmios returns progress:
		go func(){
			var cardanoNodeStatusCh chan<- StatusAndUrl
			for _, child := range childrenDefs {
				if child.ServiceName == "cardano-node" {
					cardanoNodeStatusCh = child.StatusCh
					break
				}
			}
			for syncProgress := range ogmiosSyncProgressCh {
				*shared.SyncProgress = syncProgress
				textual := "syncing"
				if syncProgress == 1.0 { textual = "synced" }
				cardanoNodeStatusCh <- StatusAndUrl {
					Status: textual,
					Progress: syncProgress,
					TaskSize: -1,
					SecondsLeft: -1,
					OmitUrl: true,
				}
			}
		}()

		var wgChildren sync.WaitGroup

		defer func(networkMemo string) {
			if r := recover(); r != nil {
				fmt.Fprintf(os.Stderr, "%s[%d]: panic: %s\n", OurLogPrefix, os.Getpid(), r)
			}
			comm.BlockRestartUI <- true
			wgChildren.Wait()
			for _, child := range childrenDefs {
				// Reset all statuses to "off" (not all children might’ve been started
				// and they’re "waiting" now)
				child.StatusCh <- StatusAndUrl{
					Status: "off",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: "",
					OmitUrl: false,
				}
				close(child.StatusCh)
			}
			fmt.Printf("%s[%d]: session ended for network %s\n", OurLogPrefix, os.Getpid(), networkMemo)
		}("" + network)

		anyChildExitedCh := make(chan struct{}, len(childrenDefs))

		for childIdx, childUnsafe := range childrenDefs {
			child := childUnsafe // or else all interations will get the same ref (last child)

			childArgv, err := child.MkArgv()
			if err != nil {
				fmt.Printf("%s[%d]: failed to create argv for %s: %v\n", OurLogPrefix, os.Getpid(),
					child.ServiceName, err)
				return  // scrap everything and restart
			}

			wgChildren.Add(1)
			fmt.Printf("%s[%d]: starting %s...\n", OurLogPrefix, os.Getpid(), child.ServiceName)
			for _, dependant := range childrenDefs[(childIdx+1):] {
				dependant.StatusCh <- StatusAndUrl{
					Status: fmt.Sprintf("waiting for %s", child.ServiceName),
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: "",
					OmitUrl: true,
				}
			}
			child.StatusCh <- StatusAndUrl {
				Status: "starting…",
				Progress: -1,
				TaskSize: -1,
				SecondsLeft: -1,
				Url: "",
				OmitUrl: true,
			}
			outputLines := make(chan string)
			terminateCh := make(chan struct{}, 1)
			childDidExit := false
			childPid := 0

			childFun := childProcess
			if child.AllocatePTY {
				if runtime.GOOS == "windows" {
					childFun = childProcessPTYWindows
				} else {
					childFun = childProcessPTY
				}
			}

			go childFun(child.ExePath, childArgv, child.MkExtraEnv(),
				child.LogModifier, outputLines, terminateCh, &childPid,
				child.TerminateGracefullyByInheritedFd3,
				child.ForceKillAfter)
			defer func() {
				if !childDidExit {
					child.StatusCh <- StatusAndUrl {
						Status: "terminating…",
						Progress: -1,
						TaskSize: -1,
						SecondsLeft: -1,
						Url: "",
						OmitUrl: true,
					}
					terminateCh <- struct{}{}
				}
			}()
			initializedCh := make(chan struct{}, 1)

			// monitor output:
			go func() {
				for line := range outputLines {
					fmt.Printf("%s[%d]: %s\n", child.ServiceName, childPid, line)
					child.LogMonitor(line)
				}
				childDidExit = true
				fmt.Printf("%s[%d]: process ended: %s[%d]\n", OurLogPrefix, os.Getpid(),
					child.ServiceName, childPid)
				err := child.AfterExit()
				if err != nil {
					fmt.Printf("%s[%d]: AfterExit of %s[%d] returned an error: %v\n",
						OurLogPrefix, os.Getpid(), child.ServiceName, childPid, err)
				} else if child.ServiceName == "mithril-client" {
					// don’t wait after a successful Mithril resync
					omitSleep = true
				}
				child.StatusCh <- StatusAndUrl{
					Status: "off",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: "",
					OmitUrl: false,
				}
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
							OurLogPrefix, os.Getpid(), child.ServiceName, childPid)
						terminateCh <- struct{}{}
						return
					}
					next.Initialized = prev.Initialized || next.Initialized // remember true
					if !prev.Initialized && next.Initialized {
						fmt.Printf("%s[%d]: health probe reported %s[%d] as initialized\n",
							OurLogPrefix, os.Getpid(), child.ServiceName, childPid)
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
			case <-comm.TriggerMithril:
				runMithril = true
				omitSleep = true
				return
			case <-comm.InitiateShutdownCh:
				fmt.Printf("%s[%d]: initiating a graceful shutdown...\n", OurLogPrefix, os.Getpid())
				keepGoing = false
				return
			}
		}
	}()}
}

func childProcess(
	path string, argv []string, extraEnv []string,
	logModifier func(string) string, // e.g. to drop redundant timestamps
	outputLines chan<- string, terminate <-chan struct{}, pid *int,
	terminateGracefullyByInheritedFd3 bool,
	gracefulExitTimeout time.Duration,
) {
	defer close(outputLines)

	var terminationPipeReader *os.File
	var terminationPipeWriter *os.File
	if terminateGracefullyByInheritedFd3 {
		var err error
		terminationPipeReader, terminationPipeWriter, err = os.Pipe()
		if err != nil {
			outputLines <- fmt.Sprintf("fatal: %v", err)
			return
		}
	}

	var wgOuts sync.WaitGroup
	wgOuts.Add(2)

	cmd := exec.Command(path, argv...)

	setManagedChildSysProcAttr(cmd)

	if len(extraEnv) > 0 {
		cmd.Env = append(os.Environ(), extraEnv...)
	}

	// Starting a process with no stdin can confuse it:
	stdin, err := cmd.StdinPipe()
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	defer stdin.Close()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	go func() {
		defer wgOuts.Done()
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := logModifier(scanner.Text())
			if len(line) > 0 {
				outputLines <- line
			}
		}
	}()

	stderr, err := cmd.StderrPipe()
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	go func() {
		defer wgOuts.Done()
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := logModifier(scanner.Text())
			if len(line) > 0 {
				outputLines <- "[stderr] " + line
			}
		}
	}()

	if terminateGracefullyByInheritedFd3 {
		inheritExtraFiles(cmd, []*os.File{terminationPipeReader})
	}

	if err := cmd.Start(); err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}

	if terminateGracefullyByInheritedFd3 {
		terminationPipeReader.Close() // close child’s end in our process
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

	__internal__terminateGracefully(terminate, waitDone, gracefulExitTimeout, terminationPipeWriter,
		cmd.Path, cmd.Process, nil)
}

// XXX: don’t use this function outside of ‘childProcess’ and ‘childProcessPTY’
func __internal__terminateGracefully(
	terminate <-chan struct{},
	waitDone <-chan struct{},
	gracefulExitTimeout time.Duration,
	terminationPipeWriter *os.File,
	// XXX: we used to just pass `cmd`, but that doesn’t work with Windows PTY, so:
	cmd_Path string,
	cmd_Process *os.Process,
	gracefulExitOverride func(),
) {
	select {
	case <-terminate:
		if gracefulExitOverride != nil {
			gracefulExitOverride()
		} else if terminationPipeWriter != nil {
			fmt.Printf("%s[%d]: closing shutdown IPC pipe (fd %v) of %s[%d]\n",
				OurLogPrefix, os.Getpid(), terminationPipeWriter.Fd(),
				filepath.Base(cmd_Path), cmd_Process.Pid)
			terminationPipeWriter.Close()
		} else if runtime.GOOS == "windows" {
			fmt.Printf("%s[%d]: sending CTRL_BREAK_EVENT to %s[%d]\n",
				OurLogPrefix, os.Getpid(), filepath.Base(cmd_Path), cmd_Process.Pid)
			windowsSendCtrlBreak(cmd_Process.Pid)
		} else {
			fmt.Printf("%s[%d]: sending SIGTERM to %s[%d]\n",
				OurLogPrefix, os.Getpid(), filepath.Base(cmd_Path), cmd_Process.Pid)
			cmd_Process.Signal(syscall.SIGTERM)
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
				filepath.Base(cmd_Path), cmd_Process.Pid, gracefulExitTimeout)
			// In a rare event that it hangs, we cannot afford a deadlock here:
			go cmd_Process.Kill()
			<-waitDone
		case <-waitDone:
		}
	case <-waitDone:
	}
}

// XXX: this is only temporary, until Mithril doesn’t give us reliable machine-readable output
func childProcessPTY(
	path string, argv []string, extraEnv []string,
	logModifier func(string) string, // e.g. to drop redundant timestamps
	outputLines chan<- string, terminate <-chan struct{}, pid *int,
	terminateGracefullyByInheritedFd3 bool,
	gracefulExitTimeout time.Duration,
) {
	defer close(outputLines)

	if terminateGracefullyByInheritedFd3 {
		outputLines <- "fatal: terminateGracefullyByInheritedFd3 not compatible with PTY (yet?)"
		return
	}

	cmd := exec.Command(path, argv...)

	setManagedChildSysProcAttr(cmd)

	if len(extraEnv) > 0 {
		cmd.Env = append(os.Environ(), extraEnv...)
	}

	ws := pty.Winsize{
		Rows: 25,
		Cols: 80,
		X: 25 * 20,
		Y: 80 * 30,
	}

	ptyFile, err := pty.StartWithSize(cmd, &ws)
	if err != nil {
		outputLines <- fmt.Sprintf("fatal: %s", err)
		return
	}
	defer ptyFile.Close()
	defer cmd.Wait()

	waitDone := make(chan struct{})

	if (pid != nil) {
		*pid = cmd.Process.Pid
	}

	go func() {
		defer func(){
			waitDone <- struct{}{}
		}()
		buf := make([]byte, 1024)
		for {
			num, err := ptyFile.Read(buf)
			if err != nil {	return }

			lines := string(buf[:num])
			lines = stripansi.Strip(lines)
			lines = strings.ReplaceAll(lines, string(rune(0x07)), "")  // remove bells

			// XXX: it’s possible that 2+ TTY updates will be clumped together in a single ‘read’, so:
			for _, line := range strings.FieldsFunc(lines, func(c rune) bool {
				return (c == '\n' || c == '\r' || c == rune(0x08))  // 0x08 for Windows
			}) {
				if len(line) > 0 {
					line = logModifier(line)
					if len(line) > 0 {
						outputLines <- line
					}
				}
			}
		}
	}()

	__internal__terminateGracefully(terminate, waitDone, gracefulExitTimeout, nil, cmd.Path, cmd.Process, nil)
}
