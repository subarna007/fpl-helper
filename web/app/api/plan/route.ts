import { NextResponse } from "next/server";

const FPL = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const r = await fetch(`${FPL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`FPL request failed: ${r.status}`);
  return r.json();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function riskPenalty(p: any) {
  // injury status: a/d/i/s/u etc
  if (p.status && p.status !== "a") return 0.55;
  const chance = p.chance_of_playing_next_round;
  if (chance != null) {
    const c = Number(chance);
    if (c < 50) return 0.60;
    if (c < 75) return 0.78;
    if (c < 100) return 0.92;
  }
  return 1.0;
}

function minutesFactor(minutes: number) {
  if (minutes > 1600) return 1.08;
  if (minutes > 900) return 1.0;
  if (minutes > 450) return 0.86;
  return 0.72;
}

function diffFactor(d: number) {
  // difficulty 1..5
  if (d <= 2) return 1.10;
  if (d === 3) return 1.0;
  if (d === 4) return 0.92;
  return 0.86;
}

function getFixture(fixtures: any[], teamId: number, gw: number) {
  const fx = fixtures.find(
    (f) => f.event === gw && (f.team_h === teamId || f.team_a === teamId)
  );
  if (!fx) return null;
  const isHome = fx.team_h === teamId;
  const oppId = isHome ? fx.team_a : fx.team_h;
  const d = isHome ? (fx.team_h_difficulty ?? 3) : (fx.team_a_difficulty ?? 3);
  return { isHome, oppId, difficulty: d, kickoff: fx.kickoff_time ?? null };
}

/**
 * ✅ Core projection (replace this with your xPoints engine later)
 * Returns expected points for a single GW.
 */
function projectPlayerGW(p: any, fixture: any | null) {
  const form = Number(p.form || 0);
  const minutes = Number(p.minutes || 0);
  const pos = Number(p.element_type); // 1 GK,2 DEF,3 MID,4 FWD

  const posFactor = pos === 4 ? 1.22 : pos === 3 ? 1.12 : pos === 2 ? 0.92 : 0.78;
  const df = diffFactor(fixture?.difficulty ?? 3);

  const base = form * 1.05 * posFactor;
  const pts = base * minutesFactor(minutes) * df * riskPenalty(p);

  // keep it within sane range
  return clamp(Number(pts.toFixed(3)), 0, 12);
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

function bestXIForGW(
  squad: any[],
  gw: number,
  fixtures: any[],
  teamsById: Map<number, any>,
  elementsById: Map<number, any>
) {
  const scored = squad.map((p: any) => {
    const fx = getFixture(fixtures, p.team, gw);
    const pts = projectPlayerGW(p, fx);
    return { p, fx, pts };
  });

  const gk = scored.filter((x) => x.p.element_type === 1).sort((a, b) => b.pts - a.pts);
  const def = scored.filter((x) => x.p.element_type === 2).sort((a, b) => b.pts - a.pts);
  const mid = scored.filter((x) => x.p.element_type === 3).sort((a, b) => b.pts - a.pts);
  const fwd = scored.filter((x) => x.p.element_type === 4).sort((a, b) => b.pts - a.pts);

  if (!gk.length) {
    return { xi: [], bench: [], captain: null, vice: null, xiPoints: 0, benchPoints: 0, total: 0 };
  }

  // Bench order: take remaining best 3 non-GK (rough, but stable UX)
  function serialize(x: any) {
    const t = teamsById.get(x.p.team);
    const opp = x.fx ? teamsById.get(x.fx.oppId) : null;
    return {
      id: x.p.id,
      name: x.p.web_name,
      team: t?.short_name ?? "UNK",
      pos: x.p.element_type,
      price: x.p.now_cost,
      pts: Number(x.pts.toFixed(2)),
      fixture: x.fx
        ? {
            ha: x.fx.isHome ? "H" : "A",
            opp: opp?.short_name ?? "UNK",
            difficulty: x.fx.difficulty,
          }
        : null,
      risk:
        (x.p.status && x.p.status !== "a") ? "injury"
        : x.p.chance_of_playing_next_round != null && Number(x.p.chance_of_playing_next_round) < 75 ? "doubt"
        : "ok",
    };
  }

  let best = { total: -1, xi: [] as any[] };

  for (const f of formations) {
    if (def.length < f.def || mid.length < f.mid || fwd.length < f.fwd) continue;
    const xi = [gk[0], ...def.slice(0, f.def), ...mid.slice(0, f.mid), ...fwd.slice(0, f.fwd)];
    const xiSum = xi.reduce((s, x) => s + x.pts, 0);

    const sorted = xi.slice().sort((a, b) => b.pts - a.pts);
    const captain = sorted[0];
    const vice = sorted[1] ?? sorted[0];
    const total = xiSum + captain.pts; // captain double

    if (total > best.total) {
      best = { total, xi };
    }
  }

  const xi = best.xi;
  const xiSum = xi.reduce((s, x) => s + x.pts, 0);
  const capSorted = xi.slice().sort((a, b) => b.pts - a.pts);
  const captain = capSorted[0];
  const vice = capSorted[1] ?? capSorted[0];

  // Bench: everyone not in XI, choose top 3 expected points (excluding GK2)
  const xiIds = new Set(xi.map((x) => x.p.id));
  const benchPool = scored.filter((x) => !xiIds.has(x.p.id));
  const bench = benchPool
    .filter((x) => x.p.element_type !== 1)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  const benchPoints = bench.reduce((s, x) => s + x.pts, 0);
  const total = xiSum + captain.pts;

  return {
    xi: xi.map(serialize),
    bench: bench.map(serialize),
    captain: serialize(captain),
    vice: serialize(vice),
    xiPoints: Number(xiSum.toFixed(2)),
    benchPoints: Number(benchPoints.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

function scoreSquadOverHorizon(
  squad: any[],
  gwStart: number,
  horizon: number,
  fixtures: any[],
  teamsById: Map<number, any>,
  elementsById: Map<number, any>
) {
  const byGW = [];
  let sum = 0;
  for (let i = 0; i < horizon; i++) {
    const gw = gwStart + i;
    const r = bestXIForGW(squad, gw, fixtures, teamsById, elementsById);
    byGW.push({ gw, ...r });
    sum += r.total;
  }
  return { sum: Number(sum.toFixed(2)), byGW };
}

function clubCounts(squad: any[]) {
  const c: Record<number, number> = {};
  for (const p of squad) c[p.team] = (c[p.team] || 0) + 1;
  return c;
}

function positionCountsOk(squad: any[]) {
  const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of squad) c[p.element_type] = (c[p.element_type] || 0) + 1;
  return c[1] === 2 && c[2] === 5 && c[3] === 5 && c[4] === 3;
}

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

  const teamsById = new Map<number, any>();
  for (const t of bootstrap.teams) teamsById.set(t.id, t);

  const elementsById = new Map<number, any>();
  for (const p of bootstrap.elements) elementsById.set(p.id, p);

  const squad = picks.map((pk) => elementsById.get(pk.element)).filter(Boolean);
  if (squad.length !== 15) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  const bank = Number(entryInfo.last_deadline_bank ?? 0);

  const baseline = scoreSquadOverHorizon(squad, currentEvent, horizon, fixtures, teamsById, elementsById);

  // ==== Candidate generation (production behavior) ====
  // OUT: prefer flagged OR low contribution players, skip GK by default.
  const outCandidates = squad
    .filter((p: any) => p.element_type !== 1)
    .map((p: any) => {
      const flagged =
        (p.status && p.status !== "a") ||
        (p.chance_of_playing_next_round != null && Number(p.chance_of_playing_next_round) < 75);

      // contribution approx = horizon sum of projected points (not XI-based, but stable for ranking OUT)
      let contrib = 0;
      for (let i = 0; i < horizon; i++) {
        const fx = getFixture(fixtures, p.team, currentEvent + i);
        contrib += projectPlayerGW(p, fx);
      }

      const pick = picks.find((x) => x.element === p.id);
      const selling = Number(pick?.selling_price ?? p.now_cost);

      return { p, flagged, contrib: Number(contrib.toFixed(2)), selling };
    })
    .sort((a, b) => {
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
      return a.contrib - b.contrib;
    })
    .slice(0, 8);

  // IN pool: playable + top by horizon projection, per position
  const squadIds = new Set(squad.map((p: any) => p.id));
  const pool = (bootstrap.elements as any[])
    .filter((p) => !squadIds.has(p.id))
    .filter((p) => p.status === "a" || p.status == null)
    .filter((p) => Number(p.minutes || 0) >= 180);

  function horizonProj(p: any) {
    let s = 0;
    for (let i = 0; i < horizon; i++) {
      s += projectPlayerGW(p, getFixture(fixtures, p.team, currentEvent + i));
    }
    return s;
  }

  const inByPos: Record<number, any[]> = { 2: [], 3: [], 4: [] };
  for (const pos of [2, 3, 4]) {
    inByPos[pos] = pool
      .filter((p) => p.element_type === pos)
      .map((p) => ({ p, hp: horizonProj(p) }))
      .sort((a, b) => b.hp - a.hp)
      .slice(0, 60)
      .map((x) => x.p);
  }

  // ==== Helpers to apply transfers ====
  function applyOneTransfer(sq: any[], outId: number, inP: any) {
    const next = sq.map((p: any) => (p.id === outId ? inP : p));
    if (next.length !== 15) return null;
    if (!positionCountsOk(next)) return null;

    const club = clubCounts(next);
    for (const k of Object.keys(club)) {
      if (club[Number(k)] > 3) return null;
    }
    return next;
  }

  // Baseline club counts for checking IN quickly
  const baseClub = clubCounts(squad);

  // ==== Find best 0-hit plan (1 transfer or roll) ====
  const oneTransferPlans: any[] = [];
  for (const out of outCandidates) {
    const outP = out.p;
    const pos = outP.element_type;
    if (!(pos in inByPos)) continue;

    const maxSpend = bank + out.selling;

    // Try top IN candidates
    for (const inP of inByPos[pos].slice(0, 25)) {
      if (inP.now_cost > maxSpend) continue;

      // club constraint quick-check
      const currentCount = baseClub[inP.team] || 0;
      const would = inP.team === outP.team ? currentCount : currentCount + 1;
      if (would > 3) continue;

      const newSquad = applyOneTransfer(squad, outP.id, inP);
      if (!newSquad) continue;

      const scored = scoreSquadOverHorizon(newSquad, currentEvent, horizon, fixtures, teamsById, elementsById);
      const gain = Number((scored.sum - baseline.sum).toFixed(2));

      oneTransferPlans.push({
        hits: 0,
        gain,
        transfers: [
          {
            out: { id: outP.id, name: outP.web_name, pos: outP.element_type, selling: out.selling, cost: outP.now_cost },
            in: { id: inP.id, name: inP.web_name, pos: inP.element_type, cost: inP.now_cost },
          },
        ],
        byGW: scored.byGW,
        why: [
          `Improves Best XI projection by +${gain} over ${horizon} GWs`,
          `Minutes security: ${Number(inP.minutes || 0) >= 900 ? "strong" : "medium"}`,
          `Fixture run improves vs your current option (modelled via difficulty + form)`,
        ],
      });
    }
  }

  oneTransferPlans.sort((a, b) => b.gain - a.gain);
  const bestOne = oneTransferPlans[0] ?? null;

  // ==== Find best -4 plan (2 transfers) ====
  const twoTransferPlans: any[] = [];
  const topFirstMoves = oneTransferPlans.slice(0, 10);

  for (const first of topFirstMoves) {
    // rebuild squad after first move
    const out1 = first.transfers[0].out.id;
    const in1 = first.transfers[0].in.id;
    const in1P = elementsById.get(in1);
    if (!in1P) continue;

    const after1 = applyOneTransfer(squad, out1, in1P);
    if (!after1) continue;

    const picksAfter1Ids = new Set(after1.map((p: any) => p.id));
    const clubAfter1 = clubCounts(after1);

    // Recompute OUT candidates after first transfer (small set)
    const out2Cand = after1
      .filter((p: any) => p.element_type !== 1)
      .filter((p: any) => p.id !== in1P.id) // don’t immediately sell new
      .map((p: any) => {
        let contrib = 0;
        for (let i = 0; i < horizon; i++) contrib += projectPlayerGW(p, getFixture(fixtures, p.team, currentEvent + i));
        return { p, contrib };
      })
      .sort((a, b) => a.contrib - b.contrib)
      .slice(0, 6);

    for (const out2 of out2Cand) {
      const pos2 = out2.p.element_type;
      if (!(pos2 in inByPos)) continue;

      // selling price from original picks if exists, else current cost
      const pk2 = picks.find((x) => x.element === out2.p.id);
      const selling2 = Number(pk2?.selling_price ?? out2.p.now_cost);

      // bank after first transfer (approx):
      // bank + selling(out1) - cost(in1)
      const selling1 = first.transfers[0].out.selling;
      const costIn1 = in1P.now_cost;
      const bankAfter1 = bank + selling1 - costIn1;

      const maxSpend2 = bankAfter1 + selling2;

      // IN candidates for second move must not already be in after1
      const in2List = inByPos[pos2].filter((p) => !picksAfter1Ids.has(p.id)).slice(0, 25);

      for (const in2 of in2List) {
        if (in2.now_cost > maxSpend2) continue;

        const cnt = clubAfter1[in2.team] || 0;
        const would = in2.team === out2.p.team ? cnt : cnt + 1;
        if (would > 3) continue;

        const after2 = applyOneTransfer(after1, out2.p.id, in2);
        if (!after2) continue;

        const scored = scoreSquadOverHorizon(after2, currentEvent, horizon, fixtures, teamsById, elementsById);
        const rawGain = scored.sum - baseline.sum;
        const netGain = Number((rawGain - 4).toFixed(2)); // hit cost

        if (netGain <= 0) continue;

        twoTransferPlans.push({
          hits: 4,
          gain: Number(rawGain.toFixed(2)),
          netGain,
          transfers: [
            first.transfers[0],
            {
              out: { id: out2.p.id, name: out2.p.web_name, pos: out2.p.element_type, selling: selling2, cost: out2.p.now_cost },
              in: { id: in2.id, name: in2.web_name, pos: in2.element_type, cost: in2.now_cost },
            },
          ],
          byGW: scored.byGW,
          why: [
            `Net gain after -4: +${netGain} over ${horizon} GWs`,
            "Improves more than one XI slot / captaincy flexibility",
            "Only suggested because it beats the roll option",
          ],
        });
      }
    }
  }

  twoTransferPlans.sort((a, b) => b.netGain - a.netGain);

  // ==== Recommend roll vs transfer (auto) ====
  const rollThreshold = 3.5; // commercial-style threshold
  const bestGain = bestOne?.gain ?? 0;

  let recommendation: "roll" | "use_transfer" | "take_hit" = "roll";
  let reason = `No transfer improves your Best XI by ≥${rollThreshold} over next ${horizon} GWs.`;

  if (twoTransferPlans[0]?.netGain != null && twoTransferPlans[0].netGain >= rollThreshold) {
    recommendation = "take_hit";
    reason = `A -4 plan beats roll by +${twoTransferPlans[0].netGain} over next ${horizon} GWs.`;
  } else if (bestGain >= rollThreshold) {
    recommendation = "use_transfer";
    reason = `A single transfer improves your Best XI by +${bestGain} over next ${horizon} GWs.`;
  } else {
    // if there are flagged starters, relax and suggest fixing even if under threshold
    const flaggedInSquad = squad.some(
      (p: any) =>
        (p.status && p.status !== "a") ||
        (p.chance_of_playing_next_round != null && Number(p.chance_of_playing_next_round) < 75)
    );
    if (flaggedInSquad && bestOne) {
      recommendation = "use_transfer";
      reason = "You have a flagged player; safest move is to fix minutes risk even if gain is modest.";
    }
  }

  // ==== Build plan list (A/B/C) ====
  const plans: any[] = [];

  // Plan A: roll OR best 1 transfer depending on recommendation
  if (recommendation === "roll" || !bestOne) {
    plans.push({
      label: "Plan A (Roll)",
      hits: 0,
      netGain: 0,
      transfers: [],
      byGW: baseline.byGW,
      why: [
        reason,
        "Keeps flexibility for next GW fixture swing",
        "Avoids spending transfers for marginal gains",
      ],
    });
  } else {
    plans.push({
      label: "Plan A (1 Transfer)",
      hits: 0,
      netGain: Number(bestOne.gain.toFixed(2)),
      transfers: bestOne.transfers,
      byGW: bestOne.byGW,
      why: bestOne.why,
    });
  }

  // Plan B: include best -4 if good
  const bestHit = twoTransferPlans[0];
  if (bestHit) {
    plans.push({
      label: "Plan B (-4)",
      hits: 4,
      netGain: bestHit.netGain,
      transfers: bestHit.transfers,
      byGW: bestHit.byGW,
      why: bestHit.why,
    });
  }

  // Plan C: optional -8 if you really want later (we keep clean for now)
  // In premium tools, -8 is rare unless injuries; we’ll add when needed.

  return NextResponse.json({
    entry,
    currentEvent,
    horizon,
    bank,
    baseline: baseline.sum,
    recommendation,
    reason,
    plans,
    modelNote:
      "Planner optimizes Best XI + Captain each GW over horizon. Uses fixture difficulty + form + minutes + risk (swap in your xPoints engine next).",
  });
}
