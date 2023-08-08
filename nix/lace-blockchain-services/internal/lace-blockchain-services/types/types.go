package types

type NetworkMagic int

type ServiceStatus struct {
	ServiceName string  `json:"serviceName"`
	Status      string  `json:"status"`
	Progress    float64 `json:"progress"`
	TaskSize    float64 `json:"taskSize"`
	SecondsLeft float64 `json:"secondsLeft"`
	Url         string  `json:"url"`
	Version     string  `json:"version"`
	Revision    string  `json:"revision"`
}
