/**
 * Loading skeleton for the left coverage rail: stat blocks that occupy the same
 * space the rendered numbers will fill, so the rail doesn't shift when the result
 * lands. The `ss-skel` base carries the left → right shimmer (see globals.css);
 * sizes stay inline since they're per-bar. The sentence/table skeletons that used
 * to live here were replaced by LoadTimeline in the result grid.
 */

export function RailSkeleton() {
  return (
    <section className="flex flex-col gap-[1.1rem]" aria-hidden="true">
      {[40, 34, 26].map((w, i) => (
        <div key={i}>
          <div className="ss-skel" style={{ height: 26, width: w }} />
          <div className="ss-skel mt-1.5" style={{ height: 9, width: 52 }} />
        </div>
      ))}
    </section>
  );
}
