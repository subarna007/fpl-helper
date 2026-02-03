"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PlayerPageData = {
  bootstrap: any;
  fixtures: any[];
  player: any;
  team: any;
  nextFixtures: any[];
};

function positionName(elementType: number) {
  if (elementType === 1) return "Goalkeeper";
  if (elementType === 2) return "Defender";
  if (elementType === 3) return "Midfielder";
  return "Forward";
}

// Basic projected points (same style as before)
function projectPoints(player: any, fix: any, playerTeamId: number) {
  const form = Number(player.form || 0);
  const minutes = Number(player.minutes || 0);

  const minutesFactor = minutes > 900 ? 1.0 : minutes > 450 ? 0.85 : 0.65;

  let difficulty = 3;
  if (fix) {
    const isHome = fix.team_h === playerTeamId;
    difficulty = isHome ? (fix.team_h_difficulty ?? 3) : (fix.team_a_difficulty ?? 3);
  }

  const difficultyFactor =
    difficulty === 2 ? 1.08 : difficulty === 4 ? 0.92 : difficulty === 5 ? 0.85 : 1.0;

  const base = form * 1.3;
  return Math.max(0, Math.min(15, Number((base * minutesFactor * difficultyFactor).toFixed(2))));
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<PlayerPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        // Fetch shared FPL data from our proxy, using a dummy entry is not needed here,
        // so we'll call bootstrap+fixtures directly from a new endpoint in step 2.
        const res = await fetch(`/api/fpl/core`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load core data");

        const playerId = Number(params.id);
        const player = json.bootstrap.elements.find((p: any) => p.id === playerId);
        if (!player) throw new Error("Player not found");

        const team = json.bootstrap.teams.find((t: any) => t.id === player.team);

        const nextFixtures = json.fixtures
          .filter(
            (f: any) => f.event && (f.team_h === player.team || f.team_a === player.team)
          )
          .sort((a: any, b: any) => (a.event ?? 999) - (b.event ?? 999))
          .slice(0, 5);

        setData({
          bootstrap: json.bootstrap,
          fixtures: json.fixtures,
          player,
          team,
          nextFixtures,
        });
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      }
    }
    load();
  }, [params.id]);

  const projections = useMemo(() => {
    if (!data) return [];
    return data.nextFixtures.map((fix) => {
      const oppId = fix.team_h === data.player.team ? fix.team_a : fix.team_h;
      const opp = data.bootstrap.teams.find((t: any) => t.id === oppId);
      const isHome = fix.team_h === data.player.team;
      return {
        gw: fix.event,
        label: `${isHome ? "vs" : "@"} ${opp?.short_name ?? "UNK"}`,
        difficulty: isHome ? (fix.team_h_difficulty ?? 3) : (fix.team_a_difficulty ?? 3),
        projected: projectPoints(data.player, fix, data.player.team),
      };
    });
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm">
          Loading player...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm text-blue-700 underline" href="/">
            ← Back
          </Link>
          <div className="text-xs text-gray-500">Player Card</div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold">{data.player.web_name}</h1>
            <div className="text-sm text-gray-700">
              £{(data.player.now_cost / 10).toFixed(1)}m
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {positionName(data.player.element_type)} • {data.team?.name}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Form</div>
              <div className="text-lg font-semibold">{data.player.form}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total Points</div>
              <div className="text-lg font-semibold">{data.player.total_points}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Minutes</div>
              <div className="text-lg font-semibold">{data.player.minutes}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Selected By</div>
              <div className="text-lg font-semibold">{data.player.selected_by_percent}%</div>
            </div>
          </div>

          <h2 className="mt-6 font-semibold">Next 5 Fixtures + Projections</h2>
          <div className="mt-3 divide-y rounded-xl border">
            {projections.map((p) => (
              <div key={`${p.gw}-${p.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">GW {p.gw} — {p.label}</div>
                  <div className="text-xs text-gray-600">Difficulty: {p.difficulty}</div>
                </div>
                <div className="font-semibold">{p.projected} pts</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
