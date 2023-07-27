package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
	"strings"
	"regexp"

	"lace.io/lace-blockchain-services/ourpaths"

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
		`^.*ChainDB:Info.*Validating chunk no. \d+ out of \d+\. Progress: (\d*\.\d+%)$`)
	reReplayingLedger := regexp.MustCompile(
		`^.*ChainDB:Info.*Replayed block: slot \d+ out of \d+\. Progress: (\d*\.\d+%)$`)
	rePushingLedger := regexp.MustCompile(
		`^.*ChainDB:Info.*Pushing ledger state for block [0-9a-f]+ at slot \d+. Progress: (\d*\.\d+%)$`)
	reSyncing := regexp.MustCompile(
		`^.*ChainDB:Notice.*Chain extended, new tip: [0-9a-f]+ at slot (\d+)$`)

	return ManagedChild{
		LogPrefix: "cardano-node",
		PrettyName: "cardano-node",
		ExePath: ourpaths.LibexecDir + sep + "cardano-node" + ourpaths.ExeSuffix,
		Version: "0.0.0",
		Revision: "0000000000000000000000000000000000000000",
		MkArgv: func() []string {
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
			}
		},
		MkExtraEnv: func() []string { return []string{} },
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
			if ms := reValidatingChunk.FindStringSubmatch(line); len(ms) > 0 {
				statusCh <- StatusAndUrl { Status: "validating chunks · " + ms[1] }
			} else if strings.Index(line, "Started opening Volatile DB") != -1 {
				statusCh <- StatusAndUrl { Status: "opening volatile DB…" }
			} else if strings.Index(line, "Started opening Ledger DB") != -1 {
				statusCh <- StatusAndUrl { Status: "opening ledger DB…" }
			} else if ms :=reReplayingLedger.FindStringSubmatch(line);len(ms)>0 {
				statusCh <- StatusAndUrl { Status: "replaying ledger · " + ms[1] }
			} else if strings.Index(line, "Opened lgr db") != -1 {
				statusCh <- StatusAndUrl { Status: "replaying ledger · 100.00%" }
			} else if ms := rePushingLedger.FindStringSubmatch(line); len(ms)>0 {
				statusCh <- StatusAndUrl { Status: "pushing ledger · " + ms[1] }
			} else if ms := reSyncing.FindStringSubmatch(line); len(ms) > 0 {
				sp := ms[1] // fallback
				if (*shared.SyncProgress >= 0) {
					sp = fmt.Sprintf("%.2f%%", *shared.SyncProgress * 100.0)
				}
				textual := "syncing"
				if (*shared.SyncProgress == 1.0) {
					textual = "synced"
				}
				statusCh <- StatusAndUrl { Status: textual + " · " + sp }
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
	}
}
