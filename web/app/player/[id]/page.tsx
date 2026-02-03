import Link from "next/link";

function posName(t: number) {
  if (t === 1) return "Goalkeeper";
  if (t === 2) return "Defender";
  if (t === 3) return "Midfielder";
  return "Forward";
}

function projectPoints(player: any, fix: any, teamId: number) {
  const form = Number(player.form || 0);
  const minutes = Number(player.minutes || 0);

  const minutesFactor = minutes > 900 ? 1.0 : minutes > 450 ? 0.85 : 0.65;

  let diff = 3;
  if (fix) {
    const isHome = fix.team_h === teamId;
    diff = isHome ? (fix.team_h_difficulty ?? 3) : (fix.team_a_difficulty ?? 3);
  }

  const difficultyFactor =
    diff === 2 ? 1.08 :
    diff === 4 ? 0.92 :
    diff === 5 ? 0.85 :
    1.0;

  const base = form * 1.3;
  const proj = base * minutesFactor * difficultyFactor;
  return Math.max(0, Math.min(15, Number(proj.toFixed(2))));
}

function nextNFixtures(fixtures: any[], teamId: number, startEvent: number, n: number) {
  return fixtures
    .filter((f) => f.event && f.event >= startEvent && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event ?? 999) - (b.event ?? 999))
    .slice(0, n);
}

async function fetchFpl(path: string) {
  const r = await fetch(`https://fantasy.premierleague.com/api${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

// ✅ Next 15: params can be a Promise → we accept Promise and await it.
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅ THIS is the fix

  const playerId = parseInt(id, 10);
  if (Number.isNaN(playerId)) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm text-red-700">
          Invalid player id in URL: {id}
        </div>
      </main>
    );
  }

  let bootstrap: any;
  let fixtures: any[];

  try {
    bootstrap = await fetchFpl("/bootstrap-static/");
    fixtures = await fetchFpl("/fixtures/");
  } catch {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm text-red-700">
          Failed to load FPL data.
        </div>
      </main>
    );
  }

  const player = bootstrap.elements.find((p: any) => p.id === playerId);
  if (!player) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4 text-sm text-red-700">
          Player not found for id: {playerId}
        </div>
      </main>
    );
  }

  const team = bootstrap.teams.find((t: any) => t.id === player.team);

  const currentEvent =
    bootstrap.events.find((e: any) => e.is_current)?.id ??
    bootstrap.events.find((e: any) => e.is_next)?.id ??
    1;

  const nextFix = nextNFixtures(fixtures, player.team, currentEvent, 5);

  const rows = nextFix.map((fix: any) => {
    const oppId = fix.team_h === player.team ? fix.team_a : fix.team_h;
    const opp = bootstrap.teams.find((t: any) => t.id === oppId);
    const isHome = fix.team_h === player.team;
    const diff = isHome ? (fix.team_h_difficulty ?? 3) : (fix.team_a_difficulty ?? 3);
    const proj = projectPoints(player, fix, player.team);
    return {
      gw: fix.event,
      label: `${isHome ? "vs" : "@"} ${opp?.short_name ?? "UNK"}`,
      diff,
      proj,
    };
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-center justify-between">
          <Link className="text-sm text-blue-700 underline" href="/">
            ← Home
          </Link>
          <div className="text-xs text-gray-500">Player Card</div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold">{player.web_name}</h1>
            <div className="text-sm text-gray-700">£{(player.now_cost / 10).toFixed(1)}m</div>
          </div>

          <div className="mt-1 text-sm text-gray-600">
            {posName(player.element_type)} • {team?.name}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Form</div>
              <div className="text-lg font-semibold">{player.form}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Total Points</div>
              <div className="text-lg font-semibold">{player.total_points}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Minutes</div>
              <div className="text-lg font-semibold">{player.minutes}</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Selected By</div>
              <div className="text-lg font-semibold">{player.selected_by_percent}%</div>
            </div>
          </div>

          <h2 className="mt-6 font-semibold">Next 5 fixtures (simple projection)</h2>
          <div className="mt-3 divide-y rounded-xl border">
            {rows.map((r) => (
              <div key={`${r.gw}-${r.label}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    GW {r.gw} — {r.label}
                  </div>
                  <div className="text-xs text-gray-600">Difficulty: {r.diff}</div>
                </div>
                <div className="font-semibold">{r.proj} pts</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
