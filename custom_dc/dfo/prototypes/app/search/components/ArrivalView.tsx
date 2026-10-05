/**
 * ArrivalView — the blank arrival state. Not a bare field: a short prompt plus
 * curated starter sentences with live (fixture) coverage previews, so the landing
 * screen shows what a result looks like and invites a first query. Each starter is
 * a keyboard-operable button that runs its query.
 */

export interface ArrivalItem {
  query: string;
  /** the starter sentence, or a short label */
  primary: string;
  /** coverage preview or a one-line descriptor */
  secondary: string;
}

export function ArrivalView({
  items,
  onPick,
}: {
  items: ArrivalItem[];
  onPick: (query: string) => void;
}) {
  return (
    <section
      aria-label="Starter queries"
      className="mt-5 flex flex-wrap items-center justify-center gap-2"
    >
      <span className="text-[13px] text-g4">try:</span>
      {items.map((item) => (
        <button
          key={item.query}
          type="button"
          onClick={() => onPick(item.query)}
          title={item.secondary}
          className="inline-flex cursor-pointer items-center rounded-full border border-g6 bg-white px-3.5 py-1.5 text-[14px] text-g5 hover:border-g3"
        >
          {item.primary}
        </button>
      ))}
    </section>
  );
}
