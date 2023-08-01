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
	"time"

	"lace.io/lace-blockchain-services/ourpaths"
)

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
	AfterExit   func()
	TerminateGracefullyByInheritedFd3 bool // <https://github.com/input-output-hk/cardano-node/issues/726>
	ForceKillAfter time.Duration // graceful exit timeout, after which we SIGKILL the child
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
	CardanoNodeSocket string
	OgmiosPort *int
}

func manageChildren(comm CommChannels_Manager) {
	sep := string(filepath.Separator)

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

		shared := SharedState{
			Network: network,
			SyncProgress: &[]float64{ -1.0 }[0],  // wat
			CardanoNodeConfigDir: ourpaths.NetworkConfigDir + sep + network,
			CardanoNodeSocket: ourpaths.WorkDir + sep + network + sep + "cardano-node.socket",
			OgmiosPort: new(int),
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

		childrenDefs := []ManagedChild{
			childCardanoNode(shared, comm.CardanoNodeStatus),
			childOgmios(shared, comm.OgmiosStatus, comm.SetOgmiosDashboard),
		}

		if cardanoServicesAvailable {
			childrenDefs = append(childrenDefs,
				childProviderServer(shared, comm.ProviderServerStatus, comm.SetBackendUrl))
		}

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
				child.LogModifier, outputLines, terminateCh, &childPid,
				child.TerminateGracefullyByInheritedFd3,
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
					child.LogMonitor(line)
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
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			outputLines <- logModifier(scanner.Text())
		}
		wgOuts.Done()
	}()

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

	select {
	case <-terminate:
		if terminateGracefullyByInheritedFd3 {
			fmt.Printf("%s[%d]: closing shutdown IPC pipe (fd %v) of %s[%d]\n",
				OurLogPrefix, os.Getpid(), terminationPipeWriter.Fd(),
				filepath.Base(path), cmd.Process.Pid)
			terminationPipeWriter.Close()
		} else if runtime.GOOS == "windows" {
			fmt.Printf("%s[%d]: sending CTRL_BREAK_EVENT to %s[%d]\n",
				OurLogPrefix, os.Getpid(), filepath.Base(path), cmd.Process.Pid)
			windowsSendCtrlBreak(cmd.Process.Pid)
		} else {
			fmt.Printf("%s[%d]: sending SIGTERM to %s[%d]\n",
				OurLogPrefix, os.Getpid(), filepath.Base(path), cmd.Process.Pid)
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
