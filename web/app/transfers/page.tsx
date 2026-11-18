"use client";

import { useEffect, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";
import Segmented from "../_components/Segmented";

function posLabel(pos: number) {
  return pos === 2 ? "DEF" : pos === 3 ? "MID" : "FWD";
}
function money(cost: number) {
  return `£${(cost / 10).toFixed(1)}m`;
}

export default function TransfersPage() {
  const [entry, setEntry] = useState("");
  const [horizon, setHorizon] = useState<3 | 5>(5);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fpl_entry");
    if (saved) setEntry(saved);
  }, []);

  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!entry.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/transfers?entry=${encodeURIComponent(entry.trim())}&horizon=${horizon}`);
      const text = await res.text();
      if (!res.ok) throw new Error("Could not load transfers for that team ID. Check the number and try again.");
      setData(JSON.parse(text));
      localStorage.setItem("fpl_entry", entry.trim());
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (entry) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, horizon]);

  return (
    <AppShell
      title="Transfers"
      subtitle="Players worth bringing in, ranked by projected gain over the coming fixtures, with the reasons."
      right={
        <Segmented
          label="Gameweeks to look ahead"
          value={horizon}
          onChange={(v) => setHorizon(v)}
          options={[
            { value: 3, label: "Next 3 GWs" },
            { value: 5, label: "Next 5 GWs" },
          ]}
        />
      }
    >
      <div className="grid gap-4">
        <Card>
          <div className="p-5 flex flex-wrap items-end gap-2 justify-between">
            <div className="min-w-[240px]">
              <div className="text-[11px] font-medium text-ink-2">Team ID</div>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="e.g. 28935"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-pitch focus:ring-4 focus:ring-pitch/15"
              />
            </div>
            <button
              onClick={load}
              className="rounded-xl bg-pitch px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-50"
              disabled={!entry.trim() || loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <div className="text-xs text-ink-2">
              {data ? `GW ${data.currentEvent} • Horizon ${data.horizon}` : ""}
            </div>
          </div>
          {err ? (
            <div role="alert" className="mx-5 mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {err}
            </div>
          ) : null}
        </Card>

        {data?.suggestions?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.suggestions.map((s: any) => (
              <Card key={`${s.out.id}-${s.in.id}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-ink-2">{posLabel(s.pos)} upgrade</div>
                      <div className="mt-1 text-lg font-bold">
                        {s.out.name} → {s.in.name}
                      </div>
                      <div className="mt-1 text-sm text-ink-2">
                        {money(s.out.price)} → {money(s.in.price)} • Gain{" "}
                        <span className="font-semibold">+{s.gain}</span>
                      </div>
                      <div className="mt-1 text-xs text-ink-2">
                        IN EO: {Number(s.in.eo ?? 0).toFixed(1)}%
                      </div>
                    </div>
                    <span className="rounded-full border bg-paper px-3 py-1 text-xs font-semibold">
                      Score {s.score}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border bg-paper p-3">
                    <div className="text-xs font-semibold text-ink-2">Why</div>
                    <ul className="mt-2 space-y-1 text-xs text-ink-2 list-disc pl-4">
                      {s.reasons.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-5 text-sm text-ink-2">
              {loading ? "Calculating..." : "No strong upgrades found for this horizon. Rolling is likely best."}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
