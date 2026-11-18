"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "../_state/DashboardContext";
import { PitchIcon, PlanIcon, SwapIcon, StarIcon, SearchIcon } from "./Icons";

const tabs = [
  { href: "/", label: "My team", Icon: PitchIcon },
  { href: "/plan", label: "Planner", Icon: PlanIcon },
  { href: "/transfers", label: "Transfers", Icon: SwapIcon },
  { href: "/best-squad", label: "Best squad", Icon: StarIcon },
  { href: "/players", label: "Players", Icon: SearchIcon },
];

function isActive(path: string | null, href: string) {
  if (!path) return false;
  if (href === "/") return path === "/";
  if (href === "/players") return path.startsWith("/players") || path.startsWith("/player/");
  return path.startsWith(href);
}

export default function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { savedEntry, changeTeam } = useDashboard();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="stripes sticky top-0 z-30 text-white shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pitch transition group-hover:rotate-[-6deg]">
              <PitchIcon className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-wide">FPL Helper</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {tabs.map(({ href, label, Icon }) => {
              const active = isActive(path, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-[15px] font-medium transition",
                    active ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {savedEntry ? (
            <div className="flex items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-sm">
              <span className="text-white/70">Team</span>
              <span className="tabular font-semibold">{savedEntry}</span>
              <button
                type="button"
                onClick={changeTeam}
                className="ml-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white hover:text-ink"
              >
                Change
              </button>
            </div>
          ) : (
            <span className="hidden text-xs text-white/60 sm:block">Live data from the FPL API</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8">
        {title ? (
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-2xl text-[15px] text-ink-2">{subtitle}</p> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        ) : null}

        <div key={path ?? ""} className="page-in">
          {children}
        </div>

        <p className="mt-12 text-center text-xs text-ink-2">
          Unofficial tool, not affiliated with the Premier League. Data from the public Fantasy Premier League API.
        </p>
      </main>

      {/* bottom tab bar on phones */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                  active ? "text-pitch" : "text-ink-2",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0 h-[3px] w-8 rounded-b-full bg-pitch transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
