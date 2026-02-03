export type OddsRow = {
  league: string;              // e.g. E0
  date: string;                // DD/MM/YYYY
  time?: string;               // HH:MM
  home: string;
  away: string;
  avgH?: number; avgD?: number; avgA?: number; // market average 1X2
  avgO25?: number; avgU25?: number;            // market average O/U 2.5
};

function toNum(x: string | undefined) {
  if (!x) return undefined;
  const v = Number(x);
  return Number.isFinite(v) ? v : undefined;
}

// Very small CSV parser (works for football-data fixtures.csv format)
function parseCSV(text: string): { header: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((s) => s.trim());
  const rows = lines.slice(1).map((ln) => {
    const parts = ln.split(","); // football-data files are simple (no quoted commas)
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = (parts[i] ?? "").trim()));
    return obj;
  });
  return { header, rows };
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Mapping from FPL team names → football-data names (most are close, but not always exact)
export function mapFplTeamToFootballData(fplTeamName: string) {
  const n = norm(fplTeamName);
  const map: Record<string, string> = {
    "manchester city": "man city",
    "manchester united": "man united",
    "newcastle united": "newcastle",
    "nottingham forest": "nottm forest",
    "tottenham hotspur": "tottenham",
    "wolverhampton wanderers": "wolves",
    "brighton": "brighton",
    "brighton and hove albion": "brighton",
    "west ham united": "west ham",
  };
  return map[n] ?? norm(fplTeamName);
}

// Convert (home,draw,away odds) to implied probs
export function implied1X2(avgH?: number, avgD?: number, avgA?: number) {
  if (!avgH || !avgD || !avgA) return null;
  const ih = 1 / avgH;
  const id = 1 / avgD;
  const ia = 1 / avgA;
  const s = ih + id + ia;
  return { pH: ih / s, pD: id / s, pA: ia / s };
}

// Convert over/under to P(over2.5)
export function impliedOver25(avgO25?: number, avgU25?: number) {
  if (!avgO25 || !avgU25) return null;
  const io = 1 / avgO25;
  const iu = 1 / avgU25;
  const s = io + iu;
  return { pOver25: io / s, pUnder25: iu / s };
}

export async function fetchUpcomingOdds(): Promise<OddsRow[]> {
  // fixtures.csv has “best market odds only” for upcoming fixtures
  const url = "https://www.football-data.co.uk/fixtures.csv";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`odds fetch failed: ${res.status}`);
  const text = await res.text();

  const { rows } = parseCSV(text);

  const out: OddsRow[] = rows
    .filter((r) => r["Div"] === "E0") // Premier League
    .map((r) => ({
      league: r["Div"],
      date: r["Date"],
      time: r["Time"],
      home: norm(r["HomeTeam"]),
      away: norm(r["AwayTeam"]),
      avgH: toNum(r["AvgH"]),
      avgD: toNum(r["AvgD"]),
      avgA: toNum(r["AvgA"]),
      avgO25: toNum(r["Avg>2.5"] || r["BbAv>2.5"] || r["B365>2.5"]),
      avgU25: toNum(r["Avg<2.5"] || r["BbAv<2.5"] || r["B365<2.5"]),
    }));

  return out;
}

// Match FPL fixture (kickoff_time + team names) to odds row
export function findOddsForFixture(
  odds: OddsRow[],
  kickoffISO: string | null,
  homeTeamNameFpl: string,
  awayTeamNameFpl: string
) {
  const home = mapFplTeamToFootballData(homeTeamNameFpl);
  const away = mapFplTeamToFootballData(awayTeamNameFpl);

  // Convert kickoff ISO to DD/MM/YYYY (UK-ish match dates)
  // We'll match by teams first; date is a soft filter (timezones can shift).
  let dmy: string | null = null;
  if (kickoffISO) {
    const d = new Date(kickoffISO);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    dmy = `${dd}/${mm}/${yyyy}`;
  }

  const candidates = odds.filter((o) => o.home === home && o.away === away);
  if (!candidates.length) return null;

  // If date matches, prefer it
  if (dmy) {
    const exact = candidates.find((c) => c.date === dmy);
    if (exact) return exact;
  }

  return candidates[0];
}
