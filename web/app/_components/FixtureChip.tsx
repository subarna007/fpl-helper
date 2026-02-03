export default function FixtureChip({
  isHome,
  opp,
  difficulty,
}: {
  isHome: boolean;
  opp: string;
  difficulty: number;
}) {
  const color =
    difficulty <= 2
      ? "bg-green-50 border-green-200 text-green-800"
      : difficulty === 3
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-red-50 border-red-200 text-red-800";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs ${color}`}>
      <span className="font-semibold">{isHome ? "H" : "A"}</span>
      <span>{opp}</span>
      <span className="opacity-70">({difficulty})</span>
    </span>
  );
}
