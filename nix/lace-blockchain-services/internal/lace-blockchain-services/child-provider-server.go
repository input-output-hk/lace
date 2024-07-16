package main

import (
	"fmt"
	"path/filepath"
	"runtime"
	"time"
	"net/url"

	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/ourpaths"
)

func childProviderServer(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	serviceName := "provider-server"

	tokenMetadataServerUrl := "https://tokens.cardano.org"
	if shared.Network != "mainnet" {
		tokenMetadataServerUrl = "https://metadata.cardano-testnet.iohkdev.io/"
	}

	var providerServerPort int

	return ManagedChild{
		ServiceName: serviceName,
		ExePath: ourpaths.LibexecDir + sep + "nodejs" + sep + "node" + ourpaths.ExeSuffix,
		Version: constants.CardanoJsSdkVersion,
		Revision: constants.CardanoJsSdkRevision,
		MkArgv: func() ([]string, error) {
			cjsPrefix := sep + "cjs"
			if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
				cjsPrefix = ""
			}
			return []string{
				ourpaths.CardanoServicesDir + sep + "dist" + cjsPrefix +
					sep + "cli.js",
				"start-provider-server",
			}, nil
		},
		MkExtraEnv: func() []string {
			providerServerPort = getFreeTCPPort()
			fmt.Printf("%s[%d]: will run on http://127.0.0.1:%d/\n", serviceName, -1, providerServerPort)
			return []string{
				"NETWORK=" + shared.Network,
				"TOKEN_METADATA_SERVER_URL=" + tokenMetadataServerUrl,
				"CARDANO_NODE_CONFIG_PATH=" + shared.CardanoNodeConfigDir +
					sep + "config.json",
				"API_URL=http://0.0.0.0:" +
					fmt.Sprintf("%d", providerServerPort),
				"ENABLE_METRICS=true",
				"LOGGER_MIN_SEVERITY=trace",
				"SERVICE_NAMES=tx-submit,handle",

				"HANDLE_POLICY_IDS=f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a",
				"POSTGRES_POOL_MAX_HANDLE=10",
				"POSTGRES_CONNECTION_STRING_HANDLE=" + fmt.Sprintf(
					"postgresql://%s:%s@%s:%d/%s",
					"postgres",
					url.QueryEscape(*shared.PostgresPassword),
					"127.0.0.1",
					*shared.PostgresPort,
					"postgres",
				),

				"USE_QUEUE=false",
				"USE_BLOCKFROST=false",
				"OGMIOS_URL=ws://127.0.0.1:" +
					fmt.Sprintf("%d", *shared.OgmiosPort),
				"BUILD_INFO=" + constants.CardanoJsSdkBuildInfo,
			}
		},
		PostStart: func() error { return nil },
		AllocatePTY: false,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			backendUrl := fmt.Sprintf("http://127.0.0.1:%d",
				providerServerPort)
			err := probeHttp200(backendUrl + "/v1.0.0/health", 1 * time.Second)
			nextProbeIn := 1 * time.Second
			if (err == nil) {
				statusCh <- StatusAndUrl {
					Status: "listening",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: backendUrl,
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
		LogModifier: func(line string) string { return line },
		TerminateGracefullyByInheritedFd3: false,
		ForceKillAfter: 5 * time.Second,
		PostStop: func() error { return nil },
	}
}
