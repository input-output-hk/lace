package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
	"strconv"
	"strings"
	"regexp"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/constants"

	"github.com/acarl005/stripansi"
)

func childCardanoNode(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

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

	reValidatingChunk := regexp.MustCompile(
		`^.*ChainDB:Info.*Validating chunk no. \d+ out of \d+\. Progress: (\d*\.\d+)%$`)
	reReplayingLedger := regexp.MustCompile(
		`^.*ChainDB:Info.*Replayed block: slot \d+ out of \d+\. Progress: (\d*\.\d+)%$`)
	rePushingLedger := regexp.MustCompile(
		`^.*ChainDB:Info.*Pushing ledger state for block [0-9a-f]+ at slot \d+. Progress: (\d*\.\d+)%$`)
	reSyncingInit := regexp.MustCompile(
		`^.*ChainDB:Info.*Opened db with immutable tip at [0-9a-f]+ at slot \d+ and tip [0-9a-f]+ at slot (\d+)$`)
	reSyncing := regexp.MustCompile(
		`^.*ChainDB:Notice.*Chain extended, new tip: [0-9a-f]+ at slot (\d+)$`)

	return ManagedChild{
		ServiceName: "cardano-node",
		ExePath: ourpaths.LibexecDir + sep + "cardano-node" + sep + "cardano-node" + ourpaths.ExeSuffix,
		Version: constants.CardanoNodeVersion,
		Revision: constants.CardanoNodeRevision,
		MkArgv: func() ([]string, error) {
			return []string {
				"run",
				"--topology", shared.CardanoNodeConfigDir + sep + "topology.json",
				"--database-path", ourpaths.WorkDir + sep + shared.Network + sep +
					"chain",
				"--port", fmt.Sprintf("%d", getFreeTCPPort()),
				"--host-addr", "0.0.0.0",
				"--config", shared.CardanoNodeConfigDir + sep + "config.json",
				"--socket-path", shared.CardanoNodeSocket,
				"--shutdown-ipc=3",
			}, nil
		},
		MkExtraEnv: func() []string { return []string{} },
		PostStart: func() error { return nil },
		AllocatePTY: false,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			tmout := 1 * time.Second
			var err error
			if runtime.GOOS == "windows" {
				err = probeWindowsNamedPipe(shared.CardanoNodeSocket, tmout)
			} else {
				err = probeUnixSocket(shared.CardanoNodeSocket, tmout)
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
		LogMonitor: func(line string) {
			reportSyncing := func(slotNum string){
				pr, _ := strconv.ParseFloat(slotNum, 64)  // fallback
				if (*shared.SyncProgress >= 0) {
					pr = *shared.SyncProgress
				}
				textual := "syncing"
				if (*shared.SyncProgress == 1.0) {
					textual = "synced"
				}
				statusCh <- StatusAndUrl { Status: textual, Progress: pr,
					TaskSize: -1, SecondsLeft: -1 }
			}

			if ms := reValidatingChunk.FindStringSubmatch(line); len(ms) > 0 {
				pr, _ := strconv.ParseFloat(ms[1], 64)
				statusCh <- StatusAndUrl { Status: "validating chunks", Progress: pr/100,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "Started opening Volatile DB") != -1 {
				statusCh <- StatusAndUrl { Status: "opening volatile DB", Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "Started opening Ledger DB") != -1 {
				statusCh <- StatusAndUrl { Status: "opening ledger DB", Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if ms :=reReplayingLedger.FindStringSubmatch(line);len(ms)>0 {
				pr, _ := strconv.ParseFloat(ms[1], 64)
				statusCh <- StatusAndUrl { Status: "replaying ledger", Progress: pr/100,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "Opened lgr db") != -1 {
				statusCh <- StatusAndUrl { Status: "replaying ledger", Progress: 1.0,
					TaskSize: -1, SecondsLeft: -1 }
			} else if ms := rePushingLedger.FindStringSubmatch(line); len(ms)>0 {
				pr, _ := strconv.ParseFloat(ms[1], 64)
				statusCh <- StatusAndUrl { Status: "pushing ledger", Progress: pr/100,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "Initial chain selected") != -1 {
				statusCh <- StatusAndUrl { Status: "syncing", Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if ms := reSyncingInit.FindStringSubmatch(line); len(ms) > 0 {
				reportSyncing(ms[1])
			} else if ms := reSyncing.FindStringSubmatch(line); len(ms) > 0 {
				reportSyncing(ms[1])
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
		TerminateGracefullyByInheritedFd3: true,
		ForceKillAfter: 10 * time.Second,
		PostStop: func() error { return nil },
	}
}
