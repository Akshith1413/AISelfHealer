import { useEffect } from "react";
import { io } from "socket.io-client";
import { create } from "zustand";
import { SOCKET_URL } from "../lib/api.js";

export const useRealtimeStore = create((set) => ({
  anomalies: [],
  healing: [],
  scaling: [],
  health: [],
  chaos: [],
  connected: false,
  push: (key, event) => set((state) => ({ [key]: [event, ...state[key]].slice(0, 100) })),
  setConnected: (connected) => set({ connected })
}));

export function useRealtime() {
  const push = useRealtimeStore((state) => state.push);
  const setConnected = useRealtimeStore((state) => state.setConnected);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], reconnectionDelay: 1500 });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("anomaly.detected", (event) => push("anomalies", event));
    socket.on("healing.started", (event) => push("healing", event));
    socket.on("healing.complete", (event) => push("healing", event));
    socket.on("scale.event", (event) => push("scaling", event));
    socket.on("service.health", (event) => push("health", event));
    socket.on("chaos.started", (event) => push("chaos", event));
    socket.on("chaos.completed", (event) => push("chaos", event));
    return () => socket.disconnect();
  }, [push, setConnected]);
}

