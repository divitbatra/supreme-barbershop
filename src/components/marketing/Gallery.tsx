/**
 * Placeholder masonry. Real photography of the shop does not exist yet, so
 * rather than ship stock images this holds the layout and says so plainly —
 * a lightbox over borrowed photos would be worse than an honest gap.
 */
const TILES = [
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/5]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-square',
];

export default function Gallery() {
  return (
    <>
      <div className="columns-2 gap-4 md:columns-3">
        {TILES.map((aspect, index) => (
          <div
            key={index}
            aria-hidden
            className={`${aspect} mb-4 break-inside-avoid rounded-[24px] border border-white/[0.06] bg-[radial-gradient(60%_60%_at_50%_35%,rgba(198,202,209,0.05),transparent_70%)]`}
          />
        ))}
      </div>
      <p className="mt-8 text-sm text-porcelain/38">
        Photography of the shop is being shot now. The masonry grid, blur-up loading and lightbox
        land with it.
      </p>
    </>
  );
}
