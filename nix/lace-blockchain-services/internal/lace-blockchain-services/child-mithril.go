package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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

			// TODO: parse statuses & progress

		},
		LogModifier: func(line string) string { return line },
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
		//return "", "", fmt.Errorf("timed out")
	} else if err != nil {
		rerr = fmt.Errorf("failed: %s", err)
		//return "", "", fmt.Errorf("failed: %s", err)
	}

	return stdoutBuf.Bytes(), stderrBuf.Bytes(), rerr, cmd.Process.Pid
}
