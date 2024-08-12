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
	"sync"
	"time"

	t "lace.io/blockchain-services/types"
	"lace.io/blockchain-services/ourpaths"
	"lace.io/blockchain-services/assets"
	"lace.io/blockchain-services/appconfig"

	"github.com/gorilla/websocket"
)

const (
	OurLogPrefix = ourpaths.OurLogPrefix
)

type CommChannels struct {
	SwitchNetwork    chan<- t.NetworkMagic

	SwitchedNetwork  <-chan t.NetworkMagic
	ServiceUpdate    <-chan t.ServiceStatus
}

func Run(appConfig appconfig.AppConfig, comm CommChannels, availableNetworks map[t.NetworkMagic]string) error {
	info := Info{
		CurrentNetwork: -1,
		AvailableNetworks: networksToMagics(availableNetworks),
		Services: []t.ServiceStatus{},
	}

	hub := runWebSocketHub()

	go func(){
		for magic := range comm.SwitchedNetwork {
			info.CurrentNetwork = magic
			broadcastNetworkChange(hub, &info)
		}
	}()

	go func(){
		for next := range comm.ServiceUpdate {
			broadcastServiceStatus(hub, next)
			for idx, ss := range info.Services {
				if ss.ServiceName == next.ServiceName {
					info.Services[idx] = next
					goto nextMsg
				}
			}
			info.Services = append(info.Services, next)
		nextMsg:
		}
	}()

	server := &http.Server{
		Addr: fmt.Sprintf(":%d", appConfig.ApiPort),
		Handler: http.HandlerFunc(handler(hub, appConfig, comm, &info, availableNetworks)),
	}

	fmt.Printf("%s[%d]: starting HTTP server: http://127.0.0.1:%d\n", OurLogPrefix, os.Getpid(),
		appConfig.ApiPort)
	return server.ListenAndServe()
}

type Info struct {
	CurrentNetwork    t.NetworkMagic   `json:"currentNetwork"`
	AvailableNetworks []t.NetworkMagic `json:"availableNetworks"`
	Services          []t.ServiceStatus `json:"services"`
}

func handler(
	hub WebSocketHub,
	appConfig appconfig.AppConfig,
	comm CommChannels,
	info *Info,
	availableNetworks map[t.NetworkMagic]string,
) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	fmt.Printf("%s[%d]: HTTP request: %v\n", OurLogPrefix, os.Getpid(), *r)

	tryStatic := func(prefix string) bool {
		if r.URL.Path == "/" + prefix && r.Method == http.MethodGet {
			http.Redirect(w, r, "/" + prefix + "/", http.StatusSeeOther)
			return true
		} else if strings.HasPrefix(r.URL.Path, "/" + prefix + "/") {
			sep := string(filepath.Separator)
			http.StripPrefix("/" + prefix + "/",
				http.FileServer(http.Dir(ourpaths.ResourcesDir + sep + prefix))).ServeHTTP(w, r)
			return true
		} else { return false }
	}

	if r.Method == http.MethodOptions {
		// fine
	} else if r.URL.Path == "/" && r.Method == http.MethodGet {
		http.Redirect(w, r, "/swagger-ui/", http.StatusSeeOther)
	} else if tryStatic("swagger-ui") {
	} else if tryStatic("dashboard") {
	} else if r.URL.Path == "/openapi.json" && r.Method == http.MethodGet {
		resp, err := openApiJson(appConfig, info)
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
	} else if r.URL.Path == "/v1/websocket" && r.Method == http.MethodGet {
		handleWebsocket(hub, availableNetworks)(w, r)
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

func openApiJson(appConfig appconfig.AppConfig, info *Info) ([]byte, error) {
	raw, err := assets.Asset("openapi.json")
	if err != nil { return nil, err }

	var doc map[string]interface{}
	err = json.Unmarshal(raw, &doc)
	if err != nil { return nil, err }

	doc["servers"] = []map[string]string{map[string]string{
		"url": fmt.Sprintf("http://127.0.0.1:%d", appConfig.ApiPort),
	}}

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["NetworkMagic"].
		(map[string]interface{})["enum"] = info.AvailableNetworks

	availableServices := []string{}
	for _, ss := range info.Services {
		availableServices = append(availableServices, ss.ServiceName)
	}

	doc["components"].(map[string]interface{})["schemas"].(map[string]interface{})["ServiceName"].
		(map[string]interface{})["enum"] = availableServices

	return json.Marshal(doc)
}

type WebSocketHub struct {
	broadcast      chan<- []byte
	addClient      func(*websocket.Conn)
	removeClient   func(*websocket.Conn)
}

func handleWebsocket(
	hub WebSocketHub,
	availableNetworks map[t.NetworkMagic]string,
) func(http.ResponseWriter, *http.Request) { return func(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		HandshakeTimeout: 5 * time.Second,
		CheckOrigin: func(_ *http.Request) bool { return true },
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("%s[%d]: HTTP upgrading to WebSocket failed: %v\n", OurLogPrefix, os.Getpid(), err)
		return
	}

	hub.addClient(conn)
	defer hub.removeClient(conn)

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {	break }  // connection closed
		bytes, err := json.Marshal(map[string]interface{}{
			"jsonrpc": "2.0",
			"error": map[string]interface{}{
				"code": -32600,
				"message": "Invalid Request",
			},
			"id": nil,
		})
		if err != nil { panic(err) }
		conn.WriteMessage(websocket.TextMessage, bytes)
	}
}}

func broadcastNetworkChange(hub WebSocketHub, info *Info) {
	bytes, err := json.Marshal(map[string]interface{}{
		"jsonrpc": "2.0",
		"method": "NetworkChange",
		"params": map[string]interface{}{
			"availableNetworks": info.AvailableNetworks,
			"currentNetwork": info.CurrentNetwork,
		},
	})
	if err != nil { panic(err) }
	hub.broadcast <- bytes
}

func broadcastServiceStatus(hub WebSocketHub, ss t.ServiceStatus) {
	bytes, err := json.Marshal(map[string]interface{}{
		"jsonrpc": "2.0",
		"method": "ServiceStatus",
		"params": ss,
	})
	if err != nil { panic(err) }
	hub.broadcast <- bytes
}

func runWebSocketHub() WebSocketHub {
	var mutex sync.Mutex
	clients := map[*websocket.Conn]struct{}{}
	broadcast := make(chan []byte)

	hub := WebSocketHub{
		broadcast: broadcast,
		addClient: func(client *websocket.Conn){
			mutex.Lock()
			defer mutex.Unlock()
			clients[client] = struct{}{}
		},
		removeClient: func(client *websocket.Conn){
			mutex.Lock()
			defer mutex.Unlock()
			delete(clients, client)
			client.Close()
		},
	}

	go func(){ for { func(){
		msg := <-broadcast
		mutex.Lock()
		defer mutex.Unlock()
		for client, _ := range clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err != nil { go hub.removeClient(client) }
		}
	}()}}()

	return hub
}
