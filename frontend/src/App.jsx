import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "./components/Header.jsx";
import KpiStrip from "./components/KpiStrip.jsx";
import HealthMap from "./pages/HealthMap.jsx";
import MetricsExplorer from "./pages/MetricsExplorer.jsx";
import AnomalyFeed from "./pages/AnomalyFeed.jsx";
import HealingLog from "./pages/HealingLog.jsx";
import ScalingHistory from "./pages/ScalingHistory.jsx";
import { fallbackSnapshot, getSnapshot, triggerChaos } from "./lib/api.js";
import { useRealtime, useRealtimeStore } from "./hooks/useRealtime.js";

export default function App() {
  const [active, setActive] = useState("map");
  const [lastChaos, setLastChaos] = useState(null);
  useRealtime();
  const { data = fallbackSnapshot } = useQuery({ queryKey: ["snapshot"], queryFn: getSnapshot });
  const healthEvents = useRealtimeStore((state) => state.health);
  const snapshot = useMemo(() => {
    if (!healthEvents.length) return data;
    const healthByService = new Map(healthEvents.map((event) => [event.service_id, event.payload?.score]));
    return {
      ...data,
      services: data.services.map((service) => {
        const score = healthByService.get(service.id);
        return score ? { ...service, health_score: score.health_score, status: score.status, p99_latency_ms: score.p99_latency_ms } : service;
      })
    };
  }, [data, healthEvents]);

  const chaosMutation = useMutation({
    mutationFn: ({ experiment, serviceName }) => triggerChaos(experiment, serviceName),
    onSuccess: setLastChaos,
    onError: () => setLastChaos({ status: "dry-run-local", result: "Chaos service unavailable from browser context" })
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Header active={active} setActive={setActive} />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5">
        <KpiStrip services={snapshot.services} />
        {lastChaos && (
          <div className="panel flex items-center justify-between gap-3 p-3 text-sm">
            <span className="font-medium text-ink">{lastChaos.experiment || "chaos"} · {lastChaos.service_name || "selected-service"}</span>
            <span className="text-slate-600">{lastChaos.result}</span>
          </div>
        )}
        {active === "map" && <HealthMap snapshot={snapshot} onChaos={(experiment, serviceName) => chaosMutation.mutate({ experiment, serviceName })} />}
        {active === "metrics" && <MetricsExplorer snapshot={snapshot} />}
        {active === "anomalies" && <AnomalyFeed snapshot={snapshot} />}
        {active === "healing" && <HealingLog snapshot={snapshot} />}
        {active === "scaling" && <ScalingHistory snapshot={snapshot} />}
      </main>
    </div>
  );
}

