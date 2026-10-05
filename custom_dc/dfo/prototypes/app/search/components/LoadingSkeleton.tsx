/**
 * LoadingSkeleton — the one loading placeholder for a run: a single line
 * naming every variable the query asked about (from the `interpretation`
 * event's `expected_results`/`variables`, seeded into the store as
 * `expectedParts` before any part resolves), joined with "and", plus one
 * table-shaped placeholder underneath. The loading state is sentence-shaped
 * because the composed result is one sentence.
 */

function joinWithAnd(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

export interface LoadingSkeletonProps {
  /** named skeleton rows seeded from the interpretation event, in query
   *  order; a row with no name yet renders as a bare placeholder word. */
  expectedParts?: { index: number; variableText: string | null }[];
}

export function LoadingSkeleton({ expectedParts = [] }: LoadingSkeletonProps) {
  const names = expectedParts
    .map((p) => p.variableText)
    .filter((t): t is string => Boolean(t));
  const heading = names.length > 0 ? joinWithAnd(names) : null;

  return (
    <section
      role="status"
      aria-busy="true"
      aria-label="Resolving"
      className="mt-6 grid gap-4"
    >
      <p className="m-0 text-[34px] leading-[1.35] tracking-[-0.01em] text-g4">
        {heading ? <>Finding {heading}…</> : <>Finding what you asked for…</>}
      </p>
      <span
        className="ss-skel block"
        style={{ height: 120, width: "100%" }}
        aria-hidden="true"
      />
    </section>
  );
}
