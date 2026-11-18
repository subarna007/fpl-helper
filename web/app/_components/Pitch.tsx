"use client";

import Link from "next/link";

type SquadPlayer = {
  id: number;
  name: string;
  teamShort?: string;
  pos?: number; // 1 GK, 2 DEF, 3 MID, 4 FWD
  posShort?: string; // optional older shape
  price?: number;
  nextFixture?: { isHome: boolean; oppShort: string; difficulty: number } | null;
  risk?: string;
};

function posNum(p: SquadPlayer) {
  if (typeof p.pos === "number") return p.pos;
  const s = p.posShort;
  return s === "GK" ? 1 : s === "DEF" ? 2 : s === "MID" ? 3 : 4;
}

// FPL's own difficulty colours, from easy (green) to very hard (dark red)
function diffClass(d: number) {
  if (d <= 2) return "bg-[#01FC7A] text-[#0E1A2B]";
  if (d === 3) return "bg-[#E7E7E7] text-[#0E1A2B]";
  if (d === 4) return "bg-[#FF1751] text-white";
  return "bg-[#80072D] text-white";
}

function Shirt({ gk }: { gk: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="h-11 w-11 drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)] sm:h-12 sm:w-12" aria-hidden="true">
      <path
        d="M17 5l-11 6 4 9 4-2v25h20V18l4 2 4-9-11-6c-1 3.4-3.7 5.5-7 5.5S18 8.4 17 5z"
        fill={gk ? "#E8A300" : "#FFFFFF"}
        stroke="#0E1A2B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M17 5c1 3.4 3.7 5.5 7 5.5S30 8.4 31 5" fill="none" stroke="#0E1A2B" strokeWidth="1.5" />
    </svg>
  );
}

function PlayerSpot({
  p,
  isCaptain,
  isVice,
  bench = false,
}: {
  p: SquadPlayer;
  isCaptain: boolean;
  isVice: boolean;
  bench?: boolean;
}) {
  const fx = p.nextFixture;
  const flagged = p.risk && p.risk !== "ok";
  return (
    <Link
      href={`/player/${p.id}`}
      className="group relative flex w-[76px] flex-col items-center text-center transition hover:-translate-y-0.5 sm:w-[96px]"
      title={`${p.name}: open player page`}
    >
      <span className="relative">
        <Shirt gk={posNum(p) === 1} />
        {isCaptain || isVice ? (
          <span
            className={[
              "absolute -right-2 -top-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ring-2 ring-white",
              isCaptain ? "bg-ink text-white" : "bg-white text-ink",
            ].join(" ")}
          >
            {isCaptain ? "C" : "V"}
          </span>
        ) : null}
        {flagged ? (
          <span
            className="absolute -left-2 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-ink ring-2 ring-white"
            title={`Availability: ${p.risk}`}
          >
            !
          </span>
        ) : null}
      </span>
      <span
        className={[
          "mt-1 w-full truncate rounded-t-md px-1 py-0.5 text-[11px] font-semibold sm:text-xs",
          bench ? "bg-ink/90 text-white" : "bg-ink text-white group-hover:bg-pitch-dark",
        ].join(" ")}
      >
        {p.name}
      </span>
      <span
        className={[
          "tabular w-full rounded-b-md px-1 py-0.5 text-[10px] font-semibold sm:text-[11px]",
          fx ? diffClass(fx.difficulty ?? 3) : "bg-white text-ink",
        ].join(" ")}
      >
        {fx
          ? `${fx.oppShort} (${fx.isHome ? "H" : "A"})`
          : fx === undefined && typeof p.price === "number"
          ? `£${(p.price / 10).toFixed(1)}m`
          : "No game"}
      </span>
    </Link>
  );
}

export default function Pitch({
  squad,
  captainId,
  viceCaptainId,
  showLegend = true,
}: {
  squad?: SquadPlayer[];
  captainId?: number | null;
  viceCaptainId?: number | null;
  showLegend?: boolean;
}) {
  const list = Array.isArray(squad) ? squad : [];
  // the FPL API returns picks in squad order: positions 1–11 start, 12–15 are the bench
  const xi = list.slice(0, 11);
  const bench = list.slice(11);
  const lines = [1, 2, 3, 4].map((n) => xi.filter((p) => posNum(p) === n));

  if (list.length === 0) {
    return (
      <div className="bg-pitch p-8 text-center text-white">
        <div className="font-semibold">No squad loaded</div>
        <div className="mt-1 text-sm text-white/80">Enter your team ID to see your players.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden bg-pitch px-2 py-6 sm:px-6">
        {/* mowing stripes and pitch markings */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.055)_0_52px,transparent_52px_104px)]" />
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-3 h-[18%] w-[44%] -translate-x-1/2 border-2 border-t-0 border-white/30" />
        <div className="pointer-events-none absolute left-1/2 top-3 h-[7%] w-[20%] -translate-x-1/2 border-2 border-t-0 border-white/30" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 h-28 w-28 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white/30" />

        <div className="relative grid gap-5 sm:gap-7">
          {lines.map((line, i) => (
            <div key={i} className="flex justify-center gap-1 sm:gap-4">
              {line.map((p) => (
                <PlayerSpot key={p.id} p={p} isCaptain={p.id === captainId} isVice={p.id === viceCaptainId} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {bench.length ? (
        <div className="border-t border-line bg-turf px-3 py-4">
          <div className="mb-2 text-center text-xs font-semibold text-ink-2">Bench</div>
          <div className="flex justify-center gap-1 sm:gap-4">
            {bench.map((p) => (
              <PlayerSpot key={p.id} p={p} isCaptain={false} isVice={false} bench />
            ))}
          </div>
        </div>
      ) : null}

      {showLegend ? (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-line bg-white px-3 py-2.5 text-[11px] text-ink-2">
        <span>Next fixture difficulty:</span>
        {[2, 3, 4, 5].map((d) => (
          <span key={d} className="flex items-center gap-1">
            <span className={`h-3 w-3 rounded-sm ${diffClass(d)}`} />
            {d === 2 ? "easy" : d === 3 ? "medium" : d === 4 ? "hard" : "very hard"}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-gold text-[9px] font-bold text-ink">!</span>
          doubt or injury
        </span>
      </div>
      ) : null}
    </div>
  );
}
