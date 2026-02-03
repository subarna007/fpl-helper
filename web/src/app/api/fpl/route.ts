import { NextResponse } from "next/server";

const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const res = await fetch(`${FPL_BASE}${path}`, {
    // Revalidate caching helps performance
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`FPL request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry"); // user's FPL team id

  if (!entry) {
    return NextResponse.json(
      { error: "Missing entry. Use ?entry=YOUR_ID" },
      { status: 400 }
    );
  }

  try {
    // 1) Static game data (players, teams, etc.)
    const bootstrap = await fetchJson("/bootstrap-static/");

    // 2) Fixtures
    const fixtures = await fetchJson("/fixtures/");

    // 3) Figure out current event (GW)
    const currentEvent = bootstrap.events.find((e: any) => e.is_current)?.id
      ?? bootstrap.events.find((e: any) => e.is_next)?.id
      ?? 1;

    // 4) User picks for that event
    const picks = await fetchJson(`/entry/${entry}/event/${currentEvent}/picks/`);

    return NextResponse.json({
      entry,
      currentEvent,
      bootstrap,
      fixtures,
      picks,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
