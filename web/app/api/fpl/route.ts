import { NextResponse } from "next/server";
import { FPL_HEADERS, getPicks } from "../_lib/picks";

const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const res = await fetch(`${FPL_BASE}${path}`, { cache: "no-store", headers: FPL_HEADERS });
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

  const picks = await getPicks(entry, currentEvent, fetchJson);

  return NextResponse.json({
    entry,
    currentEvent,
    bootstrap,
    fixtures,
    picks,
  });
}
