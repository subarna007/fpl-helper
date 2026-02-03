import { NextResponse } from "next/server";

const FPL = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const r = await fetch(`${FPL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

// ---------- Inline projection helpers (no imports) ----------
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

function eoPressure(ownership: number) {
  return clamp(ownership / 60, 0, 1);
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
  // “xPoints-ish” proxy: form + xGI (if provided) + mins + risk + fixture
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

function projectHorizon(p: any, gwStart: number, horizon: number, fixtures: any[]) {
  let sum = 0;
  for (let i = 0; i < horizon; i++) {
    const fx = getFixture(fixtures, p.team, gwStart + i);
    sum += projectGW(p, fx);
  }
  return Number(sum.toFixed(2));
}
// -----------------------------------------------------------

const formations = [
  { def: 3, mid: 4, fwd: 3 },
  { def: 3, mid: 5, fwd: 2 },
  { def: 4, mid: 4, fwd: 2 },
  { def: 4, mid: 3, fwd: 3 },
  { def: 5, mid: 4, fwd: 1 },
  { def: 5, mid: 3, fwd: 2 },
];

function bestXIPlusCaptain(
  squad: any[],
  gw: number,
  fixtures: any[]
): { total: number; xi: any[]; bench: any[]; captain: any } {
  const scored = squad.map((p) => {
    const fx = getFixture(fixtures, p.team, gw);
    return { p, pts: projectGW(p, fx) };
  });

  const gk = scored.filter((x) => x.p.element_type === 1).sort((a, b) => b.pts - a.pts);
  const def = scored.filter((x) => x.p.element_type === 2).sort((a, b) => b.pts - a.pts);
  const mid = scored.filter((x) => x.p.element_type === 3).sort((a, b) => b.pts - a.pts);
  const fwd = scored.filter((x) => x.p.element_type === 4).sort((a, b) => b.pts - a.pts);

  let best = { total: -1, xi: [] as any[], captain: null as any };

  for (const f of formations) {
    if (gk.length < 1 || def.length < f.def || mid.length < f.mid || fwd.length < f.fwd) continue;
    const xi = [gk[0], ...def.slice(0, f.def), ...mid.slice(0, f.mid), ...fwd.slice(0, f.fwd)];
    const sum = xi.reduce((s, x) => s + x.pts, 0);
    const cap = xi.slice().sort((a, b) => b.pts - a.pts)[0];
    const total = sum + cap.pts; // captain double modeled by adding once more
    if (total > best.total) best = { total, xi, captain: cap };
  }

  const xiIds = new Set(best.xi.map((x) => x.p.id));
  const bench = scored
    .filter((x) => !xiIds.has(x.p.id))
    .sort((a, b) => b.pts - a.pts);

  return {
    total: Number(best.total.toFixed(2)),
    xi: best.xi,
    bench: bench.slice(0, 4),
    captain: best.captain,
  };
}

function horizonScore(squad: any[], gwStart: number, horizon: number, fixtures: any[]) {
  let sum = 0;
  for (let i = 0; i < horizon; i++) {
    sum += bestXIPlusCaptain(squad, gwStart + i, fixtures).total;
  }
  return Number(sum.toFixed(2));
}

function validStructure(picks: any[]) {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0 } as any;
  for (const p of picks) c[p.element_type] += 1;
  return c[1] === 2 && c[2] === 5 && c[3] === 5 && c[4] === 3;
}

function clubCounts(picks: any[]) {
  const c: Record<number, number> = {};
  for (const p of picks) c[p.team] = (c[p.team] || 0) + 1;
  return c;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const horizon = Number(searchParams.get("horizon") || "5");

  const [bootstrap, fixtures] = await Promise.all([
    fetchJson("/bootstrap-static/"),
    fetchJson("/fixtures/"),
  ]);

  const currentEvent =
    bootstrap.events.find((e: any) => e.is_current)?.id ??
    bootstrap.events.find((e: any) => e.is_next)?.id ??
    1;

  const teamsById = new Map<number, any>();
  for (const t of bootstrap.teams) teamsById.set(t.id, t);

  // Build a safe player pool
  const pool = (bootstrap.elements as any[])
    .filter((p) => (p.status ?? "a") === "a")
    .filter((p) => Number(p.minutes || 0) >= 450)
    .filter((p) => Number(p.chance_of_playing_next_round || 100) >= 75);

  // Score pool over horizon, blend with EO slightly (premium feel)
  const scored = pool.map((p) => {
    const h = projectHorizon(p, currentEvent, horizon, fixtures);
    const eo = eoPressure(Number(p.selected_by_percent ?? 0));
    const blended = h * (1.0 + eo * 0.08);
    return { p, h, blended: Number(blended.toFixed(3)) };
  });

  function top(pos: number, n: number) {
    return scored
      .filter((x) => x.p.element_type === pos)
      .sort((a, b) => b.blended - a.blended)
      .slice(0, n)
      .map((x) => x.p);
  }

  const candGK = top(1, 12);
  const candDEF = top(2, 60);
  const candMID = top(3, 60);
  const candFWD = top(4, 40);

  // Initial team build with premium spine
  const budgetTotal = 1000;
  let budgetLeft = budgetTotal;
  let picks: any[] = [];

  function tryAdd(p: any) {
    if (picks.some((x) => x.id === p.id)) return false;
    if (budgetLeft - p.now_cost < 0) return false;

    const cc = clubCounts(picks);
    if ((cc[p.team] || 0) >= 3) return false;

    picks.push(p);
    budgetLeft -= p.now_cost;
    return true;
  }

  // Force 2 premium attackers (captain candidates)
  const premiumAttackers = [...candMID.slice(0, 20), ...candFWD.slice(0, 20)]
    .sort((a, b) => projectHorizon(b, currentEvent, horizon, fixtures) - projectHorizon(a, currentEvent, horizon, fixtures))
    .slice(0, 6);

  for (const p of premiumAttackers) {
    if (tryAdd(p) && picks.filter((x) => x.element_type === 3 || x.element_type === 4).length >= 2) break;
  }

  // Fill structure 2/5/5/3
  for (const p of candGK) if (picks.filter((x) => x.element_type === 1).length < 2) tryAdd(p);
  for (const p of candDEF) if (picks.filter((x) => x.element_type === 2).length < 5) tryAdd(p);
  for (const p of candMID) if (picks.filter((x) => x.element_type === 3).length < 5) tryAdd(p);
  for (const p of candFWD) if (picks.filter((x) => x.element_type === 4).length < 3) tryAdd(p);

  // If structure still not perfect, fill cheapest missing
  if (!validStructure(picks)) {
    const byCheap = scored.map((x) => x.p).sort((a, b) => a.now_cost - b.now_cost);
    for (const p of byCheap) {
      if (validStructure(picks)) break;
      const c = { 1: 0, 2: 0, 3: 0, 4: 0 } as any;
      for (const x of picks) c[x.element_type] += 1;
      const need =
        c[1] < 2 ? 1 : c[2] < 5 ? 2 : c[3] < 5 ? 3 : c[4] < 3 ? 4 : null;
      if (need && p.element_type === need) tryAdd(p);
    }
  }

  // Local search improvements: try swaps within position for better horizon score
  const poolsByPos: Record<number, any[]> = { 1: candGK, 2: candDEF, 3: candMID, 4: candFWD };

  function scoreNow() {
    return horizonScore(picks, currentEvent, horizon, fixtures);
  }

  let improved = true;
  let iter = 0;
  while (improved && iter < 6) {
    iter++;
    improved = false;

    const base = scoreNow();
    const clubs = clubCounts(picks);

    for (let i = 0; i < picks.length; i++) {
      const out = picks[i];
      const pos = out.element_type;
      const candidates = poolsByPos[pos] || [];

      for (const inP of candidates.slice(0, 35)) {
        if (picks.some((x) => x.id === inP.id)) continue;

        const newBudgetLeft = budgetLeft + out.now_cost - inP.now_cost;
        if (newBudgetLeft < 0) continue;

        // club constraint
        const after = { ...clubs };
        after[out.team] = (after[out.team] || 0) - 1;
        after[inP.team] = (after[inP.team] || 0) + 1;
        if (after[inP.team] > 3) continue;

        const next = picks.slice();
        next[i] = inP;
        if (!validStructure(next)) continue;

        const nextScore = horizonScore(next, currentEvent, horizon, fixtures);
        if (nextScore > base + 0.8) {
          picks = next;
          budgetLeft = newBudgetLeft;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const gw1 = bestXIPlusCaptain(picks, currentEvent, fixtures);

  function serialize(p: any) {
    const t = teamsById.get(p.team);
    return {
      id: p.id,
      name: p.web_name,
      pos: p.element_type,
      teamShort: t?.short_name ?? "UNK",
      price: p.now_cost,
    };
  }

  return NextResponse.json({
    currentEvent,
    horizon,
    itb: Number((budgetLeft / 10).toFixed(1)),
    horizonScore: horizonScore(picks, currentEvent, horizon, fixtures),
    captain: gw1.captain ? serialize(gw1.captain.p) : null,
    xi: gw1.xi.map((x) => serialize(x.p)),
    bench: gw1.bench.map((x) => serialize(x.p)),
    squad: picks.map((p) => ({
      id: p.id,
      name: p.web_name,
      pos: p.element_type,
      team: p.team,
      price: p.now_cost,
      horizonPoints: projectHorizon(p, currentEvent, horizon, fixtures),
    })),
  });
}
