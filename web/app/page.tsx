"use client";

import { useMemo, useState } from "react";

type FplResponse = {
  entry: string;
  currentEvent: number;
  bootstrap: any;
  fixtures: any[];
  picks: any;
};

function positionName(elementType: number) {
  if (elementType === 1) return "GK";
  if (elementType === 2) return "DEF";
  if (elementType === 3) return "MID";
  return "FWD";
}

function nextFixtureForPlayer(
  playerTeamId: number,
  fixtures: any[],
  currentEvent: number
) {
  const next = fixtures.find(
    (f) =>
      f.event >= currentEvent &&
      (f.team_h === playerTeamId || f.team_a === playerTeamId)
  );
  return next ?? null;
}

// Very simple projection model (MVP):
// base = form (string number) * 1.3, minutes boost, fixture difficulty penalty
function projectPoints(player: any, nextFix: any, playerTeamId: number) {
  const form = Number(player.form || 0); // FPL provides "form" as a string
  const minutes = Number(player.minutes || 0);

  // minutes factor: if low total minutes, reduce projection
  const minutesFactor = minutes > 900 ? 1.0 : minutes > 450 ? 0.85 : 0.65;

  // fixture difficulty: use difficulty if available (some endpoints include it)
  // fallback: neutral 3
  let difficulty = 3;
  if (nextFix) {
    const isHome = nextFix.team_h === playerTeamId;
    difficulty = isHome ? (nextFix.team_h_difficulty ?? 3) : (nextFix.team_a_difficulty ?? 3);
  }

  const difficultyFactor = difficulty === 2 ? 1.08 : difficulty === 4 ? 0.92 : difficulty === 5 ? 0.85 : 1.0;

  const base = form * 1.3; // tiny scaling so it feels like FPL points
  const projected = base * minutesFactor * difficultyFactor;

  // Keep it sane
  return Math.max(0, Math.min(15, Number(projected.toFixed(2))));
}

export default function HomePage() {
  const [entryId, setEntryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FplResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTeam() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`/api/fpl?entry=${encodeURIComponent(entryId.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const view = useMemo(() => {
    if (!data) return null;

    const playersById = new Map<number, any>();
    for (const p of data.bootstrap.elements) playersById.set(p.id, p);

    const teamsById = new Map<number, any>();
    for (const t of data.bootstrap.teams) teamsById.set(t.id, t);

    // picks.picks includes 15 players with positions (1-15). 1-11 starting XI.
    const picks = data.picks.picks as { element: number; position: number; is_captain: boolean; is_vice_captain: boolean }[];

    const enriched = picks.map((pk) => {
      const player = playersById.get(pk.element);
      const team = teamsById.get(player.team);
      const nextFix = nextFixtureForPlayer(player.team, data.fixtures, data.currentEvent);
      const proj = projectPoints(player, nextFix, player.team);

      return {
        ...pk,
        player,
        team,
        nextFix,
        projected: proj,
      };
    });

    enriched.sort((a, b) => a.position - b.position);

    const starters = enriched.filter((x) => x.position <= 11);
    const bench = enriched.filter((x) => x.position > 11);

    const teamProjected = starters.reduce((sum, p) => sum + p.projected, 0);

    return { starters, bench, teamProjected: Number(teamProjected.toFixed(2)) };
  }, [data]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-bold">FPL Helper (MVP)</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your FPL Team ID (Entry ID) to see your current GW team + simple next-GW projections.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:ring"
            placeholder="Example: 1234567"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
          <button
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            onClick={loadTeam}
            disabled={!entryId.trim() || loading}
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && view && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Gameweek {data.currentEvent}</h2>
                <div className="text-sm text-gray-700">
                  Team predicted (XI): <span className="font-semibold">{view.teamProjected}</span> pts
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Projections are a simple MVP formula (form + minutes + fixture difficulty factor).
              </p>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Starting XI</h3>
              <div className="mt-3 divide-y">
                {view.starters.map((p) => {
                  const fix = p.nextFix;
                  const opponentTeamId = fix
                    ? (fix.team_h === p.player.team ? fix.team_a : fix.team_h)
                    : null;

                  const opponent = opponentTeamId ? data.bootstrap.teams.find((t: any) => t.id === opponentTeamId) : null;
                  const isHome = fix ? fix.team_h === p.player.team : false;

                  return (
                    <div key={p.element} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {p.player.web_name}{" "}
                          <span className="text-gray-500">
                            ({positionName(p.player.element_type)} • {p.team.short_name})
                          </span>
                          {p.is_captain && <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs">C</span>}
                          {p.is_vice_captain && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs">VC</span>}
                        </div>
                        <div className="text-gray-700">
                          Projected: <span className="font-semibold">{p.projected}</span>
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        Next:{" "}
                        {fix && opponent ? (
                          <>
                            {isHome ? "vs" : "@"} {opponent.short_name} (GW {fix.event})
                          </>
                        ) : (
                          "No fixture found"
                        )}
                        {" • "}Form: {p.player.form} • Minutes: {p.player.minutes} • Price: £{(p.player.now_cost / 10).toFixed(1)}m
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold">Bench</h3>
              <div className="mt-3 divide-y">
                {view.bench.map((p) => (
                  <div key={p.element} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {p.player.web_name}{" "}
                        <span className="text-gray-500">
                          ({positionName(p.player.element_type)} • {p.team.short_name})
                        </span>
                      </div>
                      <div className="text-gray-700">
                        Projected: <span className="font-semibold">{p.projected}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Form: {p.player.form} • Minutes: {p.player.minutes} • Price: £{(p.player.now_cost / 10).toFixed(1)}m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 text-xs text-gray-500">
          Tip: Your FPL “Entry ID” is the number in your team’s URL on the official FPL site.
        </div>
      </div>
    </main>
  );
}
