package main

import (
	"fmt"
	"path/filepath"
	"time"

	"lace.io/lace-blockchain-services/ourpaths"
)

func childProviderServer(shared SharedState, statusCh chan<- string, setBackendUrl chan<- string) ManagedChild {
	sep := string(filepath.Separator)

	tokenMetadataServerUrl := "https://tokens.cardano.org"
	if shared.Network != "mainnet" {
		tokenMetadataServerUrl = "https://metadata.cardano-testnet.iohkdev.io/"
	}

	var providerServerPort int

	return ManagedChild{
		LogPrefix: "provider-server",
		PrettyName: "provider-server",
		ExePath: ourpaths.LibexecDir + sep + "node" + ourpaths.ExeSuffix,
		MkArgv: func() []string {
			return []string{
				ourpaths.CardanoServicesDir + sep + "dist" + sep + "cjs" +
					sep + "cli.js",
				"start-provider-server",
			}
		},
		MkExtraEnv: func() []string {
			providerServerPort = getFreeTCPPort()
			return []string{
				"NETWORK=" + shared.Network,
				"TOKEN_METADATA_SERVER_URL=" + tokenMetadataServerUrl,
				"CARDANO_NODE_CONFIG_PATH=" + shared.CardanoNodeConfigDir +
					sep + "config.json",
				"API_URL=http://0.0.0.0:" +
					fmt.Sprintf("%d", providerServerPort),
				"ENABLE_METRICS=true",
				"LOGGER_MIN_SEVERITY=info",
				"SERVICE_NAMES=tx-submit",
				"USE_QUEUE=false",
				"USE_BLOCKFROST=false",
				"OGMIOS_URL=ws://127.0.0.1:" +
					fmt.Sprintf("%d", *shared.OgmiosPort),
			}
		},
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			backendUrl := fmt.Sprintf("http://127.0.0.1:%d",
				providerServerPort)
			err := probeHttp200(backendUrl + "/health", 1 * time.Second)
			nextProbeIn := 1 * time.Second
			if (err == nil) {
				statusCh <- "listening"
				setBackendUrl <- backendUrl
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
		LogModifier: func(line string) string { return line },
		AfterExit: func() {
			setBackendUrl <- ""
		},
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 5 * time.Second,
	}
}
