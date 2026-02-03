import { NextResponse } from "next/server";

const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const res = await fetch(`${FPL_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`FPL request failed: ${res.status}`);
  }
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry");

  if (!entry) {
    return NextResponse.json(
      { error: "Missing entry parameter" },
      { status: 400 }
    );
  }

  const bootstrap = await fetchJson("/bootstrap-static/");
  const fixtures = await fetchJson("/fixtures/");

  const currentEvent =
    bootstrap.events.find((e: any) => e.is_current)?.id ??
    bootstrap.events.find((e: any) => e.is_next)?.id ??
    1;

  const picks = await fetchJson(
    `/entry/${entry}/event/${currentEvent}/picks/`
  );

  return NextResponse.json({
    entry,
    currentEvent,
    bootstrap,
    fixtures,
    picks,
  });
}
