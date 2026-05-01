import { Cpu, Gauge, GitBranch, ServerCrash } from "lucide-react";

export default function KpiStrip({ services }) {
  const degraded = services.filter((service) => service.status !== "healthy").length;
  const avgHealth = services.length ? services.reduce((sum, service) => sum + service.health_score, 0) / services.length : 0;
  const totalRps = services.reduce((sum, service) => sum + service.throughput_rps, 0);
  const replicas = services.reduce((sum, service) => sum + service.replicas, 0);
  const items = [
    { label: "Average Health", value: `${avgHealth.toFixed(1)}%`, icon: Gauge, tone: avgHealth > 90 ? "text-ok" : "text-warn" },
    { label: "Degraded", value: degraded, icon: ServerCrash, tone: degraded ? "text-warn" : "text-ok" },
    { label: "Throughput", value: `${Math.round(totalRps)} rps`, icon: Cpu, tone: "text-teal" },
    { label: "Replicas", value: replicas, icon: GitBranch, tone: "text-aubergine" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{item.label}</span>
              <Icon className={item.tone} size={19} />
            </div>
            <div className="mt-3 text-2xl font-semibold text-ink">{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}

