'use client';

/**
 * EntityPopover — the directional-entity edit UI (dev-finance donor), floating
 * anchored beneath the donor phrase like PhrasePopover does for slots.
 *
 * Single-select on purpose: the engine resolves exactly one donor in v1, so
 * picking an option applies immediately (no checkbox/Apply ceremony). Options
 * come from the spec's entity_options; each shows its observation count when
 * coverage was requested. Options the engine probed and found no data for are
 * ranked last, muted, and disabled — same rank-and-demote contract as
 * PhrasePopover. Keyboard: focus opens on the filter, ↑/↓ move between options,
 * Tab is trapped inside, Escape closes.
 *
 * `onRefine` (optional, back-compat: omitted hides the field) mirrors
 * PhrasePopover's free-text escape hatch — see refineQuery.spliceSentence.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SlotOption } from '../lib/taxonomy';
import { cn } from '@/lib/cn';
import { optionRichness, optionState, partitionOptions } from '@/lib/optionCoverage';
import { useFocusTrap } from '@/components/useFocusTrap';

/** dcid behind one option; entity options always carry a value ref. */
function optionDcid(option: SlotOption): string | null {
  return option.binding.kind === 'value' ? (option.binding.value.ref?.dcid ?? null) : null;
}

export function EntityPopover({
  label,
  options,
  currentDcid,
  onPick,
  onClose,
  onRefine,
}: {
  label: string;
  options: SlotOption[];
  /** dcid of the currently-bound entity (marks the ✓ row) */
  currentDcid: string | null;
  onPick: (dcid: string) => void;
  onClose: () => void;
  /** free-text refine: typing something new and pressing Enter runs it as a
   *  fresh search instead of picking from `options`. Omitted hides the field. */
  onRefine?: (text: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [refineText, setRefineText] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const refineRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, true);
  useEffect(() => {
    // Filter (when the option list renders one) beats the refine field beats
    // Close — see PhrasePopover's identical mount-focus contract.
    (filterRef.current ?? refineRef.current ?? closeRef.current)?.focus();
  }, []);

  function submitRefine() {
    const trimmed = refineText.trim();
    if (trimmed) onRefine?.(trimmed);
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return options.filter((o) => optionDcid(o) != null && o.label.toLowerCase().includes(q));
  }, [options, filter]);

  // Richest-first, probed-zero last (pinning the current pick into view).
  const ordered = useMemo(() => {
    const { main, hidden } = partitionOptions<SlotOption>(filtered, {
      state: optionState,
      richness: optionRichness,
      label: (o) => o.label,
      isPinned: (o) => optionDcid(o) === currentDcid,
    });
    return [...main, ...hidden];
  }, [filtered, currentDcid]);

  // ↑/↓ move focus between the option buttons.
  function onArrow(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button[data-option]') ?? [],
    ).filter((el) => !el.disabled);
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (current === -1) next = event.key === 'ArrowDown' ? 0 : items.length - 1;
    else next = event.key === 'ArrowDown' ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
    items[next]?.focus();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`Edit ${label}`}
      className="relative rounded-xl border border-g6 bg-white p-3 text-[14px] shadow-dark"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }
        onArrow(e);
      }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[7px] left-[22px] h-3 w-3 rotate-45 border-l border-t border-g6 bg-white"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-g4">{label}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-g5"
        >
          ×
        </button>
      </div>

      {options.length === 0 ? (
        onRefine ? (
          <RefineField
            inputRef={refineRef}
            value={refineText}
            onChange={setRefineText}
            onSubmit={submitRefine}
            hint="Type a replacement and press ↵ or Search — this runs a new search keeping the rest of the sentence."
          />
        ) : (
          <p className="m-0 text-[13px] text-g4">No options available for this phrase.</p>
        )
      ) : (
        <>
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter options"
            placeholder="Filter…"
            className="mb-2 w-full rounded-lg border border-g2 px-2.5 py-1.5 text-[14px] text-g6 outline-none placeholder:text-g3 focus:border-g4"
          />

          {ordered.length === 0 ? (
            <p className="m-0 px-0.5 py-1 text-[13px] text-g4">No matches.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-1">
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {ordered.map((option, i) => {
                  const dcid = optionDcid(option)!;
                  const isCurrent = dcid === currentDcid;
                  const noData = optionState(option) === 'probed-zero' && !isCurrent;
                  return (
                    <li key={`${dcid}-${i}`}>
                      <button
                        type="button"
                        data-option
                        disabled={noData}
                        onClick={() => onPick(dcid)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-0.5 py-1 text-left',
                          noData ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-g1',
                        )}
                        aria-current={isCurrent || undefined}
                      >
                        <span aria-hidden="true" className={cn('w-3 flex-none', isCurrent ? 'text-g6' : 'text-g3')}>
                          {isCurrent ? '✓' : '·'}
                        </span>
                        <span className={cn('flex-1', noData ? 'text-g4' : 'text-g6')}>
                          {option.label}
                          {noData && <span className="sr-only"> (no reported data)</span>}
                        </span>
                        {option.count != null && (
                          <span className="text-[13px] tabular-nums text-g4">
                            {option.count.toLocaleString()} obs
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      {onRefine && options.length > 0 && (
        <RefineField inputRef={refineRef} value={refineText} onChange={setRefineText} onSubmit={submitRefine} />
      )}
    </div>
  );
}

/** The free-text refine control — identical contract to PhrasePopover's own
 *  RefineField (duplicated rather than shared: both are small, private
 *  render helpers colocated with their one caller, same as OptionCheckboxItem
 *  below is private to PhrasePopover). `hint` (the no-options case only) shows
 *  a one-line instruction; otherwise the field carries a top divider so it
 *  reads as a secondary action below the option list. Carries its own Search
 *  button (mirrors onSubmit) — in the no-options branch it's the only
 *  affordance, since there's no option list to fall back on. */
function RefineField({
  value,
  onChange,
  onSubmit,
  inputRef,
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  hint?: string;
}) {
  const canSubmit = value.trim().length > 0;
  return (
    <div className={hint ? undefined : 'mt-2.5 border-t border-g2 pt-2.5'}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Cursor movement here, not option navigation — stop Up/Down from
          // bubbling to the dialog's onArrow, which would steal focus to an
          // option button mid-type.
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Search for something different…"
        aria-label="Search for something different"
        className="w-full rounded-lg border border-g2 px-2.5 py-1.5 text-[14px] text-g6 outline-none placeholder:text-g3 focus:border-g4"
      />
      {hint && <p className="m-0 mt-1.5 px-0.5 text-[12px] text-g4">{hint}</p>}
      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light',
            'hover:bg-g5 disabled:cursor-default disabled:opacity-40',
          )}
        >
          Search
        </button>
      </div>
    </div>
  );
}
