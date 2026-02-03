// app/_lib/projection.ts

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function riskMultiplier(p: any) {
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

export function minutesMultiplier(minutes: number) {
  if (minutes > 1700) return 1.1;
  if (minutes > 1200) return 1.03;
  if (minutes > 700) return 0.98;
  if (minutes > 300) return 0.85;
  return 0.7;
}

export function diffMultiplier(d: number) {
  if (d <= 2) return 1.1;
  if (d === 3) return 1.0;
  if (d === 4) return 0.92;
  return 0.86;
}

export function posMultiplier(pos: number) {
  if (pos === 4) return 1.25;
  if (pos === 3) return 1.15;
  if (pos === 2) return 0.95;
  return 0.75;
}

export function getFixture(fixtures: any[], teamId: number, gw: number) {
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

export function projectGW(p: any, fx: any | null, teamsById: Map<number, any>) {
  const team = teamsById.get(p.team);
  const base =
    Number(p.form || 0) * 0.9 +
    (Number(p.expected_goal_involvements || 0) * 8);

  const pts =
    base *
    minutesMultiplier(Number(p.minutes || 0)) *
    riskMultiplier(p) *
    posMultiplier(p.element_type) *
    diffMultiplier(fx?.difficulty ?? 3);

  return clamp(Number(pts.toFixed(3)), 0, 15);
}

export function projectHorizon(
  p: any,
  gwStart: number,
  horizon: number,
  fixtures: any[],
  teamsById: Map<number, any>
) {
  let sum = 0;
  for (let i = 0; i < horizon; i++) {
    const fx = getFixture(fixtures, p.team, gwStart + i);
    sum += projectGW(p, fx, teamsById);
  }
  return Number(sum.toFixed(2));
}

export function fixtureSwingScore(
  teamId: number,
  gwStart: number,
  horizon: number,
  fixtures: any[]
) {
  let s = 0;
  for (let i = 0; i < horizon; i++) {
    const fx = getFixture(fixtures, teamId, gwStart + i);
    const d = fx?.difficulty ?? 3;
    s += (3 - d) * 0.6;
  }
  return Number(s.toFixed(2));
}

export function eoPressure(ownership: number) {
  return clamp(ownership / 60, 0, 1);
}
