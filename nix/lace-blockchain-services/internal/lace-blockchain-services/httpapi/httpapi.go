package httpapi

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"strconv"
	"path/filepath"
	"encoding/json"
	"sort"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/assets"
	"lace.io/lace-blockchain-services/appconfig"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type CommChannels struct {
	SwitchNetwork   chan<- int
}

func Run(appConfig appconfig.AppConfig, comm CommChannels, availableNetworks map[int]string) error {
	server := &http.Server{
		Addr: fmt.Sprintf(":%d", appConfig.ApiPort),
		Handler: http.HandlerFunc(handler(appConfig, comm, availableNetworks)),
	}

	fmt.Printf("%s[%d]: starting HTTP server: http://127.0.0.1:%d\n", OurLogPrefix, os.Getpid(),
		appConfig.ApiPort)
	return server.ListenAndServe()
}

func handler(appConfig appconfig.AppConfig, comm CommChannels, availableNetworks map[int]string) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
	swaggerUiPrefix := "swagger-ui"

	if (r.URL.Path == "/" || r.URL.Path == "/" + swaggerUiPrefix) && r.Method == http.MethodGet {
		http.Redirect(w, r, "/" + swaggerUiPrefix + "/", http.StatusSeeOther)
	} else if strings.HasPrefix(r.URL.Path, "/" + swaggerUiPrefix + "/") {
		sep := string(filepath.Separator)
		http.StripPrefix("/" + swaggerUiPrefix + "/",
			http.FileServer(http.Dir(ourpaths.ResourcesDir + sep + "swagger-ui"))).ServeHTTP(w, r)
	} else if r.URL.Path == "/openapi.json" && r.Method == http.MethodGet {
		resp, err := openApiJson(appConfig, availableNetworks)
		if err != nil { panic(err) }
		w.Header().Set("Content-Type", "application/json")
		w.Write(resp)
	} else if strings.HasPrefix(r.URL.Path, "/v1/switch-network/") && r.Method == http.MethodPut {
		magic, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/v1/switch-network/"))
		_, exists := availableNetworks[magic]
		if err == nil && exists {
			fmt.Printf("%s[%d]: HTTP switching to magic: %v\n", OurLogPrefix, os.Getpid(), magic)
			comm.SwitchNetwork <- magic
		} else {
			http.Error(w, "Not found", http.StatusNotFound)
		}
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}}

func openApiJson(appConfig appconfig.AppConfig, availableNetworks map[int]string) ([]byte, error) {
	raw, err := assets.Asset("openapi.json")
	if err != nil { return nil, err }

	var doc map[string]interface{}
	err = json.Unmarshal(raw, &doc)
	if err != nil { return nil, err }

	doc["servers"] = []map[string]string{map[string]string{
		"url": fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort),
	}}

	// We want to show largest magics first (mainnet), for clearer examples in docs:
	magics := []int{}
	for m, _ := range availableNetworks { magics = append(magics, m) }
	sort.Sort(sort.Reverse(sort.IntSlice(magics)))

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["NetworkMagic"].
		(map[string]interface{})["enum"] = magics

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["ServiceName"].
		(map[string]interface{})["enum"] = []string{
		"cardano-node", "ogmios", "provider-server", "lace-blockchain-services"}

	return json.Marshal(doc)
}
