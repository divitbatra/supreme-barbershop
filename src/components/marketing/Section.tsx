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
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`border-t border-graphite px-6 py-24 md:py-32 ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* The eyebrow is the section's real heading — keeping it an h2 stops
            the card headings below from skipping a level. */}
        <h2
          id={headingId}
          className="mb-12 flex items-center gap-4 text-[0.625rem] font-normal uppercase tracking-[0.38em] text-porcelain/38"
        >
          <span data-numeric className="text-gold">
            {index}
          </span>
          {eyebrow}
        </h2>
        {children}
      </div>
    </section>
  );
}
