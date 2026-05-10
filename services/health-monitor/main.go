package main

import (
	"bytes"
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"sort"
	"strings"
	"sync"
	"time"
)

type Service struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	LastSeen  time.Time `json:"last_seen"`
	Heartbeat time.Time `json:"heartbeat_at"`
}

type RingBuffer struct {
	values []float64
	size   int
	next   int
	filled bool
}

func NewRingBuffer(size int) *RingBuffer {
	return &RingBuffer{values: make([]float64, size), size: size}
}

func (r *RingBuffer) Add(value float64) {
	r.values[r.next] = value
	r.next = (r.next + 1) % r.size
	if r.next == 0 {
		r.filled = true
	}
}

func (r *RingBuffer) Values() []float64 {
	limit := r.next
	if r.filled {
		limit = r.size
	}
	out := make([]float64, limit)
	copy(out, r.values[:limit])
	return out
}

func Percentile(values []float64, p float64) float64 {
	if len(values) == 0 {
		return 0
	}
	cp := append([]float64(nil), values...)
	sort.Float64s(cp)
	index := int(math.Ceil((p/100)*float64(len(cp)))) - 1
	if index < 0 {
		index = 0
	}
	if index >= len(cp) {
		index = len(cp) - 1
	}
	return cp[index]
}

type ServiceScore struct {
	ServiceID    string  `json:"service_id"`
	Status       string  `json:"status"`
	UptimeRatio  float64 `json:"uptime_ratio"`
	ErrorRate    float64 `json:"error_rate"`
	P50LatencyMs float64 `json:"p50_latency_ms"`
	P95LatencyMs float64 `json:"p95_latency_ms"`
	P99LatencyMs float64 `json:"p99_latency_ms"`
	HealthScore  float64 `json:"health_score"`
	CheckedAt    string  `json:"checked_at"`
}

type Monitor struct {
	mu        sync.RWMutex
	services map[string]Service
	latency  map[string]*RingBuffer
	checks   map[string]int
	failures map[string]int
	scores   map[string]ServiceScore
	events   []map[string]any
	client   *http.Client
}

func NewMonitor() *Monitor {
	return &Monitor{
		services: map[string]Service{},
		latency:  map[string]*RingBuffer{},
		checks:   map[string]int{},
		failures: map[string]int{},
		scores:   map[string]ServiceScore{},
		events:   []map[string]any{},
		client:   &http.Client{Timeout: 2 * time.Second},
	}
}

func (m *Monitor) Register(id, url string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.services[id] = Service{ID: id, URL: url, LastSeen: time.Now(), Heartbeat: time.Now()}
	if _, ok := m.latency[id]; !ok {
		m.latency[id] = NewRingBuffer(120)
	}
}

func (m *Monitor) Check(service Service) ServiceScore {
	start := time.Now()
	status := "healthy"
	errorRate := 0.0
	resp, err := m.client.Get(strings.TrimRight(service.URL, "/") + "/health")
	latencyMs := float64(time.Since(start).Microseconds()) / 1000

	m.mu.Lock()
	defer m.mu.Unlock()
	m.checks[service.ID]++
	m.latency[service.ID].Add(latencyMs)
	if err != nil || resp.StatusCode >= 500 {
		status = "down"
		m.failures[service.ID]++
		m.emitLocked("service.down", service.ID, map[string]any{"error": errorString(err), "status_code": statusCode(resp)})
	} else if resp.StatusCode >= 400 {
		status = "degraded"
		m.failures[service.ID]++
	}
	if resp != nil && resp.Body != nil {
		resp.Body.Close()
	}

	if m.checks[service.ID] > 0 {
		errorRate = float64(m.failures[service.ID]) / float64(m.checks[service.ID])
	}
	uptimeRatio := 1 - errorRate
	values := m.latency[service.ID].Values()
	latencyScore := math.Max(0, 1-(Percentile(values, 99)/2000))
	healthScore := ((uptimeRatio * 0.4) + ((1 - errorRate) * 0.4) + (latencyScore * 0.2)) * 100
	score := ServiceScore{
		ServiceID:    service.ID,
		Status:       status,
		UptimeRatio:  round(uptimeRatio),
		ErrorRate:    round(errorRate),
		P50LatencyMs: round(Percentile(values, 50)),
		P95LatencyMs: round(Percentile(values, 95)),
		P99LatencyMs: round(Percentile(values, 99)),
		HealthScore:  round(healthScore),
		CheckedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	m.scores[service.ID] = score
	m.emitLocked("service.health", service.ID, map[string]any{"score": score})
	return score
}

func (m *Monitor) emitLocked(eventType, serviceID string, payload map[string]any) {
	event := map[string]any{
		"event_id":       "event_" + time.Now().UTC().Format("20060102150405.000000000"),
		"event_type":     eventType,
		"service_id":     serviceID,
		"tenant_id":      "tenant-demo",
		"payload":        payload,
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"causation_id":   nil,
		"correlation_id": "health_" + serviceID,
	}
	m.events = append([]map[string]any{event}, m.events...)
	if len(m.events) > 250 {
		m.events = m.events[:250]
	}
}

func (m *Monitor) Loop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for range ticker.C {
		m.mu.RLock()
		services := make([]Service, 0, len(m.services))
		for _, service := range m.services {
			services = append(services, service)
		}
		m.mu.RUnlock()
		for _, service := range services {
			go m.Check(service)
		}
	}
}

func (m *Monitor) handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, map[string]string{"status": "ok", "service": "health-monitor"})
	})
	mux.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var payload Service
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		m.Register(payload.ID, payload.URL)
		writeJSON(w, map[string]string{"status": "registered", "service_id": payload.ID})
	})
	mux.HandleFunc("/services", func(w http.ResponseWriter, _ *http.Request) {
		m.mu.RLock()
		defer m.mu.RUnlock()
		writeJSON(w, m.services)
	})
	mux.HandleFunc("/scores", func(w http.ResponseWriter, _ *http.Request) {
		m.mu.RLock()
		defer m.mu.RUnlock()
		writeJSON(w, m.scores)
	})
	mux.HandleFunc("/events", func(w http.ResponseWriter, _ *http.Request) {
		m.mu.RLock()
		defer m.mu.RUnlock()
		writeJSON(w, map[string]any{"events": m.events})
	})
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) {
		var buf bytes.Buffer
		m.mu.RLock()
		for _, score := range m.scores {
			buf.WriteString("health_monitor_service_health_score{service=\"" + score.ServiceID + "\"} " + formatFloat(score.HealthScore) + "\n")
			buf.WriteString("health_monitor_service_error_rate{service=\"" + score.ServiceID + "\"} " + formatFloat(score.ErrorRate) + "\n")
		}
		m.mu.RUnlock()
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		w.Write(buf.Bytes())
	})
	return mux
}

func seedDefaults(m *Monitor) {
	defaults := map[string]string{
		"api-gateway":          getenv("API_GATEWAY_URL", "http://api-gateway:8080"),
		"auth-service":         getenv("AUTH_SERVICE_URL", "http://auth-service:3001"),
		"user-service":         getenv("USER_SERVICE_URL", "http://user-service:3002"),
		"data-service":         getenv("DATA_SERVICE_URL", "http://data-service:8001"),
		"worker-service":       getenv("WORKER_SERVICE_URL", "http://worker-service:8002"),
		"ai-service":           getenv("AI_SERVICE_URL", "http://ai-service:8003"),
		"notification-service": getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:3003"),
	}
	for id, url := range defaults {
		m.Register(id, url)
	}
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(value)
}

func round(v float64) float64 {
	return math.Round(v*100) / 100
}

func statusCode(resp *http.Response) int {
	if resp == nil {
		return 0
	}
	return resp.StatusCode
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func main() {
	monitor := NewMonitor()
	seedDefaults(monitor)
	go monitor.Loop(5 * time.Second)
	port := getenv("PORT", "8090")
	log.Printf("health-monitor listening on :%s", port)
	if err := http.ListenAndServe(":"+port, monitor.handler()); err != nil {
		log.Fatal(err)
	}
}
