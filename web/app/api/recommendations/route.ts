import { NextResponse } from "next/server";
import { fetchUpcomingOdds, findOddsForFixture, implied1X2, impliedOver25 } from "../_lib/odds";

const FPL = "https://fantasy.premierleague.com/api";
async function fetchJson(path: string) {
  const r = await fetch(`${FPL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function playable(p: any) {
  if (p.status && p.status !== "a") return false;
  const chance = p.chance_of_playing_next_round;
  if (chance != null && Number(chance) < 50) return false;
  if (Number(p.minutes || 0) < 180) return false;
  return true;
}

function minutesFactor(minutes: number) {
  if (minutes > 1600) return 1.08;
  if (minutes > 900) return 1.0;
  if (minutes > 450) return 0.85;
  return 0.70;
}

function fixtureForTeamGW(fixtures: any[], teamId: number, gw: number) {
  const list = fixtures.filter((f) => f.event === gw && (f.team_h === teamId || f.team_a === teamId));
  return list.length ? list[0] : null;
}

function fallbackDiffFactor(diff: number) {
  // If odds missing, use fixture difficulty as fallback
  if (diff === 2) return 1.08;
  if (diff === 4) return 0.92;
  if (diff === 5) return 0.85;
  return 1.0;
}

function projectPlayerGw(p: any, fx: any, bootstrap: any, oddsRows: any[]) {
  const teams = bootstrap.teams;
  const team = teams.find((t: any) => t.id === p.team);

  const form = Number(p.form || 0);
  const minutes = Number(p.minutes || 0);
  const xgi = Number(p.expected_goal_involvements || 0);
  const apps = Math.max(1, Number(p.starts || 0) + Number(p.bench || 0));
  const xgiPerGame = xgi / apps;

  let opponent: any = null;
  let isHome = true;
  let kickoff: string | null = null;
  let diff = 3;

  if (fx) {
    kickoff = fx.kickoff_time ?? null;
    isHome = fx.team_h === p.team;
    const oppId = isHome ? fx.team_a : fx.team_h;
    opponent = teams.find((t: any) => t.id === oppId);

    diff = isHome ? (fx.team_h_difficulty ?? 3) : (fx.team_a_difficulty ?? 3);
  }

  // Odds (if match found)
  let pWin: number | null = null;
  let pOver25: number | null = null;

  if (fx && team && opponent) {
    const odds = findOddsForFixture(
      oddsRows,
      kickoff,
      isHome ? team.name : opponent.name,
      isHome ? opponent.name : team.name
    );

    if (odds) {
      const oneXtwo = implied1X2(odds.avgH, odds.avgD, odds.avgA);
      const ou = impliedOver25(odds.avgO25, odds.avgU25);
      if (oneXtwo) pWin = isHome ? oneXtwo.pH : oneXtwo.pA;
      if (ou) pOver25 = ou.pOver25;
    }
  }

  const atk = isHome ? team?.strength_attack_home ?? 3 : team?.strength_attack_away ?? 3;
  const def = isHome ? team?.strength_defence_home ?? 3 : team?.strength_defence_away ?? 3;
  const strengthFactor = (atk / 3) * 0.65 + (def / 3) * 0.35;

  const pos = Number(p.element_type);
  const posAtk = pos === 4 ? 1.25 : pos === 3 ? 1.15 : pos === 2 ? 0.85 : 0.65;

  // If odds missing, use difficulty fallback
  const diffFactor = fallbackDiffFactor(diff);

  const goalsBoost = pOver25 == null ? 1.0 : (0.7 + 0.9 * pOver25);
  const winBoost = pWin == null ? 1.0 : (0.8 + 0.6 * pWin);
  const defBoost =
    pos <= 2
      ? (pOver25 == null ? 1.0 : (0.9 + 0.8 * (1 - pOver25)) * (pWin == null ? 1.0 : (0.9 + 0.6 * pWin)))
      : 1;

  const base = (form * 0.65 + xgiPerGame * 8.8) * posAtk;
  const proj =
    base *
    minutesFactor(minutes) *
    strengthFactor *
    goalsBoost *
    winBoost *
    defBoost *
    diffFactor;

  return clamp(Number(proj.toFixed(3)), 0, 15);
}

const formations = [
  { def: 3, mid: 4, fwd: 3 },
  { def: 3, mid: 5, fwd: 2 },
  { def: 4, mid: 4, fwd: 2 },
  { def: 4, mid: 3, fwd: 3 },
  { def: 5, mid: 4, fwd: 1 },
  { def: 5, mid: 3, fwd: 2 },
  { def: 5, mid: 2, fwd: 3 },
];

function bestXIValue(squad: any[], gw: number, fixtures: any[], bootstrap: any, oddsRows: any[]) {
  const scored = squad.map((p) => {
    const fx = fixtureForTeamGW(fixtures, p.team, gw);
    return { p, pts: projectPlayerGw(p, fx, bootstrap, oddsRows) };
  });

  const gk = scored.filter((x) => x.p.element_type === 1).sort((a, b) => b.pts - a.pts);
  const def = scored.filter((x) => x.p.element_type === 2).sort((a, b) => b.pts - a.pts);
  const mid = scored.filter((x) => x.p.element_type === 3).sort((a, b) => b.pts - a.pts);
  const fwd = scored.filter((x) => x.p.element_type === 4).sort((a, b) => b.pts - a.pts);

  if (!gk.length) return 0;

  let best = 0;
  for (const f of formations) {
    if (def.length < f.def || mid.length < f.mid || fwd.length < f.fwd) continue;
    const xi = [gk[0], ...def.slice(0, f.def), ...mid.slice(0, f.mid), ...fwd.slice(0, f.fwd)];
    const sum = xi.reduce((s, x) => s + x.pts, 0);
    const cap = xi.slice().sort((a, b) => b.pts - a.pts)[0];
    best = Math.max(best, Number((sum + cap.pts).toFixed(3)));
  }
  return best;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry");
  const horizon = Number(searchParams.get("horizon") || "5");

  if (!entry) return NextResponse.json({ error: "Missing entry" }, { status: 400 });

  try {
    const [bootstrap, fixtures, oddsRows, entryInfo] = await Promise.all([
      fetchJson("/bootstrap-static/"),
      fetchJson("/fixtures/"),
      fetchUpcomingOdds(),
      fetchJson(`/entry/${entry}/`),
    ]);

    const currentEvent =
      bootstrap.events.find((e: any) => e.is_current)?.id ??
      bootstrap.events.find((e: any) => e.is_next)?.id ??
      1;

    const picksResp = await fetchJson(`/entry/${entry}/event/${currentEvent}/picks/`);
    const picks = picksResp.picks as any[];

    const playersById = new Map<number, any>();
    for (const p of bootstrap.elements) playersById.set(p.id, p);

    const squad = picks.map((pk) => playersById.get(pk.element)).filter(Boolean);
    const squadIds = new Set(squad.map((p: any) => p.id));

    const bank = Number(entryInfo?.last_deadline_bank ?? 0);
    const gwList = Array.from({ length: horizon }, (_, i) => currentEvent + i);

    const baseline = Number(
      gwList.reduce((s, gw) => s + bestXIValue(squad, gw, fixtures, bootstrap, oddsRows), 0).toFixed(3)
    );

    // club count for constraint
    const teamCount: Record<number, number> = {};
    for (const p of squad) teamCount[p.team] = (teamCount[p.team] || 0) + 1;

    // OUT candidates: ignore GK by default, consider flagged/weak horizon
    const outCandidates = squad
      .map((p: any) => {
        const pk = picks.find((x) => x.element === p.id);
        const selling = Number(pk?.selling_price ?? p.now_cost);
        const tot = Number(
          gwList.reduce((s, gw) => s + projectPlayerGw(p, fixtureForTeamGW(fixtures, p.team, gw), bootstrap, oddsRows), 0).toFixed(3)
        );
        const flagRisk =
          (p.chance_of_playing_next_round != null && Number(p.chance_of_playing_next_round) < 100) ||
          (p.status && p.status !== "a");

        return { p, selling, tot, flagRisk };
      })
      .filter((x) => x.p.element_type !== 1) // ✅ skip GK
      .sort((a, b) => (a.flagRisk === b.flagRisk ? a.tot - b.tot : a.flagRisk ? -1 : 1))
      .slice(0, 10);

    const pool = (bootstrap.elements as any[])
      .filter((p) => playable(p) && !squadIds.has(p.id));

    // shortlist by pos using horizon projection
    const shortByPos: Record<number, any[]> = { 2: [], 3: [], 4: [] };
    for (const pos of [2, 3, 4]) {
      shortByPos[pos] = pool
        .filter((p) => p.element_type === pos)
        .map((p) => {
          const tot = Number(
            gwList.reduce((s, gw) => s + projectPlayerGw(p, fixtureForTeamGW(fixtures, p.team, gw), bootstrap, oddsRows), 0).toFixed(3)
          );
          return { p, tot };
        })
        .sort((a, b) => b.tot - a.tot)
        .slice(0, 50);
    }

    const allMoves: any[] = [];

    for (const out of outCandidates) {
      const pos = out.p.element_type;
      const maxSpend = bank + out.selling;

      const inList = (shortByPos[pos] ?? []).slice(0, 30);
      for (const cand of inList) {
        const inP = cand.p;
        if (inP.now_cost > maxSpend) continue;

        const cnt = teamCount[inP.team] || 0;
        const would = inP.team === out.p.team ? cnt : cnt + 1;
        if (would > 3) continue;

        const newSquad = squad.map((p: any) => (p.id === out.p.id ? inP : p));
        const newScore = Number(
          gwList.reduce((s, gw) => s + bestXIValue(newSquad, gw, fixtures, bootstrap, oddsRows), 0).toFixed(3)
        );

        const gain = Number((newScore - baseline).toFixed(3));
        allMoves.push({
          gain,
          out: { id: out.p.id, name: out.p.web_name, pos, selling: out.selling, cost: out.p.now_cost },
          in: { id: inP.id, name: inP.web_name, pos, cost: inP.now_cost },
        });
      }
    }

    allMoves.sort((a, b) => b.gain - a.gain);

    // Balanced result: max 2 per pos
    const picked: any[] = [];
    const perPos: Record<number, number> = { 2: 0, 3: 0, 4: 0 };
    for (const m of allMoves) {
      if (picked.length >= 8) break;
      if (perPos[m.out.pos] >= 2) continue;
      if (m.gain <= 0) continue; // ✅ remove zero-gain spam
      perPos[m.out.pos] += 1;
      picked.push(m);
    }

    // if everything is tiny, still show top 5 even if gain ~0.01 (not zero)
    if (picked.length === 0) {
      for (const m of allMoves.slice(0, 5)) {
        if (picked.length >= 5) break;
        picked.push(m);
      }
    }

    return NextResponse.json({
      entry,
      currentEvent,
      horizon,
      bank,
      baseline,
      recommendations: picked,
      modelNote:
        "Upgrades ranked by XI+cpt gain over horizon. GK swaps hidden. Budget uses bank + selling price. Odds used when match found; otherwise fixture difficulty fallback.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
