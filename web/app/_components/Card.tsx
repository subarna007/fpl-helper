export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(14,26,43,0.04),0_12px_32px_-24px_rgba(14,26,43,0.35)] ${className}`}
    >
      {children}
    </section>
  );
}
