import { GRAFANA_URL } from "../lib/api.js";
import { ErrorRateChart, LatencyChart } from "../components/MetricCharts.jsx";

export default function MetricsExplorer({ snapshot }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <LatencyChart services={snapshot.services} />
        <ErrorRateChart services={snapshot.services} />
      </div>
      <div className="panel overflow-hidden">
        <iframe title="Grafana" src={GRAFANA_URL} className="h-[520px] w-full border-0" />
      </div>
    </div>
  );
}

