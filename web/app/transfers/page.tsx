"use client";

import { useEffect, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";

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

  async function load() {
    if (!entry.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/transfers?entry=${encodeURIComponent(entry.trim())}&horizon=${horizon}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
    localStorage.setItem("fpl_entry", entry.trim());
  }

  useEffect(() => {
    if (entry) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, horizon]);

  return (
    <AppShell
      title="Transfers"
      subtitle="Curated upgrades (fixture swing + EO shielding + minutes security)."
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHorizon(3)}
            className={`rounded-full border px-3 py-1 text-sm ${horizon === 3 ? "bg-black text-white border-black" : "bg-white"}`}
          >
            3 GW
          </button>
          <button
            onClick={() => setHorizon(5)}
            className={`rounded-full border px-3 py-1 text-sm ${horizon === 5 ? "bg-black text-white border-black" : "bg-white"}`}
          >
            5 GW
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        <Card>
          <div className="p-5 flex flex-wrap items-end gap-2 justify-between">
            <div className="min-w-[240px]">
              <div className="text-[11px] font-medium text-gray-600">Entry ID</div>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="e.g. 28935"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring"
              />
            </div>
            <button
              onClick={load}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!entry.trim() || loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <div className="text-xs text-gray-500">
              {data ? `GW ${data.currentEvent} • Horizon ${data.horizon}` : ""}
            </div>
          </div>
        </Card>

        {data?.suggestions?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.suggestions.map((s: any) => (
              <Card key={`${s.out.id}-${s.in.id}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-gray-500">{posLabel(s.pos)} upgrade</div>
                      <div className="mt-1 text-lg font-bold">
                        {s.out.name} → {s.in.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {money(s.out.price)} → {money(s.in.price)} • Gain{" "}
                        <span className="font-semibold">+{s.gain}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        IN EO: {Number(s.in.eo ?? 0).toFixed(1)}%
                      </div>
                    </div>
                    <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs font-semibold">
                      Score {s.score}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-700">Why</div>
                    <ul className="mt-2 space-y-1 text-xs text-gray-600 list-disc pl-4">
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
            <div className="p-5 text-sm text-gray-600">
              {loading ? "Calculating..." : "No strong upgrades found for this horizon. Rolling is likely best."}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
