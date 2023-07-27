package types

type NetworkMagic int

type ServiceStatus struct {
	ServiceName string `json:"serviceName"`
	Status      string `json:"status"`
	Url         string `json:"url"`
	Version     string `json:"version"`
	Revision    string `json:"revision"`
}
