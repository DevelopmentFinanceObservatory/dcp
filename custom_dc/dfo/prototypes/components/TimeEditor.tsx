'use client';

/**
 * TimeEditor — the edit control for the `when` slot. Time is a window (start/end
 * years), so this offers two editable year fields bounded to the data's real
 * coverage (minYear/maxYear, from the resolved StatVars' data_date_range — see
 * deriveYearBounds). A year typed below the available range snaps to the lowest
 * available; above it, to the highest — so the user can't ask for data that isn't
 * there. One year → "in YYYY"; two → "between YYYY–YYYY"; both empty (or the
 * "all years" toggle) → unbound. Shares the popover shell with PhrasePopover.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Binding } from '@/lib/contract/types';
import { useFocusTrap } from './useFocusTrap';

const FALLBACK_MAX_YEAR = 2026;
const FALLBACK_MIN_YEAR = 2000;

/** A 4-digit year from an input string, or null when incomplete/invalid. */
function toYear(s: string): number | null {
  return /^\d{4}$/.test(s.trim()) ? Number(s.trim()) : null;
}

/** First 4-digit year in a date string ("YYYY", "YYYY-MM", full date). */
function parseYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const m = /^(\d{4})/.exec(dateStr);
  const y = m ? Number(m[1]) : NaN;
  return Number.isFinite(y) ? y : null;
}

/**
 * Derive {minYear, maxYear} from a spec's resolved StatVars' data_date_range — the
 * union of real data coverage — so the fields can bound to what data exists. A
 * bound is omitted when no StatVar reports it.
 */
export function deriveYearBounds(
  statVars: readonly { data_date_range?: { start?: string | null; end?: string | null } | null }[] | undefined,
): { minYear?: number; maxYear?: number } {
  let minYear: number | undefined;
  let maxYear: number | undefined;
  for (const sv of statVars ?? []) {
    const startY = parseYear(sv.data_date_range?.start);
    const endY = parseYear(sv.data_date_range?.end);
    if (startY != null) minYear = minYear == null ? startY : Math.min(minYear, startY);
    if (endY != null) maxYear = maxYear == null ? endY : Math.max(maxYear, endY);
  }
  return { minYear, maxYear };
}

function initialState(current: Binding | undefined): { all: boolean; start: string; end: string } {
  if (current?.kind === 'value' && current.value.value_kind === 'time_window') {
    const w = current.value.time_window;
    return {
      all: false,
      start: w?.start_year != null ? String(w.start_year) : '',
      end: w?.end_year != null ? String(w.end_year) : '',
    };
  }
  return { all: current?.kind !== 'value', start: '', end: '' };
}

export function TimeEditor({
  label,
  currentBinding,
  minYear,
  maxYear,
  onApply,
  onClose,
}: {
  label: string;
  currentBinding?: Binding;
  /** Real data lower bound (see deriveYearBounds); entries snap up to it. */
  minYear?: number;
  /** Real data upper bound; entries snap down to it. */
  maxYear?: number;
  onApply: (binding: Binding) => void;
  onClose: () => void;
}) {
  const effMinYear = minYear ?? FALLBACK_MIN_YEAR;
  const effMaxYear = Math.max(effMinYear, maxYear ?? FALLBACK_MAX_YEAR);

  const init = useMemo(() => initialState(currentBinding), [currentBinding]);
  const [all, setAll] = useState(init.all);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);

  const dialogRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  useFocusTrap(dialogRef, true);
  useEffect(() => {
    startRef.current?.focus();
  }, []);

  const clamp = (y: number) => Math.min(effMaxYear, Math.max(effMinYear, y));
  // A completed 4-digit year, snapped into the available range; null while typing.
  const clampedYear = (v: string) => {
    const y = toYear(v);
    return y != null ? clamp(y) : null;
  };
  const startNum = clampedYear(start);
  const endNum = clampedYear(end);

  function edit(setter: (v: string) => void) {
    return (v: string) => {
      if (all) setAll(false);
      setter(v);
    };
  }

  // On blur, snap ANY entered number into range (100 → lowest, 2500 → highest) —
  // not just completed 4-digit years, so an out-of-range value like "100" defaults
  // to the lowest available rather than being cleared. Clears only empty/non-
  // numeric input.
  function snap(v: string, setter: (v: string) => void) {
    const t = v.trim();
    if (t === '') {
      setter('');
      return;
    }
    const n = Number(t);
    setter(Number.isFinite(n) ? String(clamp(Math.round(n))) : '');
  }

  function previewText(): string {
    if (all) return 'all years';
    if (startNum != null && endNum != null && startNum !== endNum) {
      return `between ${Math.min(startNum, endNum)}–${Math.max(startNum, endNum)}`;
    }
    const year = startNum ?? endNum;
    return year != null ? `in ${year}` : 'all years';
  }

  function apply() {
    if (all || (startNum == null && endNum == null)) {
      onApply({ kind: 'unbound' });
      return;
    }
    const time_window =
      startNum != null && endNum != null
        ? { start_year: Math.min(startNum, endNum), end_year: Math.max(startNum, endNum) }
        : { start_year: (startNum ?? endNum) as number };
    onApply({ kind: 'value', value: { value_kind: 'time_window', time_window } });
  }

  const fieldClass =
    'w-full rounded-lg border border-g2 px-2 py-1.5 text-[15px] tabular-nums text-g6 outline-none focus:border-g4';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`Edit ${label}`}
      className="relative rounded-xl border border-g6 bg-white p-3 text-[14px] shadow-dark"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter') apply();
      }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[7px] left-[22px] h-3 w-3 rotate-45 border-l border-t border-g6 bg-white"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-g4">{label}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-g5"
        >
          ×
        </button>
      </div>

      <div className={all ? 'grid grid-cols-[1fr_auto_1fr] items-end gap-2 opacity-60' : 'grid grid-cols-[1fr_auto_1fr] items-end gap-2'}>
        <label className="grid gap-1 text-[12px] text-g4">
          <span className="whitespace-nowrap">Start</span>
          <input
            ref={startRef}
            type="number"
            inputMode="numeric"
            min={effMinYear}
            max={effMaxYear}
            value={start}
            placeholder={String(effMinYear)}
            aria-label="Start year"
            onChange={(e) => edit(setStart)(e.target.value)}
            onBlur={(e) => snap(e.target.value, setStart)}
            className={fieldClass}
          />
        </label>
        <span className="pb-2 text-g4">–</span>
        <label className="grid gap-1 text-[12px] text-g4">
          <span className="whitespace-nowrap">End <span className="text-g3">(optional)</span></span>
          <input
            type="number"
            inputMode="numeric"
            min={effMinYear}
            max={effMaxYear}
            value={end}
            placeholder={String(effMaxYear)}
            aria-label="End year"
            onChange={(e) => edit(setEnd)(e.target.value)}
            onBlur={(e) => snap(e.target.value, setEnd)}
            className={fieldClass}
          />
        </label>
      </div>

      <p className="mt-1 text-[12px] text-g4">Data available {effMinYear}–{effMaxYear}</p>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-g5">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => {
            setAll(e.target.checked);
            if (e.target.checked) {
              setStart('');
              setEnd('');
            }
          }}
          className="h-[15px] w-[15px] accent-g6"
        />
        <span className="text-[13px]">All years</span>
      </label>

      <div className="mt-2.5 flex items-center justify-between border-t border-g2 pt-2.5">
        <span className="text-[13px] text-g4">{previewText()}</span>
        <button
          type="button"
          onClick={apply}
          className="inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light hover:bg-g5"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
