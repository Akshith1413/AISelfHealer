CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY['viewer'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS service_metrics (
  id UUID DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  service_id TEXT NOT NULL,
  p99_latency_ms DOUBLE PRECISION NOT NULL,
  error_rate DOUBLE PRECISION NOT NULL,
  throughput_rps DOUBLE PRECISION NOT NULL,
  cpu_percent DOUBLE PRECISION NOT NULL,
  memory_mb DOUBLE PRECISION NOT NULL,
  gc_pause_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  db_pool_wait_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  request_count BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (id, recorded_at)
);

SELECT create_hypertable('service_metrics', 'recorded_at', chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);

CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  tenant_id,
  service_id,
  time_bucket('1 hour', recorded_at) AS hour,
  avg(p99_latency_ms) AS avg_p99,
  max(p99_latency_ms) AS max_p99,
  avg(error_rate) AS avg_error_rate,
  sum(request_count) AS total_requests
FROM service_metrics
GROUP BY tenant_id, service_id, hour;

SELECT add_retention_policy('service_metrics', INTERVAL '90 days', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  tenant_id UUID,
  payload JSONB NOT NULL,
  causation_id UUID,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  service_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE service_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON service_metrics;
CREATE POLICY tenant_isolation ON service_metrics
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

INSERT INTO tenants (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Tenant')
ON CONFLICT DO NOTHING;

