package main

import (
	"fmt"
	"path/filepath"
	"time"
	"strconv"
	"regexp"

	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/ourpaths"
)

func childOgmios(syncProgressCh chan<- float64) func(SharedState, chan<- StatusAndUrl) ManagedChild { return func(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	reSyncProgress := regexp.MustCompile(`"networkSynchronization"\s*:\s*(\d*\.\d+)`)

	return ManagedChild{
		ServiceName: "ogmios",
		ExePath: ourpaths.LibexecDir + sep + "ogmios" + sep + "ogmios" + ourpaths.ExeSuffix,
		Version: constants.OgmiosVersion,
		Revision: constants.OgmiosRevision,
		MkArgv: func() ([]string, error) {
			*shared.OgmiosPort = getFreeTCPPort()
			return []string{
				"--host", "127.0.0.1",
				"--port", fmt.Sprintf("%d", *shared.OgmiosPort),
				"--node-config", shared.CardanoNodeConfigDir + sep + "config.json",
				"--node-socket", shared.CardanoNodeSocket,
			}, nil
		},
		MkExtraEnv: func() []string { return []string{} },
		AllocatePTY: false,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			ogmiosUrl := fmt.Sprintf("http://127.0.0.1:%d", *shared.OgmiosPort)
			err := probeHttp200(ogmiosUrl + "/health", 1 * time.Second)
			nextProbeIn := 1 * time.Second
			if (err == nil) {
				statusCh <- StatusAndUrl {
					Status: "listening",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: ogmiosUrl,
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
		LogMonitor: func(line string) {
			if ms := reSyncProgress.FindStringSubmatch(line); len(ms) > 0 {
				num, err := strconv.ParseFloat(ms[1], 64)
				if err == nil {
					syncProgressCh <- num
				}
			}
		},
		LogModifier: func(line string) string { return line },
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 5 * time.Second,
		AfterExit: func() error { return nil },
	}
}}
