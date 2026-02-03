"use client";

import FixtureChip from "./FixtureChip";

export type SquadPlayer = {
  id: number;
  name: string;
  teamShort: string;
  posShort: string;
  price: number;
  form: number;
  ownership: number;
  xPts: { gw1: number; gw5: number };
  risk: "ok" | "risk" | "doubt" | "injury";
  badges: { captain: boolean; vice: boolean };
  nextFixture: null | { isHome: boolean; oppShort: string; difficulty: number };
};

function RiskDot({ risk }: { risk: SquadPlayer["risk"] }) {
  const cls =
    risk === "ok"
      ? "bg-gray-300"
      : risk === "risk"
      ? "bg-amber-400"
      : risk === "doubt"
      ? "bg-orange-500"
      : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

export default function PlayerTile({
  p,
  onClick,
}: {
  p: SquadPlayer;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-gray-200 bg-white p-3 hover:bg-gray-50 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{p.name}</span>
            {p.badges.captain && (
              <span className="rounded-full bg-black text-white text-[10px] px-2 py-0.5">C</span>
            )}
            {p.badges.vice && (
              <span className="rounded-full bg-gray-800 text-white text-[10px] px-2 py-0.5">VC</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{p.posShort}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{p.teamShort}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">£{(p.price / 10).toFixed(1)}m</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
              <RiskDot risk={p.risk} />
              <span className="capitalize">{p.risk}</span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">xPts</div>
          <div className="text-sm font-semibold">{p.xPts.gw1}</div>
          <div className="text-[11px] text-gray-500">5GW {p.xPts.gw5}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-600">
          Form <span className="font-semibold">{p.form}</span> • EO{" "}
          <span className="font-semibold">{p.ownership.toFixed(1)}%</span>
        </div>

        {p.nextFixture ? (
          <FixtureChip
            isHome={p.nextFixture.isHome}
            opp={p.nextFixture.oppShort}
            difficulty={p.nextFixture.difficulty}
          />
        ) : (
          <span className="text-xs text-gray-400">No fixture</span>
        )}
      </div>
    </button>
  );
}
