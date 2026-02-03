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
function projectHorizon(p: any, gwStart: number, horizon: number, fixtures: any[]) {
  let sum = 0;
  for (let i = 0; i < horizon; i++) {
    const fx = getFixture(fixtures, p.team, gwStart + i);
    sum += projectGW(p, fx);
  }
  return Number(sum.toFixed(2));
}
function fixtureSwingScore(teamId: number, gwStart: number, horizon: number, fixtures: any[]) {
  let s = 0;
  for (let i = 0; i < horizon; i++) {
    const fx = getFixture(fixtures, teamId, gwStart + i);
    const d = Number(fx?.difficulty ?? 3);
    s += (3 - d) * 0.6;
  }
  return Number(s.toFixed(2));
}
function eoPressure(ownership: number) {
  return clamp(ownership / 60, 0, 1);
}
// -----------------------------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry");
  const horizon = Number(searchParams.get("horizon") || "5");
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

  const elementsById = new Map<number, any>();
  for (const e of bootstrap.elements) elementsById.set(e.id, e);

  const squad = picks.map((p) => elementsById.get(p.element)).filter(Boolean);
  const squadIds = new Set(squad.map((p: any) => p.id));

  const bank = Number(entryInfo.last_deadline_bank ?? 0);

  const outCandidates = squad
    .filter((p: any) => p.element_type !== 1)
    .map((p: any) => {
      const pk = picks.find((x) => x.element === p.id);
      const selling = Number(pk?.selling_price ?? p.now_cost);
      const hp = projectHorizon(p, currentEvent, horizon, fixtures);
      const swing = fixtureSwingScore(p.team, currentEvent, horizon, fixtures);
      return { p, selling, hp, swing };
    })
    .sort((a, b) => a.hp - b.hp)
    .slice(0, 8);

  const pool = (bootstrap.elements as any[])
    .filter((p) => !squadIds.has(p.id))
    .filter((p) => (p.status ?? "a") === "a")
    .filter((p) => Number(p.minutes || 0) >= 450)
    .filter((p) => Number(p.chance_of_playing_next_round || 100) >= 75);

  const clubCount: Record<number, number> = {};
  for (const p of squad) clubCount[p.team] = (clubCount[p.team] || 0) + 1;

  const suggestions: any[] = [];

  for (const out of outCandidates) {
    const outP = out.p;
    const maxSpend = bank + out.selling;

    const cands = pool
      .filter((p) => p.element_type === outP.element_type)
      .filter((p) => p.now_cost <= maxSpend)
      .filter((p) => {
        const cnt = clubCount[p.team] || 0;
        const would = p.team === outP.team ? cnt : cnt + 1;
        return would <= 3;
      })
      .map((p) => {
        const hp = projectHorizon(p, currentEvent, horizon, fixtures);
        const swing = fixtureSwingScore(p.team, currentEvent, horizon, fixtures);
        const eo = Number(p.selected_by_percent ?? 0);
        return { p, hp, swing, eo };
      })
      .sort((a, b) => b.hp - a.hp)
      .slice(0, 12);

    for (const c of cands.slice(0, 10)) {
      const gain = c.hp - out.hp;
      const score = gain + eoPressure(c.eo) * 1.2 + Math.max(0, c.swing - out.swing) * 0.8;
      if (score < 1.6) continue;

      const reasons: string[] = [];
      if (gain > 2) reasons.push(`+${gain.toFixed(1)} pts over ${horizon} GWs`);
      if (c.swing > out.swing + 0.8) reasons.push("Fixture swing improves");
      if (c.eo >= 20) reasons.push(`EO shield (${c.eo.toFixed(1)}% owned)`);
      if (reasons.length < 3) reasons.push("Minutes security + low injury risk");

      suggestions.push({
        pos: outP.element_type,
        out: { id: outP.id, name: outP.web_name, price: outP.now_cost },
        in: { id: c.p.id, name: c.p.web_name, price: c.p.now_cost, eo: c.eo },
        gain: Number(gain.toFixed(2)),
        score: Number(score.toFixed(2)),
        reasons: reasons.slice(0, 3),
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);

  const final: any[] = [];
  const seenPos = new Set<number>();
  for (const s of suggestions) {
    if (seenPos.has(s.pos)) continue;
    seenPos.add(s.pos);
    final.push(s);
    if (final.length >= 5) break;
  }

  return NextResponse.json({
    entry,
    currentEvent,
    horizon,
    suggestions: final,
  });
}
