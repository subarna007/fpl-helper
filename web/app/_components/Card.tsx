export default function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}
