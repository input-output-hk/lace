package mithrilcache

import (
	"fmt"
	"net/http"
	"os"
	"encoding/json"
	"io"
	"io/ioutil"
	"net/url"
	"strings"
	"path/filepath"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/appconfig"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

var upstream = map[string]string{
	"preview": "https://aggregator.pre-release-preview.api.mithril.network/aggregator",
	"preprod": "https://aggregator.release-preprod.api.mithril.network/aggregator",
	"mainnet": "https://aggregator.release-mainnet.api.mithril.network/aggregator",
}

var localSnapshotHttpName = "local-snapshot.tar.zst"

func Run(appConfig appconfig.AppConfig, port int) error {
	server := &http.Server{
		Addr: fmt.Sprintf(":%d", port),
		Handler: http.HandlerFunc(handler(appConfig, port)),
	}
	fmt.Printf("%s[%d]: starting mithril-cache HTTP server: http://127.0.0.1:%d\n", OurLogPrefix, os.Getpid(),
		port)
	return server.ListenAndServe()
}

func handler(
	appConfig appconfig.AppConfig,
	ourPort int,
) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	fmt.Printf("%s[%d]: mithril-cache HTTP request: %v\n", OurLogPrefix, os.Getpid(), *r)

	networks := []string{"preprod", "preview", "mainnet"}

	forced := map[string]appconfig.MithrilOverride {
		"preprod": appConfig.ForceMithrilSnapshot.Preprod,
		"preview": appConfig.ForceMithrilSnapshot.Preview,
		"mainnet": appConfig.ForceMithrilSnapshot.Mainnet,
	}

	exactMatches := make(map[string]func(w http.ResponseWriter, r *http.Request))
	for _, network_ := range networks {
		network := network_
		if forced[network].Digest != "" {
			exactMatches["/" + network + "/artifact/snapshots"] = func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet {
					http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
					return
				}
				jsonObj, err := getSnapshotMetadata(network, forced[network].Digest, ourPort, forced[network].LocalPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusBadGateway)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode([]interface{}{jsonObj})
			}
			exactMatches["/" + network + "/artifact/snapshot/" + forced[network].Digest] = func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet {
					http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
					return
				}
				jsonObj, err := getSnapshotMetadata(network, forced[network].Digest, ourPort, forced[network].LocalPath)
				if err != nil {
					http.Error(w, err.Error(), http.StatusBadGateway)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(jsonObj)
			}
			exactMatches["/" + network + "/" + localSnapshotHttpName] = func(w http.ResponseWriter, r *http.Request) {
				http.ServeFile(w, r, forced[network].LocalPath)
			}
		}
	}

	prefixMatches := make(map[string]func(w http.ResponseWriter, r *http.Request))
	for _, network_ := range networks {
		network := network_
		if forced[network].Digest != "" {
			prefixMatches["/" + network + "/certificate/"] = func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodGet {
					http.Error(w, "Invalid Method", http.StatusMethodNotAllowed)
					return
				}
				upstreamURL := upstream[network] + strings.TrimPrefix(r.URL.Path, "/" + network)
				resp, err := http.Get(upstreamURL)
				if err != nil {
					http.Error(w, "mithril-cache proxy error", http.StatusBadGateway)
					return
				}
				defer resp.Body.Close()

				w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
				w.WriteHeader(resp.StatusCode)
				io.Copy(w, resp.Body)
			}
		}
	}

	if r.Method == http.MethodOptions {
		// fine
	} else if handler, exists := exactMatches[r.URL.Path]; exists {
		handler(w, r)
	} else if handler, exists := PrefixMatch(prefixMatches, r.URL.Path); exists {
		handler(w, r)
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}}

func getSnapshotMetadata(network string, digest string, ourPort int, localPath string) (interface{}, error) {
	resp, err := http.Get(upstream[network] + "/artifact/snapshot/" + digest)
	if err != nil {
		return nil, fmt.Errorf("mithril-cache upstream error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mithril-cache upstream error: unexpected status code: %v", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("mithril-cache upstream read error: %v", err)
	}

	var jsonObj map[string]interface{}
	if err := json.Unmarshal(body, &jsonObj); err != nil {
		return nil, fmt.Errorf("mithril-cache upstream JSON unmarshal error: %v", err)
	}

	// localUrl := fmt.Sprintf("http://127.0.0.1:%d/%s/%s", ourPort, network, localSnapshotHttpName)
	localUrl, err := localPathToFileScheme(localPath)
	if err != nil {
		return nil, err
	}

	jsonObj["locations"] = []string{ localUrl }

	return jsonObj, nil
}

func PrefixMatch[T any](m map[string]T, key string) (T, bool) {
    for k, v := range m {
        if len(key) >= len(k) && key[:len(k)] == k {
            return v, true
        }
    }
    var zero T
    return zero, false
}

func localPathToFileScheme(path string) (string, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	absPath = filepath.ToSlash(absPath)

	// Add an extra slash on Windows:
	leadingSlash := "/"
	if strings.HasPrefix(absPath, "/") {
		leadingSlash = ""
	}

	fileUrl, err := url.Parse("file://" + leadingSlash + absPath)
	if err != nil {
		return "", err
	}

	return fileUrl.String(), nil
}
