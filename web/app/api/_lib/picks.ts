// Picks for the current gameweek, falling back to the previous one.
// Before a gameweek deadline the "next" gameweek has no picks yet (the API returns 404),
// and right at the start of a season the first deadline may not have passed.
export async function getPicks(
  entry: string,
  gw: number,
  fetchJson: (path: string) => Promise<any>
) {
  const tries = [gw, gw - 1].filter((g) => g >= 1);
  let lastError: unknown = null;
  for (const g of tries) {
    try {
      return await fetchJson(`/entry/${entry}/event/${g}/picks/`);
    } catch (e) {
      lastError = e;
    }
  }
  const msg = String((lastError as any)?.message ?? lastError);
  if (msg.includes("404")) {
    throw new Error(`No team found for ID ${entry}, or it has no picks yet this season.`);
  }
  throw lastError instanceof Error ? lastError : new Error(msg);
}

// The FPL API sometimes rejects requests without a browser-like User-Agent.
export const FPL_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; fpl-helper)" };
