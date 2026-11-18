"use client";

import { useEffect, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";
import Segmented from "../_components/Segmented";
import Pitch from "../_components/Pitch";

export default function BestSquadPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState<1 | 3 | 5>(5);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/best-squad?horizon=${horizon}`);
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
      title="Best squad"
      subtitle="If you could start again with £100m, this is the squad the model would pick."
      right={
        <Segmented
          label="Gameweeks to optimise for"
          value={horizon}
          onChange={(v) => setHorizon(v)}
          options={[
            { value: 1, label: "1 GW" },
            { value: 3, label: "3 GWs" },
            { value: 5, label: "5 GWs" },
          ]}
        />
      }
    >
      {loading || !data ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="skeleton h-[560px]" />
          <div className="skeleton h-56" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            <Pitch
              squad={[...(Array.isArray(data.xi) ? data.xi : []), ...(Array.isArray(data.bench) ? data.bench : [])]}
              captainId={data.captain?.id ?? null}
              showLegend={false}
            />
          </Card>

          <div className="grid content-start gap-4">
            <Card>
              <div className="grid grid-cols-2 gap-3 p-5">
                <div className="col-span-2">
                  <div className="text-xs font-medium text-ink-2">Projected points, next {horizon} GW{horizon > 1 ? "s" : ""}</div>
                  <div className="tabular font-display text-4xl font-bold text-pitch">{data.horizonScore}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-ink-2">Captain</div>
                  <div className="font-semibold">{data.captain?.name ?? "–"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-ink-2">Left in the bank</div>
                  <div className="tabular font-semibold">£{data.itb}m</div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5 text-sm text-ink-2">
                Built by a simple search for high projected points within the £100m budget and the
                three-per-club rule, using only players with at least a 75% chance of playing. Tap a
                player to see their fixtures.
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
