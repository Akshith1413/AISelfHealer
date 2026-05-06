$ErrorActionPreference = "Stop"

Write-Host "NeuralMesh demo starting..."

$authBody = @{ email = "demo@neuralmesh.local"; password = "Passw0rd!"; roles = @("super_admin") } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/auth/register" -Body $authBody -ContentType "application/json" | Out-Null
} catch {
  Write-Host "Register skipped or already handled."
}

$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/auth/login" -Body (@{ email = "demo@neuralmesh.local"; password = "Passw0rd!" } | ConvertTo-Json) -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

Write-Host "Sending anomalous telemetry..."
$telemetry = @{
  service_id = "data-service"
  p99_latency_ms = 980
  error_rate = 0.12
  throughput_rps = 780
  cpu_percent = 94
  memory_mb = 2300
  db_pool_wait_ms = 320
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/metrics/telemetry" -Headers $headers -Body $telemetry -ContentType "application/json" | ConvertTo-Json -Depth 8

Write-Host "Triggering dry-run chaos..."
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/v1/chaos/run" -Headers $headers -Body (@{ experiment = "pod_kill"; service_name = "data-service"; dry_run = $true } | ConvertTo-Json) -ContentType "application/json" | ConvertTo-Json -Depth 8

Write-Host "Dashboard: http://localhost:5173"
Write-Host "Grafana: http://localhost:3000"
Write-Host "Jaeger: http://localhost:16686"

