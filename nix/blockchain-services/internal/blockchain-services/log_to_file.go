package main

import (
	"fmt"
	"os"
	"sync"
	"bufio"
	"runtime"
	"time"

	"github.com/acarl005/stripansi"
)

func duplicateOutputToFile(logFile string) func() {
	originalStdout := os.Stdout
	originalStderr := os.Stderr

	newLine := "\n"
	if (runtime.GOOS == "windows") {
		newLine = "\r\n"
	}

	fp, err := os.Create(logFile)
	if err != nil {
	    panic(err)
	}

	introLine := "-- Log begins at " + time.Now().UTC().Format("Mon 2006-01-02 15:04:05") + " UTC. --"
	fmt.Println(introLine)
	fp.WriteString(introLine + newLine)

	newStdoutR, newStdoutW, err := os.Pipe()
	if err != nil {
	    panic(err)
	}
	os.Stdout = newStdoutW

	newStderrR, newStderrW, err := os.Pipe()
	if err != nil {
	    panic(err)
	}
	os.Stderr = newStderrW

	logTime := func() string {
		return time.Now().UTC().Format("Jan 2 15:04:05.000Z")
	}

	var wgScanners sync.WaitGroup
	wgScanners.Add(2)

	lines := make(chan string)

	go func() {
		scanner := bufio.NewScanner(newStdoutR)
		for scanner.Scan() {
			line := logTime() + " " + scanner.Text()
			lines <- line
			originalStdout.WriteString(line + newLine)
		}
		wgScanners.Done()
	}()

	go func() {
		scanner := bufio.NewScanner(newStderrR)
		for scanner.Scan() {
			now := logTime()
			line := scanner.Text()
			lines <- now + " [stderr] " + line
			originalStderr.WriteString(now + " " + line + newLine)
		}
		wgScanners.Done()
	}()

	writerDone := make(chan struct{})

	go func() {
		defer fp.Close()
		for line := range lines {
			fp.WriteString(stripansi.Strip(line) + newLine)
		}
		writerDone <- struct{}{}
	}()

	// Wait, making sure that everything is indeed written before exiting:
	closeOutputs := func(){
		newStdoutW.Close()
		newStderrW.Close()
		wgScanners.Wait()
		close(lines)
		<-writerDone
	}

	return closeOutputs
}
