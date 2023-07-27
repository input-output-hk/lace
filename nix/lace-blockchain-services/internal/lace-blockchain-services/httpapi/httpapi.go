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
	"unsafe"

	t "lace.io/lace-blockchain-services/types"
	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/assets"
	"lace.io/lace-blockchain-services/appconfig"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type CommChannels struct {
	SwitchNetwork    chan<- t.NetworkMagic

	SwitchedNetwork  <-chan t.NetworkMagic
}

func Run(appConfig appconfig.AppConfig, comm CommChannels, availableNetworks map[t.NetworkMagic]string) error {
	info := Info{
		CurrentNetwork: -1,
		AvailableNetworks: networksToMagics(availableNetworks),
		Services: []int{},
	}

	go func(){
		for magic := range comm.SwitchedNetwork {
			info.CurrentNetwork = magic
		}
	}()

	server := &http.Server{
		Addr: fmt.Sprintf(":%d", appConfig.ApiPort),
		Handler: http.HandlerFunc(handler(appConfig, comm, &info, availableNetworks)),
	}

	fmt.Printf("%s[%d]: starting HTTP server: http://127.0.0.1:%d\n", OurLogPrefix, os.Getpid(),
		appConfig.ApiPort)
	return server.ListenAndServe()
}

type Info struct {
	Services          []int  `json:"services"`
	CurrentNetwork    t.NetworkMagic   `json:"currentNetwork"`
	AvailableNetworks []t.NetworkMagic `json:"availableNetworks"`
}

func handler(
	appConfig appconfig.AppConfig,
	comm CommChannels,
	info *Info,
	availableNetworks map[t.NetworkMagic]string,
) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
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

	} else if r.URL.Path == "/v1/info" && r.Method == http.MethodGet {
		bytes, err := json.Marshal(*info)
		if err != nil { panic(err) }
		w.Header().Set("Content-Type", "application/json")
		w.Write(bytes)
	} else if strings.HasPrefix(r.URL.Path, "/v1/switch-network/") && r.Method == http.MethodPut {
		magicInt, err := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/v1/switch-network/"))
		magic := t.NetworkMagic(magicInt)
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

func networksToMagics(availableNetworks map[t.NetworkMagic]string) []t.NetworkMagic {
	magics := []t.NetworkMagic{}
	for magic, _ := range availableNetworks { magics = append(magics, magic) }
	// We want to show largest magics first (mainnet), for clearer examples in docs:
	sort.Sort(sort.Reverse(sort.IntSlice(  *(*[]int)(unsafe.Pointer(&magics))  )))
	return magics
}

func openApiJson(appConfig appconfig.AppConfig, availableNetworks map[t.NetworkMagic]string) ([]byte, error) {
	raw, err := assets.Asset("openapi.json")
	if err != nil { return nil, err }

	var doc map[string]interface{}
	err = json.Unmarshal(raw, &doc)
	if err != nil { return nil, err }

	doc["servers"] = []map[string]string{map[string]string{
		"url": fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort),
	}}

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["NetworkMagic"].
		(map[string]interface{})["enum"] = networksToMagics(availableNetworks)

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["ServiceName"].
		(map[string]interface{})["enum"] = []string{
		"cardano-node", "ogmios", "provider-server", "lace-blockchain-services"}

	return json.Marshal(doc)
}
