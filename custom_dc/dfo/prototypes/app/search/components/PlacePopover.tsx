"use client";

/**
 * PlacePopover: the edit control for a property-less `where` (place) slot on
 * standard shapes (for example "women in Kenya").
 *
 * Supports an "All places" unbound mode alongside specific place selection.
 * In specific places mode, alternatives are fetched from POST /api/search/place_options
 * across two scopes:
 *   - "peers": other places with this data at the same hierarchy level
 *   - "children": sub-regions contained within the anchor with data
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Binding,
  BindingValue,
  PlaceOptionsResponse,
  PlaceOptionsScope,
  SlotValue,
} from "@/lib/contract/types";
import type { SlotOption } from "../lib/taxonomy";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/components/useFocusTrap";

type ScopeData = {
  options: SlotOption[];
  selected: Set<number>;
  filter: string;
  note?: string;
};

type ScopeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | ({ status: "loaded" } & ScopeData);

const placeOption = (dcid: string, label: string): SlotOption => ({
  label,
  binding: {
    kind: "value",
    value: { value_kind: "entity", ref: { dcid, label } },
  },
});

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

/** The currently-bound place ref, when the slot holds a single place entity.
 *  The peers scope excludes the anchor, so we prepend it ourselves so it is
 *  pre-checked and part of select all. */
function currentPlaceRef(
  currentBinding?: Binding,
): { dcid: string; label: string } | null {
  if (
    currentBinding?.kind !== "value" ||
    currentBinding.value.value_kind !== "entity"
  )
    return null;
  const ref = currentBinding.value.ref;
  return ref ? { dcid: ref.dcid, label: ref.label } : null;
}

export function PlacePopover({
  label,
  currentBinding,
  fetchOptions,
  onApply,
  onClose,
}: {
  label: string;
  currentBinding?: Binding;
  /** Fetch one scope candidate set; the caller binds stat_var_dcids/anchor_dcid. */
  fetchOptions: (scope: PlaceOptionsScope) => Promise<PlaceOptionsResponse>;
  onApply: (binding: Binding) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"all" | "specific">(() =>
    currentBinding?.kind === "unbound" ? "all" : "specific",
  );
  const [scope, setScope] = useState<PlaceOptionsScope>("peers");
  const [states, setStates] = useState<Record<PlaceOptionsScope, ScopeState>>({
    peers: { status: "idle" },
    children: { status: "idle" },
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useFocusTrap(dialogRef, true);

  // Fetch when the active scope is idle
  useEffect(() => {
    if (states[scope].status !== "idle") return;
    let cancelled = false;
    setStates((prev) => ({ ...prev, [scope]: { status: "loading" } }));

    fetchOptions(scope)
      .then((res) => {
        if (cancelled) return;
        let options: SlotOption[];
        if (scope === "peers") {
          const current = currentPlaceRef(currentBinding);
          const peers = res.options
            .filter((o) => o.dcid !== current?.dcid)
            .map((o) => placeOption(o.dcid, o.label));
          options = current
            ? [placeOption(current.dcid, current.label), ...peers]
            : peers;
        } else {
          options = res.options.map((o) => placeOption(o.dcid, o.label));
        }

        if (options.length === 0) {
          setStates((prev) => ({ ...prev, [scope]: { status: "empty" } }));
          return;
        }

        const selected = initialSelection(options, currentBinding);
        setStates((prev) => ({
          ...prev,
          [scope]: {
            status: "loaded",
            options,
            selected,
            filter: "",
            note: res.complete
              ? undefined
              : `First ${res.options.length} shown (more may exist).`,
          },
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        const code = (e as { code?: string | null } | null)?.code;
        const isUnsupported =
          code === `unsupported_${scope}_anchor_type` ||
          (e instanceof Error &&
            e.message.includes(`unsupported_${scope}_anchor_type`));
        if (isUnsupported) {
          setStates((prev) => ({ ...prev, [scope]: { status: "empty" } }));
          return;
        }
        setStates((prev) => ({
          ...prev,
          [scope]: {
            status: "error",
            message: e instanceof Error ? e.message : "Could not load places.",
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [scope, fetchOptions, currentBinding]);

  const currentState = states[scope];

  useEffect(() => {
    if (mode === "specific") {
      (filterRef.current ?? closeRef.current)?.focus();
    }
  }, [mode, scope, currentState.status]);

  const filtered = useMemo(() => {
    if (currentState.status !== "loaded") return [];
    const q = currentState.filter.trim().toLowerCase();
    return currentState.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => option.label.toLowerCase().includes(q));
  }, [currentState]);

  const allFilteredSelected =
    filtered.length > 0 &&
    currentState.status === "loaded" &&
    filtered.every(({ index }) => currentState.selected.has(index));
  const someFilteredSelected =
    currentState.status === "loaded" &&
    filtered.some(({ index }) => currentState.selected.has(index));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  function setFilter(filter: string) {
    setStates((prev) => {
      const s = prev[scope];
      if (s.status !== "loaded") return prev;
      return { ...prev, [scope]: { ...s, filter } };
    });
  }

  function toggle(index: number) {
    setStates((prev) => {
      const s = prev[scope];
      if (s.status !== "loaded") return prev;
      const next = new Set(s.selected);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...prev, [scope]: { ...s, selected: next } };
    });
  }

  function toggleAll() {
    setStates((prev) => {
      const s = prev[scope];
      if (s.status !== "loaded") return prev;
      const next = new Set(s.selected);
      if (allFilteredSelected) {
        filtered.forEach(({ index }) => next.delete(index));
      } else {
        filtered.forEach(({ index }) => next.add(index));
      }
      return { ...prev, [scope]: { ...s, selected: next } };
    });
  }

  function apply() {
    if (mode === "all") {
      onApply({ kind: "unbound" });
      return;
    }
    if (currentState.status !== "loaded") return;
    const chosen = [...currentState.selected]
      .sort((a, b) => a - b)
      .map((i) => currentState.options[i]);
    if (chosen.length === 0) return;
    if (chosen.length === 1) {
      onApply(chosen[0].binding);
      return;
    }
    onApply({
      kind: "set",
      values: chosen.map((c) => (c.binding as BindingValue).value),
    });
  }

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

      <div
        role="group"
        aria-label="Place selection mode"
        className="mb-2 flex rounded-lg bg-g1 p-0.5"
      >
        <button
          type="button"
          onClick={() => setMode("all")}
          aria-pressed={mode === "all"}
          className={cn(
            "flex-1 cursor-pointer rounded-md py-1 text-[12px] font-medium transition-colors",
            mode === "all"
              ? "bg-white font-semibold text-g6 shadow-sm"
              : "text-g4 hover:text-g5",
          )}
        >
          All places
        </button>
        <button
          type="button"
          onClick={() => setMode("specific")}
          aria-pressed={mode === "specific"}
          className={cn(
            "flex-1 cursor-pointer rounded-md py-1 text-[12px] font-medium transition-colors",
            mode === "specific"
              ? "bg-white font-semibold text-g6 shadow-sm"
              : "text-g4 hover:text-g5",
          )}
        >
          Specific places
        </button>
      </div>

      {mode === "all" ? (
        <div className="py-2">
          <p className="m-0 text-[13px] text-g5">
            Query across all places without filtering by a specific location.
          </p>
          <div className="mt-3 flex items-center justify-end border-t border-g2 pt-2.5">
            <button
              type="button"
              onClick={apply}
              className="inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light hover:bg-g5"
            >
              Apply
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Place scope"
            className="mb-2 flex gap-1 border-b border-g2 pb-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === "peers"}
              onClick={() => setScope("peers")}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 text-[12px]",
                scope === "peers"
                  ? "border-g6 bg-g6 font-medium text-white"
                  : "border-g2 bg-transparent text-g4 hover:border-g4",
              )}
            >
              Peers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === "children"}
              onClick={() => setScope("children")}
              className={cn(
                "cursor-pointer rounded-full border px-2.5 py-1 text-[12px]",
                scope === "children"
                  ? "border-g6 bg-g6 font-medium text-white"
                  : "border-g2 bg-transparent text-g4 hover:border-g4",
              )}
            >
              Sub-regions
            </button>
          </div>

          {currentState.status === "loading" && (
            <p className="m-0 px-0.5 py-1 text-[13px] text-g4">Loading…</p>
          )}

          {currentState.status === "empty" && (
            <p className="m-0 px-0.5 py-1 text-[13px] text-g4">
              {scope === "peers"
                ? "No other places with this data."
                : "No sub-regions with data found."}
            </p>
          )}

          {currentState.status === "error" && (
            <p className="m-0 px-0.5 py-1 text-[13px] text-[#991b1b]">
              {currentState.message}
            </p>
          )}

          {currentState.status === "loaded" && (
            <>
              {currentState.note && (
                <p className="m-0 mb-2 px-0.5 text-[12px] text-[#92400e]">
                  {currentState.note}
                </p>
              )}
              <input
                ref={filterRef}
                type="text"
                value={currentState.filter}
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
                <p className="m-0 px-0.5 py-1 text-[13px] text-g4">
                  No matches.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto pr-1">
                  <ul className="m-0 grid list-none gap-0.5 p-0">
                    {filtered.map(({ option, index }) => (
                      <li key={`${option.label}-${index}`}>
                        <label className="flex cursor-pointer items-center gap-2 px-0.5 py-1">
                          <input
                            type="checkbox"
                            checked={currentState.selected.has(index)}
                            onChange={() => toggle(index)}
                            className="h-[15px] w-[15px] accent-g6"
                          />
                          <span className="flex-1 text-g6">{option.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-end border-t border-g2 pt-2.5">
                <button
                  type="button"
                  onClick={apply}
                  disabled={currentState.selected.size === 0}
                  className={cn(
                    "inline-flex cursor-pointer items-center rounded-xl bg-g6 px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-light",
                    "hover:bg-g5 disabled:cursor-default disabled:opacity-40",
                  )}
                >
                  Apply
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
