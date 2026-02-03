import { NextResponse } from "next/server";

const FPL = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const r = await fetch(`${FPL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

// ---- Projection helpers (inline, no imports) ----
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function riskMultiplier(p: any) {
  if (p.status && p.status !== "a") return 0.55;
  const chance = p.chance_of_playing_next_round;
  if (chance != null) {
    const c = Number(chance);
    if (c < 50) return 0.6;
    if (c < 75) return 0.78;
    if (c < 100) return 0.92;
  }
  return 1.0;
}

function minutesMultiplier(minutes: number) {
  if (minutes > 1700) return 1.1;
  if (minutes > 1200) return 1.03;
  if (minutes > 700) return 0.98;
  if (minutes > 300) return 0.85;
  return 0.7;
}

function diffMultiplier(d: number) {
  if (d <= 2) return 1.1;
  if (d === 3) return 1.0;
  if (d === 4) return 0.92;
  return 0.86;
}

function posMultiplier(pos: number) {
  if (pos === 4) return 1.25;
  if (pos === 3) return 1.15;
  if (pos === 2) return 0.95;
  return 0.75;
}

function getFixture(fixtures: any[], teamId: number, gw: number) {
  const fx = fixtures.find(
    (f) => f.event === gw && (f.team_h === teamId || f.team_a === teamId)
  );
  if (!fx) return null;
  const isHome = fx.team_h === teamId;
  return {
    isHome,
    oppId: isHome ? fx.team_a : fx.team_h,
    difficulty: isHome ? fx.team_h_difficulty : fx.team_a_difficulty,
  };
}

function projectGW(p: any, fx: any | null) {
  const base =
    Number(p.form || 0) * 0.9 +
    Number(p.expected_goal_involvements || 0) * 8;

  const pts =
    base *
    minutesMultiplier(Number(p.minutes || 0)) *
    riskMultiplier(p) *
    posMultiplier(Number(p.element_type)) *
    diffMultiplier(Number(fx?.difficulty ?? 3));

  return clamp(Number(pts.toFixed(3)), 0, 15);
}

function riskTag(p: any) {
  if (p.status && p.status !== "a") return "injury";
  const c = p.chance_of_playing_next_round;
  if (c != null) {
    const n = Number(c);
    if (n < 50) return "injury";
    if (n < 75) return "doubt";
    if (n < 100) return "risk";
  }
  return "ok";
}
// -----------------------------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry");
  if (!entry) return NextResponse.json({ error: "Missing entry" }, { status: 400 });

  const [bootstrap, fixtures, entryInfo] = await Promise.all([
    fetchJson("/bootstrap-static/"),
    fetchJson("/fixtures/"),
    fetchJson(`/entry/${entry}/`),
  ]);

  const currentEvent =
    bootstrap.events.find((e: any) => e.is_current)?.id ??
    bootstrap.events.find((e: any) => e.is_next)?.id ??
    1;

  const picksResp = await fetchJson(`/entry/${entry}/event/${currentEvent}/picks/`);
  const picks = picksResp.picks as any[];

  const teamsById = new Map<number, any>();
  for (const t of bootstrap.teams) teamsById.set(t.id, t);

  const elementsById = new Map<number, any>();
  for (const e of bootstrap.elements) elementsById.set(e.id, e);

  const captainPick = picks.find((p) => p.is_captain);
  const vicePick = picks.find((p) => p.is_vice_captain);

  const squad = picks
    .map((pk) => {
      const raw = elementsById.get(pk.element);
      if (!raw) return null;

      const team = teamsById.get(raw.team);
      const fx = getFixture(fixtures, raw.team, currentEvent);
      const opp = fx ? teamsById.get(fx.oppId) : null;

      return {
        id: raw.id,
        name: raw.web_name,
        teamShort: team?.short_name ?? "UNK",
        teamId: raw.team,
        pos: raw.element_type,
        price: raw.now_cost,
        form: Number(raw.form ?? 0),
        minutes: Number(raw.minutes ?? 0),
        totalPoints: Number(raw.total_points ?? 0),
        ownership: Number(raw.selected_by_percent ?? 0),
        risk: riskTag(raw),
        nextFixture: fx
          ? {
              isHome: fx.isHome,
              oppShort: opp?.short_name ?? "UNK",
              difficulty: fx.difficulty ?? 3,
            }
          : null,
      };
    })
    .filter(Boolean);

  const captaincy = squad
    .map((sp: any) => {
      const raw = elementsById.get(sp.id);
      const fx = getFixture(fixtures, raw.team, currentEvent);
      const xPts = projectGW(raw, fx);
      return {
        id: sp.id,
        name: sp.name,
        teamShort: sp.teamShort,
        xPts: Number(xPts.toFixed(2)),
        ownership: sp.ownership,
        risk: sp.risk,
        fixture: sp.nextFixture,
      };
    })
    .sort((a: any, b: any) => b.xPts - a.xPts)
    .slice(0, 3);

  const meta = {
    teamValue: Number(entryInfo.last_deadline_value ?? 0),
    bank: Number(entryInfo.last_deadline_bank ?? 0),
    overallRank: Number(entryInfo.summary_overall_rank ?? 0),
    transfersAvailable: 1,
    captain: captainPick ? captainPick.element : null,
    viceCaptain: vicePick ? vicePick.element : null,
  };

  return NextResponse.json({
    entry,
    currentEvent,
    meta,
    squad,
    captaincy,
  });
}
