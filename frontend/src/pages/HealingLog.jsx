import EventTable from "../components/EventTable.jsx";
import { useRealtimeStore } from "../hooks/useRealtime.js";

export default function HealingLog({ snapshot }) {
  const live = useRealtimeStore((state) => state.healing);
  const rows = [...live, ...(snapshot.healing || [])].slice(0, 100).map((event) => ({
    ...event,
    ...event.payload
  }));
  return (
    <EventTable
      rows={rows}
      columns={[
        { key: "timestamp", label: "Time", render: (row) => new Date(row.timestamp || Date.now()).toLocaleTimeString() },
        { key: "service_id", label: "Service" },
        { key: "action", label: "Action" },
        { key: "before", label: "Before" },
        { key: "after", label: "After" },
        { key: "recovery_seconds", label: "Recovery", render: (row) => (row.recovery_seconds ? `${row.recovery_seconds}s` : "") },
        { key: "model", label: "Model" }
      ]}
    />
  );
}

