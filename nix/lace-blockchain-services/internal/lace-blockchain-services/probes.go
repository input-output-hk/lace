package main

import (
	"fmt"
	"net"
	"net/http"
	"time"
)

func getFreeTCPPort() int {
	sock, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}
	defer sock.Close()

	// Retrieve the address of the listener
	address := sock.Addr().(*net.TCPAddr)
	return address.Port
}

func probeTcpPort(host string, port int, timeout time.Duration) error {
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", host, port), timeout)
	if err == nil {
		defer conn.Close()
	}
	return err
}

func probeUnixSocket(path string, timeout time.Duration) error {
	conn, err := net.DialTimeout("unix", path, timeout)
	if err == nil {
		defer conn.Close()
	}
	return err
}

func probeHttp200(url string, timeout time.Duration) error {
	return probeHttpFor(http.StatusOK, url, timeout)
}

func probeHttpFor(expectedStatus int, url string, timeout time.Duration) error {
	httpClient := http.Client{Timeout: timeout}
	resp, err := httpClient.Get(url)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == expectedStatus {
			return nil
		} else {
			return fmt.Errorf("got a non-%d response: %s for %s", expectedStatus, resp.StatusCode, url)
		}
	}
	return err
}
