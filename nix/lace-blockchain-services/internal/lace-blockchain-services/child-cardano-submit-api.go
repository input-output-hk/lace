package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
	"strings"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/appconfig"

	"github.com/acarl005/stripansi"
)

func childCardanoSubmitApi(appConfig appconfig.AppConfig) func(SharedState, chan<- StatusAndUrl) ManagedChild { return func(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
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

	return ManagedChild{
		ServiceName: "cardano-submit-api",
		ExePath: ourpaths.LibexecDir + sep + "cardano-node" + sep + "cardano-submit-api" + ourpaths.ExeSuffix,
		Version: constants.CardanoNodeVersion,
		Revision: constants.CardanoNodeRevision,
		MkArgv: func() ([]string, error) {
			*shared.CardanoSubmitApiPort = appConfig.CardanoSubmitApiPort // getFreeTCPPort()
			rv := []string {
				"--config", shared.CardanoSubmitApiConfigDir + sep + "config.json",
				"--listen-address", "0.0.0.0",
				"--port", fmt.Sprintf("%d", *shared.CardanoSubmitApiPort),
				"--socket-path", shared.CardanoNodeSocket,
			}
			switch shared.Network {
			case "mainnet":
				rv = append(rv, "--mainnet")
			case "preprod":
				rv = append(rv, "--testnet-magic", "1")
			case "preview":
				rv = append(rv, "--testnet-magic", "2")
			}
			return rv, nil
		},
		MkExtraEnv: func() []string { return []string{} },
		PostStart: func() error { return nil },
		AllocatePTY: false,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			cardanoSubmitApiUrl := fmt.Sprintf("http://127.0.0.1:%d/api/submit/tx", *shared.CardanoSubmitApiPort)
			err := probeHttpFor([]int{ 405 }, cardanoSubmitApiUrl, 1 * time.Second)
			nextProbeIn := 1 * time.Second
			if (err == nil) {
				statusCh <- StatusAndUrl {
					Status: "listening",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: cardanoSubmitApiUrl,
					OmitUrl: false,
				}
				nextProbeIn = 60 * time.Second
			}
			return HealthStatus {
				Initialized: err == nil,
				DoRestart: false,
				NextProbeIn: nextProbeIn,
				LastErr: err,
			}
		},
		LogMonitor: func(line string) {},
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
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 10 * time.Second,
		PostStop: func() error { return nil },
	}
}}
