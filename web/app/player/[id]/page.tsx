import Link from "next/link";
import AppShell from "../../_components/AppShell";
import Card from "../../_components/Card";
import { BackIcon } from "../../_components/Icons";
import { FPL_HEADERS } from "../../api/_lib/picks";

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

  const difficultyFactor = diff === 2 ? 1.08 : diff === 4 ? 0.92 : diff === 5 ? 0.85 : 1.0;

  const base = form * 1.3;
  const proj = base * minutesFactor * difficultyFactor;
  return Math.max(0, Math.min(15, Number(proj.toFixed(2))));
}

// the next n matches the team has not played yet
function nextNFixtures(fixtures: any[], teamId: number, n: number) {
  return fixtures
    .filter((f) => f.event && !f.finished && (f.team_h === teamId || f.team_a === teamId))
    .sort((a, b) => (a.event ?? 999) - (b.event ?? 999))
    .slice(0, n);
}

async function fetchFpl(path: string) {
  const r = await fetch(`https://fantasy.premierleague.com/api${path}`, { cache: "no-store", headers: FPL_HEADERS });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

function diffClass(d: number) {
  if (d <= 2) return "bg-[#01FC7A] text-[#0E1A2B]";
  if (d === 3) return "bg-[#E7E7E7] text-[#0E1A2B]";
  if (d === 4) return "bg-[#FF1751] text-white";
  return "bg-[#80072D] text-white";
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Player">
      <Card>
        <div className="p-5 text-sm text-red-800">{children}</div>
      </Card>
    </AppShell>
  );
}

// Next.js 15+ passes route params as a Promise
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const playerId = parseInt(id, 10);
  if (Number.isNaN(playerId)) return <Message>That is not a valid player number: {id}</Message>;

  let bootstrap: any;
  let fixtures: any[];
  try {
    [bootstrap, fixtures] = await Promise.all([fetchFpl("/bootstrap-static/"), fetchFpl("/fixtures/")]);
  } catch {
    return <Message>The FPL website did not answer. Try again in a few minutes.</Message>;
  }

  const player = bootstrap.elements.find((p: any) => p.id === playerId);
  if (!player) return <Message>No player with number {playerId} this season.</Message>;

  const team = bootstrap.teams.find((t: any) => t.id === player.team);

  const rows = nextNFixtures(fixtures, player.team, 5).map((fix: any) => {
    const oppId = fix.team_h === player.team ? fix.team_a : fix.team_h;
    const opp = bootstrap.teams.find((t: any) => t.id === oppId);
    const isHome = fix.team_h === player.team;
    const diff = isHome ? (fix.team_h_difficulty ?? 3) : (fix.team_a_difficulty ?? 3);
    return {
      gw: fix.event,
      opp: opp?.name ?? "Unknown",
      oppShort: opp?.short_name ?? "UNK",
      isHome,
      diff,
      proj: projectPoints(player, fix, player.team),
    };
  });

  const stats = [
    { label: "Price", value: `£${(player.now_cost / 10).toFixed(1)}m` },
    { label: "Total points", value: String(player.total_points) },
    { label: "Form", value: String(player.form) },
    { label: "Minutes", value: Number(player.minutes).toLocaleString() },
    { label: "Goals", value: String(player.goals_scored ?? 0) },
    { label: "Assists", value: String(player.assists ?? 0) },
    { label: "Selected by", value: `${player.selected_by_percent}%` },
    { label: "Points per game", value: String(player.points_per_game ?? "–") },
  ];

  const flagged = player.status && player.status !== "a" && player.news;

  return (
    <AppShell>
      <Link
        href="/players"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-2 transition hover:text-pitch"
      >
        <BackIcon className="h-4 w-4" />
        All players
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="stripes p-6 text-white">
            <div className="text-sm font-semibold text-white/70">
              {posName(player.element_type)}, {team?.name ?? ""}
            </div>
            <h1 className="mt-1 font-display text-4xl font-bold sm:text-5xl">
              {player.first_name} {player.second_name}
            </h1>
            {flagged ? (
              <div className="mt-3 inline-flex rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-ink">
                {player.news}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-paper px-4 py-3">
                <div className="text-xs font-medium text-ink-2">{s.label}</div>
                <div className="tabular font-display text-2xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h2 className="font-display text-xl font-bold">Next 5 fixtures</h2>
            <p className="mt-1 text-xs text-ink-2">Projected points use form, minutes and fixture difficulty.</p>
            <ul className="mt-4 grid gap-2">
              {rows.length === 0 ? (
                <li className="rounded-xl bg-paper p-3 text-sm text-ink-2">No fixtures left this season.</li>
              ) : (
                rows.map((r) => (
                  <li key={`${r.gw}-${r.oppShort}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="tabular w-12 text-xs font-semibold text-ink-2">GW {r.gw}</span>
                    <span className={`w-14 rounded-md py-1 text-center text-xs font-bold ${diffClass(r.diff)}`}>
                      {r.oppShort} ({r.isHome ? "H" : "A"})
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{r.opp}</span>
                    <span className="tabular font-semibold">{r.proj} pts</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
