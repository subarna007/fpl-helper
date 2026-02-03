"use client";

import { createContext, useContext, useState } from "react";

type DashboardState = {
  entry: string;
  setEntry: (v: string) => void;
  data: any;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  reset: () => void;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!entry.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard?entry=${encodeURIComponent(entry)}`);
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 200));
      setData(JSON.parse(text));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load entry");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setData(null);
    setError(null);
  }

  return (
    <DashboardContext.Provider
      value={{ entry, setEntry, data, loading, error, load, reset }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
