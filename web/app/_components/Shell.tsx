"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/plan", label: "Planner" },
  { href: "/transfers", label: "Transfers" },
  { href: "/ai-team", label: "AI Team" },
];

export default function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
            </div>
            <div className="text-xs text-gray-500">
              Unofficial • Public FPL endpoints
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = path === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "rounded-full px-3 py-1 text-sm border transition",
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-800 border-gray-200 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
