package appconfig

import (
	"fmt"
	"os"
	"io/ioutil"
	"path/filepath"
	"encoding/json"

	"lace.io/lace-blockchain-services/ourpaths"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type AppConfig struct {
	ApiPort     int     `json:"apiPort"`
	LastNetwork string  `json:"lastNetwork"`
}

func Load() AppConfig {
	configFile := ourpaths.WorkDir + string(filepath.Separator) + "app-config.json"

	defaults := AppConfig {
		ApiPort: 52910,
		LastNetwork: "mainnet",
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
