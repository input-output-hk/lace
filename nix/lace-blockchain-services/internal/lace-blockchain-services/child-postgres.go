package main

import (
	"crypto/rand"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"
    "encoding/base64"

	"lace.io/lace-blockchain-services/constants"
	"lace.io/lace-blockchain-services/ourpaths"
)

func childPostgres(shared SharedState, statusCh chan<- StatusAndUrl) ManagedChild {
	sep := string(filepath.Separator)

	serviceName := "postgres"
	libexecDir := ourpaths.LibexecDir + sep + "postgres" + sep + "bin"
	dataDir := ourpaths.WorkDir + sep + shared.Network + sep + "postgres"
	pwFile := dataDir + sep + "pg_stat_temp_5472"

	// Make it a little harder to break local Postgres state (esp. subtly). If you work around this,
	// you claim to know what you’re doing, and you’re on your own.
	pwKey := []byte("iog-support-wont-help-me")

	needsInitDb := true
	*shared.PostgresPassword = "?"

	extraEnv := []string{
		"PGDATA=" + dataDir,
	}

	return ManagedChild{
		ServiceName: serviceName,
		ExePath: libexecDir + sep + "postgres" + ourpaths.ExeSuffix,
		Version: constants.PostgresVersion,
		Revision: constants.PostgresRevision,
		MkArgv: func() ([]string, error) {
			*shared.PostgresPort = getFreeTCPPort()

			_, err := os.Stat(pwFile)
			needsInitDb = err != nil

			if needsInitDb {
				statusCh <- StatusAndUrl {
					Status: "initializing DB",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: "",
					OmitUrl: false,
				}

				*shared.PostgresPassword = randomString(32)

				pwFileClear, err := ioutil.TempFile("", "pg")
				if err != nil { return nil, err }
				pwFileClear.Close()
				defer os.Remove(pwFileClear.Name())
				err = ioutil.WriteFile(pwFileClear.Name(), []byte(*shared.PostgresPassword), 0600)
				if err != nil { return nil, err }

				// initdb needs an empty directory:
				os.RemoveAll(dataDir)
				err = os.MkdirAll(dataDir, 0755)
				if err != nil { return nil, err }

				fmt.Printf("%s[%d]: running initdb\n", serviceName, -1)
				stdout, stderr, err, pid := runCommandWithTimeout(
					libexecDir + sep + "initdb" + ourpaths.ExeSuffix,
					[]string{"--username", "postgres", "--pwfile", pwFileClear.Name()},
					extraEnv,
					30 * time.Second,
				)

				if err != nil {
					fmt.Printf("%s[%d]: initdb failed: %v (stderr: %v) (stdout: %v)\n",
						serviceName, pid, err, string(stdout), string(stderr))
					return nil, err
				}

				fmt.Printf("%s[%d]: %s\n", serviceName, pid, strings.ReplaceAll(string(stdout), "\n",
					fmt.Sprintf("\n%s[%d]: ", serviceName, pid)))

				err = ioutil.WriteFile(pwFile, xorWithKey([]byte(*shared.PostgresPassword), pwKey), 0600)
				if err != nil { return nil, err }
			} else {
				pwData, err := ioutil.ReadFile(pwFile)
				if err != nil { return nil, err }
				*shared.PostgresPassword = string(xorWithKey(pwData, pwKey))
			}

			err = ioutil.WriteFile(dataDir + sep + "pg_hba.conf", []byte(
				"host  all  all  127.0.0.1/32  scram-sha-256\n" +
				"host  all  all  ::1/128       scram-sha-256\n",
			), 0600)
			if err != nil { return nil, err }

			err = ioutil.WriteFile(dataDir + sep + "postgresql.conf", []byte(
				"listen_addresses = 'localhost'\n" +
				fmt.Sprintf("port = %d\n", *shared.PostgresPort) +
				fmt.Sprintf("unix_socket_directories = '%s'\n", strings.ReplaceAll(dataDir, "\\", "/")) +
				"max_connections = 100\n" +
				"fsync = on\n" +
				"logging_collector = off\n" +
				"log_destination = 'stderr'\n" +
				"log_statement = 'all'\n" +
				"log_line_prefix = ''\n" +
				"datestyle = 'iso'\n" +
				"timezone = 'utc'\n" +
				"#autovacuum = on\n",
			), 0600)
			if err != nil { return nil, err }

			return []string{}, nil
		},
		MkExtraEnv: func() []string { return extraEnv },
		AllocatePTY: false,
		StatusCh: statusCh,
		HealthProbe: func(prev HealthStatus) HealthStatus {
			err := probeTcpPort("127.0.0.1", *shared.PostgresPort, 1 * time.Second)
			nextProbeIn := 1 * time.Second
			if (err == nil) {
				statusCh <- StatusAndUrl {
					Status: "listening",
					Progress: -1,
					TaskSize: -1,
					SecondsLeft: -1,
					Url: "",
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
		AfterExit: func() error { return nil },
	}
}


func randomString(length uint) string {
    bytes := make([]byte, length)
    rand.Read(bytes)
	rv := base64.StdEncoding.EncodeToString(bytes)
    rv = rv[:length]
	return rv
}

// Make it a little harder to break Postgres (esp. subtly). If you work around this, you know what you’re doing.
func xorWithKey(data []byte, key []byte) []byte {
	rv := make([]byte, len(data))
	for i := range data {
		rv[i] = data[i] ^ key[i % len(key)]
	}
	return rv
}
