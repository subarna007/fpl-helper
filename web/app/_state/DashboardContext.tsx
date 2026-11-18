"use client";

import { createContext, useContext, useEffect, useState } from "react";

const KEY = "fpl_entry";

type DashboardState = {
  entry: string;
  setEntry: (v: string) => void;
  /** the team ID that loaded successfully and is remembered across pages */
  savedEntry: string;
  data: any;
  loading: boolean;
  error: string | null;
  load: (id?: string) => Promise<void>;
  reset: () => void;
  changeTeam: () => void;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [entry, setEntry] = useState("");
  const [savedEntry, setSavedEntry] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(id?: string) {
    const value = (id ?? entry).trim();
    if (!value) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/dashboard?entry=${encodeURIComponent(value)}`);
      const text = await res.text();
      if (!res.ok) {
        let msg = text.slice(0, 200);
        try {
          msg = JSON.parse(text).error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      setData(JSON.parse(text));
      setSavedEntry(value);
      try {
        localStorage.setItem(KEY, value);
      } catch {}
    } catch (e: any) {
      setError(e?.message ?? "Could not load that team");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // reopen the last team automatically
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) ?? "";
    } catch {}
    if (saved) {
      setEntry(saved);
      setSavedEntry(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setData(null);
    setError(null);
  }

  function changeTeam() {
    setData(null);
    setError(null);
    setEntry("");
    setSavedEntry("");
    try {
      localStorage.removeItem(KEY);
    } catch {}
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return (
    <DashboardContext.Provider
      value={{ entry, setEntry, savedEntry, data, loading, error, load, reset, changeTeam }}
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
