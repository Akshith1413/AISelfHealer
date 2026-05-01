import { useState } from "react";
import { FlaskConical, ShieldCheck } from "lucide-react";
import ServiceGraph from "../components/ServiceGraph.jsx";

export default function HealthMap({ snapshot, onChaos }) {
  const [selected, setSelected] = useState(snapshot.services[0]?.id);
  const service = snapshot.services.find((item) => item.id === selected) || snapshot.services[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <ServiceGraph services={snapshot.services} edges={snapshot.edges} onSelect={setSelected} />
      <aside className="panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{service?.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{service?.status}</p>
          </div>
          <span className={`rounded px-2 py-1 text-sm font-semibold text-white ${service?.health_score >= 90 ? "bg-ok" : service?.health_score >= 75 ? "bg-warn" : "bg-danger"}`}>
            {Math.round(service?.health_score || 0)}%
          </span>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded border border-line p-3">
            <dt className="text-xs text-slate-500">P99</dt>
            <dd className="mt-1 text-lg font-semibold">{service?.p99_latency_ms} ms</dd>
          </div>
          <div className="rounded border border-line p-3">
            <dt className="text-xs text-slate-500">Errors</dt>
            <dd className="mt-1 text-lg font-semibold">{((service?.error_rate || 0) * 100).toFixed(2)}%</dd>
          </div>
          <div className="rounded border border-line p-3">
            <dt className="text-xs text-slate-500">RPS</dt>
            <dd className="mt-1 text-lg font-semibold">{Math.round(service?.throughput_rps || 0)}</dd>
          </div>
          <div className="rounded border border-line p-3">
            <dt className="text-xs text-slate-500">Replicas</dt>
            <dd className="mt-1 text-lg font-semibold">{service?.replicas}</dd>
          </div>
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            title="Trigger dry-run pod kill"
            onClick={() => onChaos("pod_kill", service?.id)}
            className="flex items-center justify-center gap-2 rounded bg-ink px-3 py-2 text-sm font-semibold text-white"
          >
            <FlaskConical size={17} />
            Pod Kill
          </button>
          <button
            type="button"
            title="Trigger dry-run latency"
            onClick={() => onChaos("network_latency", service?.id)}
            className="flex items-center justify-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
          >
            <ShieldCheck size={17} />
            Latency
          </button>
        </div>
      </aside>
    </div>
  );
}

