"use client";

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

function posShortFromNum(pos?: number) {
  if (pos === 1) return "GK";
  if (pos === 2) return "DEF";
  if (pos === 3) return "MID";
  if (pos === 4) return "FWD";
  return "UNK";
}

function groupByPos(players: SquadPlayer[] | undefined) {
  const list = Array.isArray(players) ? players : [];

  const getPosShort = (p: SquadPlayer) =>
    p.posShort ?? posShortFromNum(p.pos);

  const gk = list.filter((p) => getPosShort(p) === "GK");
  const def = list.filter((p) => getPosShort(p) === "DEF");
  const mid = list.filter((p) => getPosShort(p) === "MID");
  const fwd = list.filter((p) => getPosShort(p) === "FWD");

  return { gk, def, mid, fwd };
}

function DiffDot({ d }: { d: number }) {
  const cls =
    d <= 2
      ? "bg-green-500"
      : d === 3
      ? "bg-yellow-500"
      : d === 4
      ? "bg-orange-500"
      : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
      {children}
    </span>
  );
}

function PlayerTile({
  p,
  isCaptain,
  isVice,
}: {
  p: SquadPlayer;
  isCaptain: boolean;
  isVice: boolean;
}) {
  const fx = p.nextFixture;

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-3 py-2 text-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold">{p.name}</div>
            {isCaptain ? <Badge>C</Badge> : null}
            {isVice ? <Badge>VC</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            {p.teamShort ? <span>{p.teamShort}</span> : null}
            {typeof p.price === "number" ? (
              <span>£{(p.price / 10).toFixed(1)}m</span>
            ) : null}
            {p.risk && p.risk !== "ok" ? <Badge>{p.risk}</Badge> : null}
          </div>
        </div>

        {fx ? (
          <div className="text-right text-[11px] text-white/85">
            <div className="flex items-center justify-end gap-1">
              <DiffDot d={fx.difficulty ?? 3} />
              <span>
                {fx.isHome ? "H" : "A"} {fx.oppShort}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Row({ title, players, captainId, viceId }: any) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-white/80">{title}</div>
        <div className="text-[11px] text-white/60">{players.length}</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p: SquadPlayer) => (
          <PlayerTile
            key={p.id}
            p={p}
            isCaptain={p.id === captainId}
            isVice={p.id === viceId}
          />
        ))}
      </div>
    </div>
  );
}

export default function Pitch({
  squad,
  captainId,
  viceCaptainId,
}: {
  squad?: SquadPlayer[];
  captainId?: number | null;
  viceCaptainId?: number | null;
}) {
  const { gk, def, mid, fwd } = groupByPos(squad);

  // If squad is empty, show a clean placeholder
  const empty = (gk.length + def.length + mid.length + fwd.length) === 0;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-emerald-900 to-emerald-700 p-4">
      {empty ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white">
          <div className="text-sm font-semibold">No squad loaded</div>
          <div className="mt-1 text-xs text-white/80">
            Enter your FPL Entry ID to load your current gameweek squad.
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <Row title="Goalkeepers" players={gk} captainId={captainId} viceId={viceCaptainId} />
          <Row title="Defenders" players={def} captainId={captainId} viceId={viceCaptainId} />
          <Row title="Midfielders" players={mid} captainId={captainId} viceId={viceCaptainId} />
          <Row title="Forwards" players={fwd} captainId={captainId} viceId={viceCaptainId} />
        </div>
      )}
    </div>
  );
}
