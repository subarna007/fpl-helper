"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type FplResponse = {
  entry: string;
  currentEvent: number;
  bootstrap: any;
  fixtures: any[];
  picks: any;
};

function positionNameShort(elementType: number) {
  if (elementType === 1) return "GK";
  if (elementType === 2) return "DEF";
  if (elementType === 3) return "MID";
  return "FWD";
}

function nextFixtureForTeam(teamId: number, fixtures: any[], currentEvent: number) {
  const next = fixtures.find(
    (f) =>
      f.event !== null &&
      f.event !== undefined &&
      f.event >= currentEvent &&
      (f.team_h === teamId || f.team_a === teamId)
  );
  return next ?? null;
}

function projectPoints(player: any, nextFix: any, playerTeamId: number) {
  const form = Number(player.form || 0);
  const minutes = Number(player.minutes || 0);

  const minutesFactor = minutes > 900 ? 1.0 : minutes > 450 ? 0.85 : 0.65;

  let difficulty = 3;
  if (nextFix) {
    const isHome = nextFix.team_h === playerTeamId;
    difficulty = isHome
      ? (nextFix.team_h_difficulty ?? 3)
      : (nextFix.team_a_difficulty ?? 3);
  }

  const difficultyFactor =
    difficulty === 2 ? 1.08 :
    difficulty === 4 ? 0.92 :
    difficulty === 5 ? 0.85 :
    1.0;

  const base = form * 1.3;
  const projected = base * minutesFactor * difficultyFactor;

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
      const url = `/api/fpl?entry=${encodeURIComponent(entryId.trim())}`;
      const res = await fetch(url);

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(
          `Expected JSON but got "${contentType}". Open ${url} in browser to see what it returns.`
        );
      }

      const json = JSON.parse(text);
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

    const picks = data.picks.picks as {
      element: number;
      position: number;
      is_captain: boolean;
      is_vice_captain: boolean;
    }[];

    const enriched = picks.map((pk) => {
      const player = playersById.get(pk.element);
      const team = teamsById.get(player.team);

      const nextFix = nextFixtureForTeam(player.team, data.fixtures, data.currentEvent);
      const projected = projectPoints(player, nextFix, player.team);

      const oppId = nextFix
        ? nextFix.team_h === player.team
          ? nextFix.team_a
          : nextFix.team_h
        : null;

      const oppTeam = oppId ? teamsById.get(oppId) : null;
      const isHome = nextFix ? nextFix.team_h === player.team : false;

      return { ...pk, player, team, nextFix, oppTeam, isHome, projected };
    });

    enriched.sort((a, b) => a.position - b.position);

    const starters = enriched.filter((x) => x.position <= 11);
    const bench = enriched.filter((x) => x.position > 11);

    const teamProjected = starters.reduce((sum, p) => {
      const mult = p.is_captain ? 2 : 1;
      return sum + p.projected * mult;
    }, 0);

    return { starters, bench, teamProjected: Number(teamProjected.toFixed(2)) };
  }, [data]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl p-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">FPL Helper</h1>
            <p className="mt-1 text-sm text-gray-600">
              Enter your FPL Entry ID to see your GW team + simple projections.
            </p>
          </div>
          <div className="text-xs text-gray-500">Unofficial tool • Data via public FPL endpoints</div>
        </header>

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

        {!data && !error && (
          <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600">
            Tip: Your “Entry ID” is the number in your team URL on the official FPL site.
          </div>
        )}

        {data && view && (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">Gameweek {data.currentEvent}</h2>
                <div className="text-sm text-gray-700">
                  Team predicted (XI, captain included):{" "}
                  <span className="font-semibold">{view.teamProjected}</span> pts
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                MVP projection = form × minutes factor × fixture difficulty factor (captain x2).
              </p>
            </section>

            <section className="rounded-2xl border bg-white p-5">
              <h3 className="font-semibold">Starting XI</h3>
              <div className="mt-3 divide-y">
                {view.starters.map((p) => (
                  <div key={p.element} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        <Link className="text-blue-700 underline" href={`/player/${p.player.id}`}>
                          {p.player.web_name}
                        </Link>{" "}
                        <span className="text-gray-500">
                          ({positionNameShort(p.player.element_type)} • {p.team.short_name})
                        </span>
                        {p.is_captain && (
                          <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs">C</span>
                        )}
                        {p.is_vice_captain && (
                          <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs">VC</span>
                        )}
                      </div>
                      <div className="text-gray-700">
                        Projected:{" "}
                        <span className="font-semibold">
                          {p.projected}
                          {p.is_captain ? " (x2)" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                      Next:{" "}
                      {p.nextFix && p.oppTeam ? (
                        <>
                          {p.isHome ? "vs" : "@"} {p.oppTeam.short_name} (GW {p.nextFix.event})
                        </>
                      ) : (
                        "No fixture found"
                      )}
                      {" • "}Form: {p.player.form}
                      {" • "}Minutes: {p.player.minutes}
                      {" • "}Price: £{(p.player.now_cost / 10).toFixed(1)}m
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5">
              <h3 className="font-semibold">Bench</h3>
              <div className="mt-3 divide-y">
                {view.bench.map((p) => (
                  <div key={p.element} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        <Link className="text-blue-700 underline" href={`/player/${p.player.id}`}>
                          {p.player.web_name}
                        </Link>{" "}
                        <span className="text-gray-500">
                          ({positionNameShort(p.player.element_type)} • {p.team.short_name})
                        </span>
                      </div>
                      <div className="text-gray-700">
                        Projected: <span className="font-semibold">{p.projected}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-gray-600">
                      Form: {p.player.form}
                      {" • "}Minutes: {p.player.minutes}
                      {" • "}Price: £{(p.player.now_cost / 10).toFixed(1)}m
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
