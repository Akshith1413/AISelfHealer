import { ScalingChart } from "../components/MetricCharts.jsx";
import EventTable from "../components/EventTable.jsx";
import { useRealtimeStore } from "../hooks/useRealtime.js";

export default function ScalingHistory({ snapshot }) {
  const live = useRealtimeStore((state) => state.scaling).map((event) => ({ ...event, ...event.payload }));
  const rows = [...live, ...(snapshot.scaling || [])].slice(0, 100);
  return (
    <div className="grid gap-4">
      <ScalingChart scaling={rows} />
      <EventTable
        rows={rows}
        columns={[
          { key: "service_id", label: "Service" },
          { key: "predicted_rps", label: "Predicted RPS" },
          { key: "actual_rps", label: "Actual RPS" },
          { key: "replicas", label: "Replicas", render: (row) => row.replicas || row.recommended_replicas || row.applied_replicas },
          { key: "accuracy", label: "Accuracy", render: (row) => (row.accuracy ? `${Math.round(row.accuracy * 100)}%` : row.confidence ? `${Math.round(row.confidence * 100)}%` : "") }
        ]}
      />
    </div>
  );
}

