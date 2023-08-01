package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/sqweek/dialog"

	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/mainthread"
)

func childMithril(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	extraEnv := map[string][]string {
		"preview": []string{
			"NETWORK=preview",
			"AGGREGATOR_ENDPOINT=https://aggregator.pre-release-preview.api.mithril.network/aggregator",
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKPreview,
		},
		"preprod": []string{
			"NETWORK=preprod",
			"AGGREGATOR_ENDPOINT=https://aggregator.release-preprod.api.mithril.network/aggregator",
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKPreprod,
		},
		"mainnet": []string{
			"NETWORK=mainnet",
			"AGGREGATOR_ENDPOINT=https://aggregator.release-mainnet.api.mithril.network/aggregator",
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKMainnet,
		},
	}

	serviceName := "mithril-client"
	exePath := ourpaths.LibexecDir + sep + "mithril-client" + ourpaths.ExeSuffix
	snapshotsDir := ourpaths.WorkDir + sep + "mithril-snapshots"

	const SInitializing = "initializing"
	const SCheckingDisk = "checking local disk info"
	const SFetchingCert = "fetching cert info"
	const SVerifyingCert = "verifying cert chain"
	const SDownloading = "downloading"

	currentStatus := SInitializing

	// A mini-monster, we’ll be able to get rid of it once Mithril provides more machine-readable output:
	reProgress := regexp.MustCompile(
		`^.\s\[[0-9:]+\]\s+\[[#>-]+\]\s+([0-9]*\.[0-9]+)\s+([A-Za-z]*B)/([0-9]*\.[0-9]+)\s+([A-Za-z]*B)\s+\(([0-9]*\.[0-9]+)([A-Za-z]+)\)$`)

	unitToBytes := func(unit string) int64 {
		switch unit {
		case "B": return 1
		case "KiB": return 1024
		case "MiB": return 1024*1024
		case "GiB": return 1024*1024*1024
		case "TiB": return 1024*1024*1024*1024
		case "PiB": return 1024*1024*1024*1024*1024
		default: return -1  // signal that something’s off
		}
	}

	unitToSeconds := func(unit string) int64 {
		switch unit {
		case "s": return 1
		case "m": return 60
		case "h": return 60*60
		case "d": return 60*60*24
		default: return -1  // signal that something’s off
		}
	}

	return ManagedChild{
		ServiceName: serviceName,
		ExePath: exePath,
		Version: constants.MithrilClientVersion,
		Revision: constants.MithrilClientRevision,
		MkArgv: func() ([]string, error) {
			stdout, stderr, err, pid := runCommandWithTimeout(
				exePath,
				[]string{"snapshot", "list", "--json"},
				extraEnv[shared.Network],
				10 * time.Second,
			)

			if err != nil {
				fmt.Printf("%s[%d]: fetching snapshots failed: %v (stderr: %v) (stdout: %v)\n",
					serviceName, pid, err, string(stdout), string(stderr))
				mainthread.Schedule(func() {
					dialog.Message("Fetching Mithril snapshots failed: %v." +
						"\n\nMore details in the log file.", err).
						Title("Mithril error").Error()
				})
				return nil, err  // restart in normal mode
			}

			var snapshots []map[string]interface{}
			err = json.Unmarshal(stdout, &snapshots)
			if err != nil { return nil, err }
			if len(snapshots) == 0 { return nil, fmt.Errorf("empty snapshot array") }
			snapshotRaw, ok := snapshots[0]["digest"]
			if !ok { return nil, fmt.Errorf("missing ‘digest’ in first snapshot") }
			snapshot, ok := snapshotRaw.(string)
			if !ok { return nil, fmt.Errorf("‘digest’ in first snapshot is not a string") }

			downloadDir := snapshotsDir + sep + snapshot
			err = os.MkdirAll(downloadDir, 0755)
			if err != nil { return nil, err }

			fmt.Printf("%s[%d]: will download snapshot %v to %v\n",
				serviceName, pid, snapshot, downloadDir)

			return []string{
				"snapshot",
				"download",
				snapshot,
				"--download-dir",
				downloadDir,
			}, nil
		},
		MkExtraEnv: func() []string {
			return extraEnv[shared.Network]
		},
		AllocatePTY: true,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			return HealthStatus {
				Initialized: true,
				DoRestart: false,
				NextProbeIn: 10 * time.Second,
				LastErr: nil,
			}
		},
		LogMonitor: func(line string) {
			if strings.Index(line, "1/7 - Checking local disk info") != -1 {
				currentStatus = SCheckingDisk
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "2/7 - Fetching the certificate's information") != -1 {
				currentStatus = SFetchingCert
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "3/7 - Verifying the certificate chain") != -1 {
				currentStatus = SVerifyingCert
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if strings.Index(line, "4/7 - Downloading the snapshot") != -1 {
				currentStatus = SDownloading
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1 }
			} else if currentStatus == SDownloading {
				if ms := reProgress.FindStringSubmatch(line); len(ms) > 0 {
					numDone, _ := strconv.ParseFloat(ms[1], 64)
					unitDone := ms[2]
					done := numDone * float64(unitToBytes(unitDone))

					numTotal, _ := strconv.ParseFloat(ms[3], 64)
					unitTotal := ms[4]
					total := math.Round(numTotal * float64(unitToBytes(unitTotal)))

					numTimeRemaining, _ := strconv.ParseFloat(ms[5], 64)
					unitTimeRemaining := ms[6]
					timeRemaining := numTimeRemaining * float64(unitToSeconds(unitTimeRemaining))

					statusCh <- StatusAndUrl { Status: SDownloading, Progress: done/total,
						TaskSize: total, SecondsLeft: timeRemaining }
				}
			}
		},
		LogModifier: func(line string) string {
			line = strings.TrimSpace(line)
			return line
		},
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 5 * time.Second,
	}
}

func runCommandWithTimeout(
	command string,
	args []string,
	extraEnv []string,
	timeout time.Duration,
) ([]byte, []byte, error, int) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, command, args...)

	// Against possible orphaned child processes during timeout, but so far Mithril doesn’t have them:
	cmd.WaitDelay =	1 * time.Second

	if len(extraEnv) > 0 {
		cmd.Env = append(os.Environ(), extraEnv...)
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

	err := cmd.Run()
	var rerr error

	if ctx.Err() == context.DeadlineExceeded {
		rerr = fmt.Errorf("timed out")
	} else if err != nil {
		rerr = fmt.Errorf("failed: %s", err)
	}

	return stdoutBuf.Bytes(), stderrBuf.Bytes(), rerr, cmd.Process.Pid
}
