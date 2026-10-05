"use client";

/**
 * PhrasePopover edits an individual slot, floating anchored beneath the phrase.
 *
 * Multi-select: each value option is a checkbox with its observation count. A
 * filter box narrows long lists, a "select all" control toggles the filtered
 * options, and Apply commits the result. Selecting two or more values commits a
 * set, shown compactly as "First +N"; selecting one value commits a single value.
 * Selecting every option commits a set of all values to keep
 * the phrase visible and editable (an unbound optional slot renders as an empty
 * token that the engine omits). Pre-checks the options matching the slot's current
 * binding. For keyboard navigation, focus opens on the filter, up/down arrows move
 * between options, Tab is trapped inside, and Escape closes.
 *
 * Options confirmed to have no data for this slice are shown (ranked last, muted)
 * with a disabled checkbox and omitted from "Select all", preventing selection of
 * values that would collapse the sentence to no data. An already-selected option
 * that later reads zero stays toggleable so it can be removed.
 *
 * Supports an unbind action ("All [label]") to dispatch `{ kind: 'unbound' }`.
 *
 * `onRefine` (optional, for backward compatibility; omitted hides the field entirely)
 * adds a free-text input alongside the checkbox list. Typing replacement text and
 * pressing Enter (or clicking Search) starts a new search (see refineQuery.spliceSentence).
 * When options are present, the refine input sits under a divider below Apply and keeps
 * initial focus on the filter. When no options are available, the refine input and its
 * Search button replace the list and receive initial focus.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Binding, BindingValue, SlotValue } from "@/lib/contract/types";
import type { SlotOption } from "../lib/taxonomy";
import { cn } from "@/lib/cn";
import {
  optionRichness,
  optionState,
  partitionOptions,
} from "@/lib/optionCoverage";
import { useFocusTrap } from "@/components/useFocusTrap";

function valueKey(v: SlotValue): string {
  return v.ref?.dcid ?? v.literal ?? JSON.stringify(v.time_window ?? v);
}

function initialSelection(
  values: SlotOption[],
  current?: Binding,
): Set<number> {
  if (!current || current.kind === "unbound") return new Set();
  const keys = new Set<string>();
  if (current.kind === "value") keys.add(valueKey(current.value));
  if (current.kind === "set")
    current.values.forEach((v) => keys.add(valueKey(v)));
  const out = new Set<number>();
  values.forEach((opt, i) => {
    if (opt.binding.kind === "value" && keys.has(valueKey(opt.binding.value)))
      out.add(i);
  });
  return out;
}

export function PhrasePopover({
  label,
  options,
  currentBinding,
  onApply,
  onClose,
  onRefine,
  note,
}: {
  label: string;
  options: SlotOption[];
  currentBinding?: Binding;
  onApply: (binding: Binding) => void;
  onClose: () => void;
  /** free-text refine: typing something new and pressing Enter runs it as a
   *  fresh search instead of picking from `options`. Omitted hides the field. */
  onRefine?: (text: string) => void;
  /** optional advisory line above the list (e.g. a truncation notice). */
  note?: string;
}) {
  const values = useMemo(
    () => options.filter((o) => o.binding.kind === "value"),
    [options],
  );
  const [selected, setSelected] = useState<Set<number>>(() =>
    initialSelection(values, currentBinding),
  );
  const [filter, setFilter] = useState("");
  const [refineText, setRefineText] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const refineRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useFocusTrap(dialogRef, true);
  useEffect(() => {
    // Filter (when the option list renders one) beats the refine field beats
    // Close — the refine field only wins when there's no filter to steal from
    // (the no-options branch, where it's the only interactive control).
    (filterRef.current ?? refineRef.current ?? closeRef.current)?.focus();
  }, []);

  function submitRefine() {
    const trimmed = refineText.trim();
    if (trimmed) onRefine?.(trimmed);
  }

  // Options matching the filter, carrying their original index.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return values
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => option.label.toLowerCase().includes(q));
  }, [values, filter]);

  // The binding this popover opened with (not the live selected toggle state),
  // used only to pin an already-chosen-but-zero-coverage option into view, so
  // checking or unchecking boxes keeps the list order stable mid-edit.
  const initiallySelected = useMemo(
    () => initialSelection(values, currentBinding),
    [values, currentBinding],
  );

  // Rank by coverage: richest-first, then probed-zero options last (unless already
  // selected, or nothing in this list was ever probed, in which case order is left
  // untouched). Prefers each option's full engine coverage (correct for
  // breadth/bare probed-zero, which carry no `count`) and falls back to `count`
  // alone for providers that pass only count (for example FixtureOptions).
  // Both groups render in one list; probed-zero rows are shown muted and disabled
  // (see `disabled` below) in place.
  const ordered = useMemo(() => {
    const { main, hidden } = partitionOptions(filtered, {
      state: ({ option }) => optionState(option),
      richness: ({ option }) => optionRichness(option),
      label: ({ option }) => option.label,
      isPinned: ({ index }) => initiallySelected.has(index),
    });
    return [...main, ...hidden];
  }, [filtered, initiallySelected]);

  // A probed-zero option is not checkable (it would collapse the sentence to
  // no_data), but if it is already selected, it stays toggleable so it can be
  // removed. Select-all targets only the checkable (non-probed-zero) options.
  const isDisabled = ({
    option,
    index,
  }: {
    option: SlotOption;
    index: number;
  }) => optionState(option) === "probed-zero" && !selected.has(index);
  const selectable = filtered.filter(
    ({ option }) => optionState(option) !== "probed-zero",
  );
  const allFilteredSelected =
    selectable.length > 0 &&
    selectable.every(({ index }) => selected.has(index));
  const someFilteredSelected = selectable.some(({ index }) =>
    selected.has(index),
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected)
        selectable.forEach(({ index }) => next.delete(index));
      else selectable.forEach(({ index }) => next.add(index));
      return next;
    });
  }

  function apply() {
    const chosen = [...selected].sort((a, b) => a - b).map((i) => values[i]);
    if (chosen.length === 0) return;
    if (chosen.length === 1) {
      onApply(chosen[0].binding);
      return;
    }
    // Two or more (including all of them) commit as a set, rendered compactly
    // as "First +N". We do not collapse an all-selected set to unbound; an unbound
    // optional slot (for example purpose) renders as an empty token the engine omits,
    // so the phrase would vanish from the sentence and become uneditable. A set of
    // every value queries the same data as "all" while keeping an editable chip on
    // the surface.
    onApply({
      kind: "set",
      values: chosen.map((c) => (c.binding as BindingValue).value),
    });
  }

  function applyUnbound() {
    onApply({ kind: "unbound" });
  }

  // Up/down arrows move focus between the option checkboxes and select-all. This skips
  // non-visible checkboxes.
  function onArrow(event: React.KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const inputs = Array.from(
      dialogRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      ) ?? [],
    ).filter((el) => el.offsetParent !== null && !el.disabled);
    if (inputs.length === 0) return;
    event.preventDefault();
    const current = inputs.indexOf(document.activeElement as HTMLInputElement);
    let next: number;
    if (current === -1)
      next = event.key === "ArrowDown" ? 0 : inputs.length - 1;
    else
      next =
        event.key === "ArrowDown"
          ? Math.min(current + 1, inputs.length - 1)
          : Math.max(current - 1, 0);
    inputs[next]?.focus();
  }

  const isCurrentlyUnbound = currentBinding?.kind === "unbound";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={`Edit ${label}`}
      className="relative rounded-xl border border-g6 bg-white p-3 text-[14px] shadow-dark"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
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
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-g4">
          {label}
        </span>
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

      <div className="mb-2 border-b border-g2 pb-2">
        <button
          type="button"
          onClick={applyUnbound}
          className={cn(
            "w-full cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-colors",
            isCurrentlyUnbound
              ? "border-g6 bg-g6 font-medium text-white"
              : "border-g2 bg-g1 text-g6 hover:border-g4 hover:bg-white",
          )}
        >
          All {label}s
        </button>
      </div>

      {values.length === 0 ? (
        onRefine ? (
          <RefineField
            inputRef={refineRef}
            value={refineText}
            onChange={setRefineText}
            onSubmit={submitRefine}
            hint="Type a replacement and press ↵ or Search to run a new search keeping the rest of the sentence."
          />
        ) : (
          <p className="m-0 text-[13px] text-g4">
            No options available for this phrase.
          </p>
        )
      ) : (
        <>
          {note && (
            <p className="m-0 mb-2 px-0.5 text-[12px] text-[#92400e]">{note}</p>
          )}
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter options"
            placeholder="Filter…"
            className="mb-2 w-full rounded-lg border border-g2 px-2.5 py-1.5 text-[14px] text-g6 outline-none placeholder:text-g3 focus:border-g4"
          />

          <label className="flex cursor-pointer items-center gap-2 border-b border-g2 px-0.5 pb-1.5 text-g5">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              className="h-[15px] w-[15px] accent-g6"
              aria-label="Select all"
            />
            <span className="flex-1 text-[13px]">Select all</span>
          </label>

          {filtered.length === 0 ? (
            <p className="m-0 px-0.5 py-1 text-[13px] text-g4">No matches.</p>
          ) : (
            // Cap the height and scroll so a long list (e.g. many countries)
            // doesn't blow up the popover. Options with no data for this slice are
            // ranked last and rendered muted + disabled (uncheckable), not hidden.
            <div className="max-h-60 overflow-y-auto pr-1">
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {ordered.map(({ option, index }) => (
                  <OptionCheckboxItem
                    key={`${option.label}-${index}`}
                    option={option}
                    checked={selected.has(index)}
                    onToggle={() => toggle(index)}
                    disabled={isDisabled({ option, index })}
                    muted={optionState(option) === "probed-zero"}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {values.length > 0 && (
        <div className="mt-2.5 flex items-center justify-end border-t border-g2 pt-2.5">
          <button
            type="button"
            onClick={apply}
            disabled={selected.size === 0}
            className={cn(
              "inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light",
              "hover:bg-g5 disabled:cursor-default disabled:opacity-40",
            )}
          >
            Apply
          </button>
        </div>
      )}

      {onRefine && values.length > 0 && (
        <RefineField
          inputRef={refineRef}
          value={refineText}
          onChange={setRefineText}
          onSubmit={submitRefine}
        />
      )}
    </div>
  );
}

/** The free-text refine control shared by both PhrasePopover states. `hint`
 *  (the no-options case only, where there's no filter/Apply to lean on) shows
 *  a one-line instruction; otherwise the field carries a top divider so it
 *  reads as a secondary action below the checkbox list and Apply. Carries its
 *  own Search button (mirrors onSubmit), serving as the single primary control in
 *  the no-options branch. */
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
    <div className={hint ? undefined : "mt-2.5 border-t border-g2 pt-2.5"}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Keep Up/Down arrow navigation within the text input without bubbling
          // to the dialog arrow listener.
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.stopPropagation();
            return;
          }
          if (e.key === "Enter") {
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
            "inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light",
            "hover:bg-g5 disabled:cursor-default disabled:opacity-40",
          )}
        >
          Search
        </button>
      </div>
    </div>
  );
}

/** One checkbox row. `muted` dims the label for a probed-zero option and adds a
 * screen-reader-only reason suffix, since color alone does not carry to non-visual
 * users. `disabled` makes the checkbox uncheckable (a no-data option that is not
 * already selected). The disabled label displays a default or not-allowed cursor. */
function OptionCheckboxItem({
  option,
  checked,
  onToggle,
  muted,
  disabled,
}: {
  option: SlotOption;
  checked: boolean;
  onToggle: () => void;
  muted?: boolean;
  disabled?: boolean;
}) {
  return (
    <li>
      <label
        className={cn(
          "flex items-center gap-2 px-0.5 py-1",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="h-[15px] w-[15px] accent-g6 disabled:cursor-not-allowed"
        />
        <span className={cn("flex-1", muted ? "text-g4" : "text-g6")}>
          {option.label}
          {muted && <span className="sr-only"> (no reported data)</span>}
        </span>
        {option.count != null && (
          <span className="text-[13px] tabular-nums text-g4">
            {option.count.toLocaleString()} obs
          </span>
        )}
      </label>
    </li>
  );
}
