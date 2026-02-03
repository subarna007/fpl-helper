import { NextResponse } from "next/server";

const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const res = await fetch(`${FPL_BASE}${path}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`FPL request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entry = searchParams.get("entry");

  if (!entry) {
    return NextResponse.json(
      { error: "Missing entry. Use ?entry=YOUR_ID" },
      { status: 400 }
    );
  }

  try {
    const bootstrap = await fetchJson("/bootstrap-static/");
    const fixtures = await fetchJson("/fixtures/");

    const currentEvent =
      bootstrap.events.find((e: any) => e.is_current)?.id ??
      bootstrap.events.find((e: any) => e.is_next)?.id ??
      1;

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
