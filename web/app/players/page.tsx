"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";
import Segmented from "../_components/Segmented";
import { SearchIcon } from "../_components/Icons";

const POS = ["", "GK", "DEF", "MID", "FWD"];

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState(0);
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // the browser cannot call the FPL API directly (CORS), so go through our own route
        const r = await fetch("/api/fpl/core", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setBootstrap(j.bootstrap ?? null);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const teamsById = useMemo(() => {
    const m = new Map<number, any>();
    if (bootstrap?.teams) for (const t of bootstrap.teams) m.set(t.id, t);
    return m;
  }, [bootstrap]);

  const list = useMemo(() => {
    if (!bootstrap?.elements) return [];
    const s = q.trim().toLowerCase();
    return (bootstrap.elements as any[])
      .filter((p) => (pos ? p.element_type === pos : true))
      .filter((p) =>
        s
          ? `${p.web_name} ${p.first_name} ${p.second_name}`.toLowerCase().includes(s) ||
            (teamsById.get(p.team)?.name ?? "").toLowerCase().includes(s)
          : true
      )
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 60);
  }, [bootstrap, q, pos, teamsById]);

  return (
    <AppShell title="Players" subtitle="Search by player or club. Sorted by total points this season.">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search players</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Salah, Haaland, Arsenal…"
            className="w-full rounded-full border border-line bg-white py-3 pl-12 pr-4 text-[15px] shadow-sm outline-none transition placeholder:text-gray-400 focus:border-pitch focus:ring-4 focus:ring-pitch/15"
          />
        </label>
        <Segmented
          label="Position"
          value={pos}
          onChange={setPos}
          options={[
            { value: 0, label: "All" },
            { value: 1, label: "GK" },
            { value: 2, label: "DEF" },
            { value: 3, label: "MID" },
            { value: 4, label: "FWD" },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-[74px]" />
          ))}
        </div>
      ) : failed ? (
        <Card>
          <div className="p-5 text-sm text-red-800">Could not load players from the FPL website. Try again in a few minutes.</div>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <div className="p-5 text-sm text-ink-2">No players match “{q}”.</div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p: any) => {
            const team = teamsById.get(p.team);
            return (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:border-pitch hover:shadow-md"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-turf font-display text-sm font-bold text-pitch transition group-hover:bg-pitch group-hover:text-white">
                  {POS[p.element_type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.web_name}</span>
                  <span className="block truncate text-xs text-ink-2">
                    {team?.name ?? "Unknown"}, £{(p.now_cost / 10).toFixed(1)}m
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block font-display text-2xl font-bold leading-none">{p.total_points}</span>
                  <span className="text-[11px] text-ink-2">pts</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
