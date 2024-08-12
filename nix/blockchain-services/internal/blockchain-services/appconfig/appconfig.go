package appconfig

import (
	"fmt"
	"os"
	"io/ioutil"
	"path/filepath"
	"encoding/json"

	"lace.io/blockchain-services/ourpaths"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type AppConfig struct {
	ApiPort              int     `json:"apiPort"`
	CardanoSubmitApiPort int     `json:"cardanoSubmitApiPort"`
	LastNetwork          string  `json:"lastNetwork"`
	ForceMithrilSnapshot MithrilOverrides `json:"forceMithrilSnapshot"`
}

type MithrilOverrides struct {
	Preview MithrilOverride `json:"preview"`
	Preprod MithrilOverride `json:"preprod"`
	Mainnet MithrilOverride `json:"mainnet"`
}

type MithrilOverride struct {
	Digest string `json:"digest"`
	LocalPath string `json:"localPath"`
}

func Load() AppConfig {
	configFile := ourpaths.WorkDir + string(filepath.Separator) + "app-config.json"

	defaults := AppConfig {
		ApiPort: 52910,
		CardanoSubmitApiPort: 52911,
		LastNetwork: "mainnet",
		ForceMithrilSnapshot: MithrilOverrides {
			Preview: MithrilOverride { Digest: "", LocalPath: "" },
			Preprod: MithrilOverride { Digest: "", LocalPath: "" },
			Mainnet: MithrilOverride { Digest: "", LocalPath: "" },
		},
	}

	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		return defaults
	}

	data, err := ioutil.ReadFile(configFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot read the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return defaults
	}

	err = json.Unmarshal(data, &defaults)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot unmarshal the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return defaults
	}

	return defaults
}

func Save(config AppConfig) {
	configFile := ourpaths.WorkDir + string(filepath.Separator) + "app-config.json"

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot marshal the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
		return
	}

	err = ioutil.WriteFile(configFile, data, 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s[%d]: cannot save the config file: %s: %s\n",
			OurLogPrefix, os.Getpid(), configFile, err)
	}
}
