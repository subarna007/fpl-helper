"use client";

import AppShell from "./_components/AppShell";
import Pitch from "./_components/Pitch";
import Widgets from "./_components/Widgets";
import Card from "./_components/Card";
import { useDashboard } from "./_state/DashboardContext";

export default function Page() {
  const { entry, setEntry, data, loading, error, load, reset } = useDashboard();

  // -----------------------------
  // ENTRY SCREEN
  // -----------------------------
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="p-6">
            <div className="text-xl font-semibold text-center">
              FPL Analytics
            </div>
            <div className="mt-2 text-sm text-gray-600 text-center">
              Analyze any Fantasy Premier League team by Entry ID
            </div>

            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-600">
                FPL Entry ID
              </label>
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="e.g. 28935"
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring"
              />
            </div>

            <button
              onClick={() => load()}
              disabled={!entry.trim() || loading}
              className="mt-4 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Analyzing…" : "Analyze Team"}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 text-center">
              Unofficial tool • Public FPL data
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // -----------------------------
  // DASHBOARD
  // -----------------------------
  return (
    <AppShell
      title="Squad Overview"
      subtitle={`GW ${data.currentEvent} • Entry ${data.entry}`}
      right={
        <button
          onClick={reset}
          className="rounded-full border px-3 py-1 text-xs font-semibold"
        >
          Change Entry
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <Card>
            <div className="p-4">
              <Pitch
                squad={data.squad}
                captainId={data.meta?.captain}
                viceCaptainId={data.meta?.viceCaptain}
              />
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="text-sm font-semibold">Squad Summary</div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Team Value</div>
                  <div className="font-semibold">
                    £{(data.meta.teamValue / 10).toFixed(1)}m
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Bank</div>
                  <div className="font-semibold">
                    £{(data.meta.bank / 10).toFixed(1)}m
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Transfers</div>
                  <div className="font-semibold">
                    {data.meta.transfersAvailable}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Overall Rank</div>
                  <div className="font-semibold">
                    {data.meta.overallRank?.toLocaleString() ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Widgets
          currentEvent={data.currentEvent}
          captaincy={data.captaincy ?? []}
        />
      </div>
    </AppShell>
  );
}
