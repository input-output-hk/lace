package httpapi

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"path/filepath"
	"encoding/json"

	"lace.io/lace-blockchain-services/ourpaths"
	"lace.io/lace-blockchain-services/assets"
	"lace.io/lace-blockchain-services/appconfig"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

func Run(appConfig appconfig.AppConfig, availableNetworks []int) error {
	server := &http.Server{
		Addr: fmt.Sprintf(":%d", appConfig.ApiPort),
		Handler: http.HandlerFunc(handler(appConfig, availableNetworks)),
	}

	fmt.Printf("%s[%d]: starting HTTP server: http://127.0.0.1:%d\n", OurLogPrefix, os.Getpid(),
		appConfig.ApiPort)
	return server.ListenAndServe()
}

func handler(appConfig appconfig.AppConfig, availableNetworks []int) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
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
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
}}

func openApiJson(appConfig appconfig.AppConfig, availableNetworks []int) ([]byte, error) {
	raw, err := assets.Asset("openapi.json")
	if err != nil { return nil, err }

	var doc map[string]interface{}
	err = json.Unmarshal(raw, &doc)
	if err != nil { return nil, err }

	doc["servers"] = []map[string]string{map[string]string{
		"url":fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort),
	}}

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["NetworkMagic"].
		(map[string]interface{})["enum"] = availableNetworks

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["ServiceName"].
		(map[string]interface{})["enum"] = []string{
		"cardano-node", "ogmios", "provider-server", "lace-blockchain-services"}

	return json.Marshal(doc)
}
