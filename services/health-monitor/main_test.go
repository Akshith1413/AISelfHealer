package main

import (
	"testing"
)

func TestPercentileAndHealthScore(t *testing.T) {
	ring := NewRingBuffer(5)
	for _, value := range []float64{10, 20, 30, 40, 50} {
		ring.Add(value)
	}
	if got := Percentile(ring.Values(), 95); got != 50 {
		t.Fatalf("expected p95 to be 50, got %v", got)
	}
	monitor := NewMonitor()
	monitor.Register("missing", "http://127.0.0.1:1")
	score := monitor.Check(monitor.services["missing"])
	if score.Status != "down" {
		t.Fatalf("expected down status, got %s", score.Status)
	}
}

