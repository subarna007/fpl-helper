"use client";

import { useEffect, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";

function Pos({ n }: { n: number }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">
      {n === 1 ? "GK" : n === 2 ? "DEF" : n === 3 ? "MID" : "FWD"}
    </span>
  );
}

function PlayerCard({ p }: { p: any }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-sm">
      <div className="font-semibold">{p.name}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
        <Pos n={p.pos} />
        <span>{p.teamShort ?? ""}</span>
        <span>£{(p.price / 10).toFixed(1)}m</span>
      </div>
    </div>
  );
}

export default function AITeamPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState<1 | 3 | 5>(5);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/ai-team?horizon=${horizon}`);
      const j = await r.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [horizon]);

  return (
    <AppShell
      title="AI Team"
      subtitle={`Best squad optimized for next ${horizon} GWs`}
      right={
        <div className="flex gap-2">
          {[1, 3, 5].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h as any)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                horizon === h ? "bg-black text-white" : "bg-white"
              }`}
            >
              {h} GW
            </button>
          ))}
        </div>
      }
    >
      {loading || !data ? (
        <Card>
          <div className="p-6 text-sm">Building optimal team…</div>
        </Card>
      ) : (
        <div className="grid gap-5">
          {/* Summary */}
          <Card>
            <div className="p-5 flex flex-wrap gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Projected Points</div>
                <div className="font-semibold">{data.horizonScore}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Captain</div>
                <div className="font-semibold">
                  {data.captain?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ITB</div>
                <div className="font-semibold">£{data.itb}m</div>
              </div>
            </div>
          </Card>

          {/* XI */}
          <Card>
            <div className="p-5">
              <div className="text-sm font-semibold mb-3">Best XI</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Array.isArray(data.xi) ? data.xi : []).map((p: any) => (
                  <PlayerCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          </Card>

          {/* Bench */}
          <Card>
            <div className="p-5">
              <div className="text-sm font-semibold mb-3">Bench</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Array.isArray(data.bench) ? data.bench : []).map((p: any) => (
                  <PlayerCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
