"use client";

import Link from "next/link";
import AppShell from "./_components/AppShell";
import Pitch from "./_components/Pitch";
import Widgets from "./_components/Widgets";
import Card from "./_components/Card";
import { useDashboard } from "./_state/DashboardContext";
import { ArrowIcon, InfoIcon, PlanIcon, SwapIcon, StarIcon } from "./_components/Icons";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className="tabular mt-0.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

const nextSteps = [
  { href: "/plan", Icon: PlanIcon, title: "Plan the next gameweeks", text: "Roll, one transfer or a -4 hit, compared over 3 or 5 gameweeks." },
  { href: "/transfers", Icon: SwapIcon, title: "Find upgrades", text: "Players worth bringing in, with the reasons." },
  { href: "/best-squad", Icon: StarIcon, title: "See the best squad", text: "A high-scoring 15 within £100m." },
];

export default function Page() {
  const { entry, setEntry, savedEntry, data, loading, error, load } = useDashboard();

  // reopening a saved team
  if (!data && loading && savedEntry) {
    return (
      <AppShell>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="skeleton h-[520px]" />
          <div className="grid content-start gap-4">
            <div className="skeleton h-24" />
            <div className="skeleton h-72" />
          </div>
        </div>
      </AppShell>
    );
  }

  // entry screen
  if (!data) {
    return (
      <AppShell>
        <div className="grid items-center gap-10 py-4 lg:grid-cols-[1.1fr_1fr] lg:py-10">
          <div>
            <p className="font-semibold text-pitch">Fantasy Premier League, this season</p>
            <h1 className="mt-2 font-display text-5xl font-bold leading-[0.95] sm:text-6xl">
              See your squad.
              <br />
              Plan your transfers.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-2">
              Enter your FPL team ID to see your players on the pitch, the best captain for this gameweek
              and which transfers are worth making.
            </p>

            <form
              className="mt-7 max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                load();
              }}
            >
              <label htmlFor="entry" className="text-sm font-semibold">
                Your team ID
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="entry"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))}
                  placeholder="for example 28935"
                  inputMode="numeric"
                  autoComplete="off"
                  className="tabular min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3.5 text-lg outline-none transition placeholder:text-gray-400 focus:border-pitch focus:ring-4 focus:ring-pitch/15"
                />
                <button
                  type="submit"
                  disabled={!entry.trim() || loading}
                  className="flex items-center gap-2 rounded-xl bg-pitch px-5 font-semibold text-white transition hover:bg-pitch-dark disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Show my team"}
                  {!loading && <ArrowIcon className="h-5 w-5" />}
                </button>
              </div>

              {error && (
                <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <details className="mt-4 text-sm text-ink-2">
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-ink hover:text-pitch">
                  <InfoIcon className="h-4 w-4" />
                  Where do I find my team ID?
                </summary>
                <p className="mt-2 pl-6">
                  Sign in at fantasy.premierleague.com and open the <b>Points</b> page. The number in the
                  address bar after <code className="rounded bg-white px-1">/entry/</code> is your team ID.
                </p>
              </details>
            </form>
          </div>

          <div className="relative hidden lg:block" aria-hidden="true">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-pitch shadow-xl">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.06)_0_56px,transparent_56px_112px)]" />
              <div className="absolute inset-6 rounded-xl border-2 border-white/40" />
              <div className="absolute left-6 right-6 top-1/2 border-t-2 border-white/40" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
              <div className="absolute left-1/2 top-6 h-16 w-44 -translate-x-1/2 border-2 border-t-0 border-white/40" />
              <div className="absolute bottom-6 left-1/2 h-16 w-44 -translate-x-1/2 border-2 border-b-0 border-white/40" />
              {[
                [50, 14], [22, 32], [40, 34], [60, 34], [78, 32],
                [30, 56], [50, 54], [70, 56], [32, 78], [50, 82], [68, 78],
              ].map(([x, y], i) => (
                <span
                  key={i}
                  className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow-md"
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const m = data.meta ?? {};
  const heading = m.teamName || `Team ${data.entry}`;

  return (
    <AppShell
      title={heading}
      subtitle={`${m.manager ? `${m.manager}, ` : ""}gameweek ${data.currentEvent}`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Gameweek points" value={m.gwPoints ? String(m.gwPoints) : "–"} />
            <Stat label="Overall rank" value={m.overallRank ? Number(m.overallRank).toLocaleString() : "–"} />
            <Stat label="Team value" value={`£${(Number(m.teamValue ?? 0) / 10).toFixed(1)}m`} />
            <Stat label="In the bank" value={`£${(Number(m.bank ?? 0) / 10).toFixed(1)}m`} />
          </div>

          <Card className="overflow-hidden">
            <Pitch squad={data.squad} captainId={m.captain} viceCaptainId={m.viceCaptain} />
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Widgets currentEvent={data.currentEvent} captaincy={data.captaincy ?? []} />

          <Card>
            <div className="p-5">
              <div className="font-display text-lg font-bold">What next?</div>
              <div className="mt-3 grid gap-2">
                {nextSteps.map(({ href, Icon, title, text }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-pitch hover:bg-turf"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-turf text-pitch transition group-hover:bg-pitch group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-ink-2">{text}</span>
                    </span>
                    <ArrowIcon className="h-4 w-4 shrink-0 text-ink-2 transition group-hover:translate-x-0.5 group-hover:text-pitch" />
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
