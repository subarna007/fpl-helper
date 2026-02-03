"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";

type Plan = {
  label: string;
  hits: number;
  netGain: number;
  transfers: {
    out: { id: number; name: string; pos: number; cost: number; selling?: number };
    in: { id: number; name: string; pos: number; cost: number };
  }[];
  why: string[];
  byGW: {
    gw: number;
    total: number;
    xiPoints: number;
    benchPoints: number;
    captain: { id: number; name: string; pts: number } | null;
    xi: { id: number; name: string; team: string; pos: number; pts: number; fixture: any }[];
    bench: { id: number; name: string; team: string; pos: number; pts: number; fixture: any }[];
  }[];
};

function posLabel(pos: number) {
  if (pos === 1) return "GK";
  if (pos === 2) return "DEF";
  if (pos === 3) return "MID";
  return "FWD";
}

function money(cost: number) {
  return `£${(cost / 10).toFixed(1)}m`;
}

function RecBadge({ rec }: { rec: string }) {
  const cls =
    rec === "roll"
      ? "bg-green-50 border-green-200 text-green-800"
      : rec === "use_transfer"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : "bg-red-50 border-red-200 text-red-800";

  const label =
    rec === "roll" ? "ROLL TRANSFER"
    : rec === "use_transfer" ? "USE 1 TRANSFER"
    : "TAKE -4 HIT";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default function PlanPage() {
  const [entry, setEntry] = useState("");
  const [horizon, setHorizon] = useState<3 | 5>(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const [openPlan, setOpenPlan] = useState<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem("fpl_entry");
    if (saved && !entry) setEntry(saved);
  }, [entry]);

  async function load() {
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      const res = await fetch(`/api/plan?entry=${encodeURIComponent(entry.trim())}&horizon=${horizon}`);
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 220));
      const json = JSON.parse(text);
      setData(json);
      localStorage.setItem("fpl_entry", entry.trim());
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const plans: Plan[] = useMemo(() => data?.plans ?? [], [data]);
  const active = plans[openPlan] ?? null;

  return (
    <AppShell
      title="Planner"
      subtitle="Real plans: roll vs transfer vs -4. Optimized by Best XI + Captain over your horizon."
      right={
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <div className="text-[11px] font-medium text-gray-600">Entry ID</div>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="e.g. 28935"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring"
              />
            </div>

            <div className="w-[140px]">
              <div className="text-[11px] font-medium text-gray-600">Horizon</div>
              <select
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value) as any)}
              >
                <option value={3}>Next 3 GWs</option>
                <option value={5}>Next 5 GWs</option>
              </select>
            </div>

            <button
              onClick={load}
              disabled={!entry.trim() || loading}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? "Planning..." : "Generate"}
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {err}
            </div>
          )}

          {data && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-700">
              <span className="rounded-full border bg-gray-50 px-2 py-0.5">GW {data.currentEvent}</span>
              <span className="rounded-full border bg-gray-50 px-2 py-0.5">
                Bank £{(data.bank / 10).toFixed(1)}m
              </span>
              <span className="rounded-full border bg-gray-50 px-2 py-0.5">
                Baseline {data.baseline}
              </span>
            </div>
          )}
        </div>
      }
    >
      {data && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <RecBadge rec={data.recommendation} />
              <span className="text-sm font-semibold text-gray-900">{data.reason}</span>
            </div>
            <div className="text-xs text-gray-500">{data.modelNote}</div>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        {/* Left: Plan cards */}
        <div className="grid gap-4">
          {plans.map((p, idx) => (
            <Card key={idx}>
              <button
                onClick={() => setOpenPlan(idx)}
                className="w-full text-left p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Hits: {p.hits === 0 ? "0" : `-${p.hits}`} • Net gain:{" "}
                      <span className="font-semibold">
                        {p.netGain > 0 ? `+${p.netGain}` : p.netGain}
                      </span>
                    </div>
                  </div>

                  <span
                    className={[
                      "rounded-full border px-2 py-0.5 text-xs font-semibold",
                      idx === openPlan
                        ? "bg-black text-white border-black"
                        : "bg-gray-50 text-gray-700 border-gray-200",
                    ].join(" ")}
                  >
                    {idx === openPlan ? "Viewing" : "View"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {p.transfers.length === 0 ? (
                    <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                      Roll transfer
                    </div>
                  ) : (
                    p.transfers.map((t, i) => (
                      <div key={i} className="rounded-xl border bg-white p-3">
                        <div className="text-xs text-gray-500">Transfer {i + 1}</div>
                        <div className="mt-1 text-sm font-semibold">
                          {t.out.name} → {t.in.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {posLabel(t.out.pos)} • {money(t.out.cost)} → {money(t.in.cost)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 rounded-xl border bg-gray-50 p-3">
                  <div className="text-xs font-semibold text-gray-700">Why</div>
                  <ul className="mt-2 space-y-1 text-xs text-gray-600 list-disc pl-4">
                    {p.why.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </button>
            </Card>
          ))}
        </div>

        {/* Right: GW table + XI */}
        <div className="grid gap-4">
          <Card>
            <div className="p-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">GW-by-GW Projection</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Best XI + Captain each GW (bench shown separately)
                  </div>
                </div>
                {active && (
                  <div className="text-xs text-gray-700">
                    Total (horizon):{" "}
                    <span className="font-semibold">
                      {active.byGW.reduce((s, g) => s + g.total, 0).toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr className="text-left">
                      <th className="px-4 py-3">GW</th>
                      <th className="px-4 py-3">Captain</th>
                      <th className="px-4 py-3">XI</th>
                      <th className="px-4 py-3">Bench</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {!active && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-gray-600">
                          Choose a plan to view projections.
                        </td>
                      </tr>
                    )}

                    {active?.byGW.map((g) => (
                      <tr key={g.gw} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold">GW {g.gw}</td>
                        <td className="px-4 py-3">
                          {g.captain ? (
                            <span className="font-medium">{g.captain.name}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{g.xiPoints.toFixed(1)}</td>
                        <td className="px-4 py-3">{g.benchPoints.toFixed(1)}</td>
                        <td className="px-4 py-3 font-semibold">{g.total.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="text-sm font-semibold">Best XI (next GW)</div>
              <div className="mt-1 text-xs text-gray-500">
                Snapshot of the first GW in your horizon for the selected plan.
              </div>

              {active?.byGW?.[0] ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Starting XI</div>
                    <div className="mt-2 space-y-2">
                      {active.byGW[0].xi.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {p.name}{" "}
                              {active.byGW[0].captain?.id === p.id ? (
                                <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">C</span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              {p.team} • {posLabel(p.pos)} • {p.fixture ? `${p.fixture.ha} ${p.fixture.opp} (D${p.fixture.difficulty})` : "No fixture"}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{p.pts.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-700">Bench (top 3)</div>
                    <div className="mt-2 space-y-2">
                      {active.byGW[0].bench.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="mt-1 text-xs text-gray-600">
                              {p.team} • {posLabel(p.pos)} • {p.fixture ? `${p.fixture.ha} ${p.fixture.opp} (D${p.fixture.difficulty})` : "No fixture"}
                            </div>
                          </div>
                          <div className="text-sm font-semibold">{p.pts.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl border bg-gray-50 p-4 text-xs text-gray-600">
                      Next upgrade: bench order + autosub simulation (production feature).
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-gray-600">Generate plans to see the XI.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
