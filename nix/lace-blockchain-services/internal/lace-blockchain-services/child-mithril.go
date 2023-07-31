package main

import (
	"path/filepath"
	"time"

	"lace.io/lace-blockchain-services/versions"
	"lace.io/lace-blockchain-services/ourpaths"
)

func childMithril(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	return ManagedChild{
		ServiceName: "mithril-client",
		ExePath: ourpaths.LibexecDir + sep + "mithril-client" + ourpaths.ExeSuffix,
		Version: versions.MithrilClientVersion,
		Revision: versions.MithrilClientRevision,
		MkArgv: func() []string {
			return []string{}
		},
		MkExtraEnv: func() []string {
			return []string{}
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
