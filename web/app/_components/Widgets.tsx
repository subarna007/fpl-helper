import Card from "./Card";

type CaptainPick = {
  id: number;
  name: string;
  teamShort?: string;
  ownership?: number;
  xPts?: number;
  fixture?: { isHome: boolean; oppShort: string; difficulty: number } | null;
  risk?: string;
};

function DiffPill({ d }: { d: number }) {
  const cls =
    d <= 2
      ? "bg-green-50 border-green-200 text-green-800"
      : d === 3
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-red-50 border-red-200 text-red-800";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      D{d}
    </span>
  );
}

export default function Widgets({
  currentEvent,
  captaincy,
}: {
  currentEvent: number;
  captaincy?: CaptainPick[]; // ✅ optional
}) {
  const list = Array.isArray(captaincy) ? captaincy : [];

  return (
    <div className="grid gap-4">
      <Card>
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-semibold">Captaincy</div>
            <div className="text-xs text-gray-500">GW {currentEvent || "—"}</div>
          </div>

          <div className="mt-2 text-xs text-gray-600">
            Top captain options from your squad based on xPts.
          </div>

          <div className="mt-4 space-y-2">
            {list.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
                Load your team to see captain suggestions.
              </div>
            ) : (
              list.map((c, i) => (
                <div
                  key={c.id ?? i}
                  className="rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">#{i + 1}</span>
                      <span className="text-sm font-semibold truncate">{c.name}</span>
                      {c.teamShort ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                          {c.teamShort}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      {c.fixture ? (
                        <>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            {c.fixture.isHome ? "H" : "A"} {c.fixture.oppShort}
                          </span>
                          <DiffPill d={c.fixture.difficulty} />
                        </>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">No fixture</span>
                      )}

                      {typeof c.ownership === "number" ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">
                          EO {c.ownership.toFixed(1)}%
                        </span>
                      ) : null}

                      {c.risk ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">
                          {c.risk}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">xPts</div>
                    <div className="text-sm font-bold">
                      {typeof c.xPts === "number" ? c.xPts.toFixed(2) : "—"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
