import EventTable from "../components/EventTable.jsx";
import { useRealtimeStore } from "../hooks/useRealtime.js";

export default function AnomalyFeed({ snapshot }) {
  const live = useRealtimeStore((state) => state.anomalies);
  const rows = [...live, ...(snapshot.anomalies || [])].slice(0, 100).map((event) => ({
    ...event,
    ...event.payload
  }));
  return (
    <EventTable
      rows={rows}
      columns={[
        { key: "timestamp", label: "Time", render: (row) => new Date(row.timestamp || Date.now()).toLocaleTimeString() },
        { key: "service_id", label: "Service" },
        { key: "score", label: "Score", render: (row) => row.score ?? row.lstm_probability ?? row.isolation_score },
        { key: "anomaly_type", label: "Type" },
        { key: "triggered_action", label: "Action", render: (row) => row.triggered_action || row.recommended_action }
      ]}
    />
  );
}

