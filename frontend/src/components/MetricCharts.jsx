import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function LatencyChart({ services }) {
  return (
    <div className="panel p-4">
      <h2 className="text-base font-semibold text-ink">P99 Latency</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <BarChart data={services}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={72} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="p99_latency_ms" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ErrorRateChart({ services }) {
  return (
    <div className="panel p-4">
      <h2 className="text-base font-semibold text-ink">Error Rate</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <AreaChart data={services}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={72} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="error_rate" stroke="#b91c1c" fill="#fecaca" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ScalingChart({ scaling }) {
  const data = scaling.map((item) => ({
    ...item,
    accuracy_pct: Math.round(item.accuracy * 100)
  }));
  return (
    <div className="panel p-4">
      <h2 className="text-base font-semibold text-ink">Predicted vs Actual RPS</h2>
      <div className="mt-4 h-80">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="service_id" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="predicted_rps" stroke="#6b214f" strokeWidth={2} />
            <Line type="monotone" dataKey="actual_rps" stroke="#0f766e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

