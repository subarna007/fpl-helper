import { NextResponse } from "next/server";
import { FPL_HEADERS } from "../../_lib/picks";

const FPL_BASE = "https://fantasy.premierleague.com/api";

async function fetchJson(path: string) {
  const res = await fetch(`${FPL_BASE}${path}`, { cache: "no-store", headers: FPL_HEADERS });
  if (!res.ok) throw new Error(`FPL request failed: ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const bootstrap = await fetchJson("/bootstrap-static/");
    const fixtures = await fetchJson("/fixtures/");
    return NextResponse.json({ bootstrap, fixtures });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
