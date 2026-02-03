"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../_components/AppShell";
import Card from "../_components/Card";
import Link from "next/link";

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
          cache: "no-store",
        });
        const j = await r.json();
        setBootstrap(j);
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
    const arr = bootstrap.elements as any[];
    if (!s) return arr.slice(0, 60);
    return arr
      .filter((p) => (p.web_name ?? "").toLowerCase().includes(s))
      .slice(0, 80);
  }, [bootstrap, q]);

  return (
    <AppShell title="Players" subtitle="Search any player and open their profile">
      <Card>
        <div className="p-5">
          <div className="text-sm font-semibold text-gray-900">Search</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a player name (e.g. Salah)"
            className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm
                       text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/20"
          />

          {loading ? (
            <div className="mt-4 text-sm text-gray-600">Loading players…</div>
          ) : (
            <div className="mt-4 grid gap-2">
              {list.map((p: any) => {
                const team = teamsById.get(p.team);
                return (
                  <Link
                    key={p.id}
                    href={`/player/${p.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {p.web_name}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {team?.short_name ?? "UNK"} •{" "}
                          {p.element_type === 1
                            ? "GK"
                            : p.element_type === 2
                            ? "DEF"
                            : p.element_type === 3
                            ? "MID"
                            : "FWD"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500">Price</div>
                        <div className="text-sm font-semibold text-gray-900">
                          £{(p.now_cost / 10).toFixed(1)}m
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {list.length === 0 ? (
                <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                  No players found.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
