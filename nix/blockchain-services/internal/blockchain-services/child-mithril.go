package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/sqweek/dialog"

	"lace.io/blockchain-services/appconfig"
	"lace.io/blockchain-services/constants"
	"lace.io/blockchain-services/ourpaths"
	"lace.io/blockchain-services/mainthread"
	"lace.io/blockchain-services/ui"
)

func childMithril(appConfig appconfig.AppConfig) func(SharedState, chan<- StatusAndUrl) ManagedChild { return func(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	var upstream = map[string]string{
		"preview": "https://aggregator.pre-release-preview.api.mithril.network/aggregator",
		"preprod": "https://aggregator.release-preprod.api.mithril.network/aggregator",
		"mainnet": "https://aggregator.release-mainnet.api.mithril.network/aggregator",
	}

	if appConfig.ForceMithrilSnapshot.Preview.Digest != "" { upstream["preview"] = fmt.Sprintf("http://127.0.0.1:%d/preview", shared.MithrilCachePort) }
	if appConfig.ForceMithrilSnapshot.Preprod.Digest != "" { upstream["preprod"] = fmt.Sprintf("http://127.0.0.1:%d/preprod", shared.MithrilCachePort) }
	if appConfig.ForceMithrilSnapshot.Mainnet.Digest != "" { upstream["mainnet"] = fmt.Sprintf("http://127.0.0.1:%d/mainnet", shared.MithrilCachePort) }

	extraEnv := map[string][]string {
		"preview": []string{
			"NETWORK=preview",
			"AGGREGATOR_ENDPOINT=" + upstream["preview"],
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKPreview,
		},
		"preprod": []string{
			"NETWORK=preprod",
			"AGGREGATOR_ENDPOINT=" + upstream["preprod"],
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKPreprod,
		},
		"mainnet": []string{
			"NETWORK=mainnet",
			"AGGREGATOR_ENDPOINT=" + upstream["mainnet"],
			"GENESIS_VERIFICATION_KEY=" + constants.MithrilGVKMainnet,
		},
	}

	serviceName := "mithril-client"
	exePath := ourpaths.LibexecDir + sep + "mithril-client" + sep + "mithril-client" + ourpaths.ExeSuffix
	snapshotsDir := ourpaths.WorkDir + sep + "mithril-snapshots"
	downloadDir := ""  // set later
	unpackDir := ""  // set later

	const SInitializing = "initializing"
	const SCheckingDisk = "checking local disk info"
	const SCertificates = "fetching & verifying cert info"
	const SDownloadingUnpacking = "downloading & unpacking"
	const SDigest = "computing digest"
	const SVerifyingSignature = "verifying signature"
	const SGoodSignature = "good signature"
	const SMovingDB = "moving DB"
	const SFinished = "finished"

	currentStatus := SInitializing

	// For debouncing:
	downloadProgressLastEmitted := time.Now()

	explorerUrl := ""
	for _, envVar := range extraEnv[shared.Network] {
		varName := "AGGREGATOR_ENDPOINT="
		if strings.HasPrefix(envVar, varName) {
			// Note: this should somehow point to the snapshot, but they don’t support that yet?
			explorerUrl = "https://mithril.network/explorer?" +
				url.QueryEscape(strings.Replace(envVar, varName, "aggregator=", 1))
			break
		}
	}

	// A mini-monster, we’ll be able to get rid of it once Mithril provides more machine-readable output:
	reProgress := regexp.MustCompile(
		`^\[[0-9:]+\]\s+\[[#>-]+\]\s+([0-9]*\.[0-9]+)\s+([A-Za-z]*B)/([0-9]*\.[0-9]+)\s+([A-Za-z]*B)\s+\(([0-9]*\.[0-9]+)([A-Za-z]+)\)$`)

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
				[]string{"cardano-db", "snapshot", "list", "--json"},
				extraEnv[shared.Network],
				10 * time.Second,
				nil,
			)

			if err != nil {
				fmt.Printf("%s[%d]: fetching snapshots failed: %v (stderr: %v) (stdout: %v)\n",
					serviceName, pid, err, string(stdout), string(stderr))
				mainthread.Schedule(func() {
					ui.BringAppToForeground()
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

			downloadDir = snapshotsDir + sep + shared.Network + sep + snapshot
			err = os.MkdirAll(downloadDir, 0755)
			if err != nil { return nil, err }

			unpackDir = downloadDir + sep + "db"

			// XXX: it’s possible that the unpack directory already exists from a previous run;
			// XXX: then Mithril errors out, so let’s delete it:
			if _, err := os.Stat(unpackDir); !os.IsNotExist(err) {
				if err := os.RemoveAll(unpackDir); err != nil {
					return nil, err
				}
			}

			fmt.Printf("%s[%d]: will download snapshot %v to %v\n",
				serviceName, pid, snapshot, downloadDir)

			return []string{
				"cardano-db",
				"download",
				snapshot,
				"--download-dir",
				downloadDir,
			}, nil
		},
		MkExtraEnv: func() []string {
			return extraEnv[shared.Network]
		},
		PostStart: func() error { return nil },
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
			// XXX: we use the early return pattern here, because you can’t have
			// `if firstPredicate() && (a := mkA(); secondPredicate(a)) in Go for whatever reason

			if strings.Index(line, "1/5 - Checking local disk info") != -1 {
				currentStatus = SCheckingDisk
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1,
				        Url: explorerUrl, OmitUrl: false }
				return
			}
			if strings.Index(line, "2/5 - Fetching the certificate and verifying the certificate chain") != -1 {
				currentStatus = SCertificates
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1, OmitUrl: true }
				return
			}
			if strings.Index(line, "3/5 - Downloading and unpacking the cardano db") != -1 {
				currentStatus = SDownloadingUnpacking
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1, OmitUrl: true }
				return
			}
			if currentStatus == SDownloadingUnpacking {
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

					statusCh <- StatusAndUrl { Status: SDownloadingUnpacking, Progress: done/total,
						TaskSize: total, SecondsLeft: timeRemaining, OmitUrl: true }
					return // there would be no way to have `else if` here, hence early return
				}
			}
			if strings.Index(line, "4/5 - Computing the cardano db message") != -1 {
				currentStatus = SDigest
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1, OmitUrl: true }
				return
			}
			if strings.Index(line, "5/5 - Verifying the cardano db signature") != -1 {
				currentStatus = SVerifyingSignature
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1, OmitUrl: true }
				return
			}

			successMarker := "Files in the directory '" + unpackDir +
				"' can be used to run a Cardano node"
			if runtime.GOOS == "windows" {
				// Windows breaks long lines, when running in PTY (conpty), so let’s
				// temporarily check for another string, which won’t get broken:
				successMarker = "If you are using Cardano Docker image, " +
					"you can restore a Cardano Node with"
			}
			if strings.Index(line, successMarker) != -1 {
				currentStatus = SGoodSignature
				statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
					TaskSize: -1, SecondsLeft: -1, OmitUrl: true }
				return
			}
		},
		LogModifier: func(line string) string {
			// Remove the wigglers (⠙, ⠒, etc.):
			brailleDotsLow := rune(0x2800)
			brailleDotsHi := rune(0x28ff)
			var result strings.Builder
			for _, char := range line {
				if char < brailleDotsLow || char > brailleDotsHi {
					result.WriteRune(char)
				}
			}
			line = result.String()
			line = strings.TrimSpace(line)

			// Debounce the download progress bar, it’s way too frequent:
			if currentStatus == SDownloadingUnpacking {
				if ms := reProgress.FindStringSubmatch(line); len(ms) > 0 {
					if time.Since(downloadProgressLastEmitted) >= 333 * time.Millisecond {
						downloadProgressLastEmitted = time.Now()
					} else {
						line = ""
					}
				}
			}

			return line
		},
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 5 * time.Second,
		PostStop: func() error {
			if currentStatus != SGoodSignature {
				// Since Mithril cannot resume interrupted downloads, let’s clear them on failures:
				os.RemoveAll(downloadDir)

				return fmt.Errorf("cannot move DB as snapshot download was not successful")
			}
			currentStatus = SMovingDB
			statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
				TaskSize: -1, SecondsLeft: -1, OmitUrl: true }

			chainDir := ourpaths.WorkDir + sep + shared.Network + sep + "chain"
			chainDirBackup := chainDir + "--bak--" + time.Now().UTC().Format("2006-01-02--15-04-05Z")

			err := os.Rename(chainDir, chainDirBackup)
			if err != nil { return err }

			err = os.Rename(unpackDir, chainDir)
			if err != nil { return err }

			// TODO: do it:
			err = os.RemoveAll(downloadDir)
			if err != nil { return err }

			// TODO: do it:
			err = os.RemoveAll(chainDirBackup)
			if err != nil { return err }

			currentStatus = SFinished
			statusCh <- StatusAndUrl { Status: currentStatus, Progress: -1,
				TaskSize: -1, SecondsLeft: -1, OmitUrl: true }

			return nil
		},
	}
}}

func runCommandWithTimeout(
	command string,
	args []string,
	extraEnv []string,
	timeout time.Duration,
	stdin *string,  // use nil to not set
) ([]byte, []byte, error, int) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, command, args...)

	setManagedChildSysProcAttr(cmd)

	// Against possible orphaned child processes during timeout, but so far Mithril doesn’t have them:
	cmd.WaitDelay =	1 * time.Second

	if len(extraEnv) > 0 {
		cmd.Env = append(os.Environ(), extraEnv...)
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	cmd.Stdout = &stdoutBuf
	cmd.Stderr = &stderrBuf

    if stdin != nil {
        cmd.Stdin = strings.NewReader(*stdin)
    }

	err := cmd.Run()
	var rerr error

	if ctx.Err() == context.DeadlineExceeded {
		rerr = fmt.Errorf("timed out")
	} else if err != nil {
		rerr = fmt.Errorf("failed: %s", err)
	}

	pid := -1
	if cmd.Process != nil {
		pid = cmd.Process.Pid
	}

	return stdoutBuf.Bytes(), stderrBuf.Bytes(), rerr, pid
}
