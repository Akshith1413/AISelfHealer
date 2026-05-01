import { Activity, Bell, BrainCircuit, Network, ShieldCheck } from "lucide-react";
import { useRealtimeStore } from "../hooks/useRealtime.js";

export default function Header({ active, setActive }) {
  const connected = useRealtimeStore((state) => state.connected);
  const tabs = [
    { id: "map", label: "Health", icon: Network },
    { id: "metrics", label: "Metrics", icon: Activity },
    { id: "anomalies", label: "Anomalies", icon: BrainCircuit },
    { id: "healing", label: "Healing", icon: ShieldCheck },
    { id: "scaling", label: "Scaling", icon: Bell }
  ];

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink">NeuralMesh</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span className={`status-dot ${connected ? "bg-ok" : "bg-warn"}`} />
            <span>{connected ? "Live stream connected" : "Snapshot mode"}</span>
          </div>
        </div>
        <nav className="grid grid-cols-5 gap-1 rounded-md border border-line bg-slate-100 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.label}
                onClick={() => setActive(tab.id)}
                className={`flex min-w-0 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
                  selected ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:bg-white/70"
                }`}
              >
                <Icon size={17} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

