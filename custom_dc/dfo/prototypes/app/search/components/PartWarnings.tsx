/**
 * PartWarnings — the two part-scoped signals a per-part view needs to show,
 * both carried on `Part.warnings`:
 *
 *   - `binding_folded`: this part collapsed onto an earlier part's identical
 *     five-tuple spec, so it has no independent result of its own — named
 *     here rather than left as generic engine copy, since the engine's own
 *     message doesn't know which earlier block on THIS page it matches.
 *   - `observations_omitted`: a candidates part that was asked for
 *     observations, which the engine never fetches for unpicked candidates.
 *     The engine's own `message` already names the fix (resubmit a chosen
 *     candidate), so it's shown verbatim.
 *
 * Nothing else in `warnings` is rendered here — a request-scoped signal
 * (`variables_clamped`) lives on `ResolveResponse.diagnostics.warnings` and
 * is shown once above every block, not per part.
 */

import type { Warning } from "@/lib/contract/types";

export interface PartWarningsProps {
  warnings: Warning[];
  /** the earlier part's own variable text, when this part carries
   *  `binding_folded` and shares that part's spec_id — names it in the
   *  one-line note. Undefined/null renders a generic fallback. */
  foldedWithVariableText?: string | null;
}

export function PartWarnings({
  warnings,
  foldedWithVariableText,
}: PartWarningsProps) {
  const folded = warnings.find((w) => w.code === "binding_folded");
  const omitted = warnings.find((w) => w.code === "observations_omitted");
  if (!folded && !omitted) return null;

  return (
    <div className="grid gap-1.5">
      {folded && (
        <p role="status" className="m-0 text-[15px] text-g5">
          Same result as{" "}
          {foldedWithVariableText ? (
            <>&ldquo;{foldedWithVariableText}&rdquo;</>
          ) : (
            "an earlier part"
          )}{" "}
          above.
        </p>
      )}
      {omitted && <p className="m-0 text-[13px] text-g4">{omitted.message}</p>}
    </div>
  );
}
