export default function Section({
  id,
  index,
  eyebrow,
  children,
  className = '',
}: {
  id: string;
  index: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border-t border-graphite px-6 py-24 md:py-32 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-12 flex items-center gap-4 text-[0.625rem] uppercase tracking-[0.38em] text-porcelain/38">
          <span data-numeric className="text-gold">
            {index}
          </span>
          {eyebrow}
        </p>
        {children}
      </div>
    </section>
  );
}
