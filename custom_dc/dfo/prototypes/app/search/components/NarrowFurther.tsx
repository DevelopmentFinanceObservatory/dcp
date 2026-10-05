"use client";

/**
 * NarrowFurther — the "+ narrow further" affordance at the end of the sentence.
 *
 * Lists dimensions the shape supports that have no phrase of their own in the
 * sentence (slots whose binding is `unbound`, bound wide open rather than
 * absent from the shape, but the engine renders an empty placeholder token for
 * them, which the sentence drops). Picking one opens its value editor right
 * here. A narrowed-in dimension has no sentence chip to anchor a popover
 * under, so this panel is where it gets edited, not the sentence. Hidden when
 * nothing can be added. Floats anchored under the pill, like the phrase popover.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useClickOutside } from "./useClickOutside";
import { clampPopoverLeft } from "./popoverPosition";

export interface NarrowOption {
  slotIndex: number;
  label: string;
}

export function NarrowFurther({
  options,
  onAdd,
  activeIndex = null,
  editor = null,
  onCloseEditor,
  disabled = false,
  idPrefix = "",
}: {
  options: NarrowOption[];
  onAdd: (slotIndex: number) => void;
  /** slotIndex currently open for editing, when it's one of `options`. */
  activeIndex?: number | null;
  /** value editor (PhrasePopover/TimeEditor) for `activeIndex`, shown in place
   *  of the dimension list. */
  editor?: ReactNode;
  /** called to dismiss the editor (Escape, click outside). */
  onCloseEditor?: () => void;
  /** another edit is in flight elsewhere (a sentence phrase popover). The
   *  trigger goes native-disabled and any open dimension list here is
   *  dismissed, so a keyboard user can't open a second editor at once. */
  disabled?: boolean;
  /** prefixed onto the trigger's DOM id ("narrow-further-trigger"), which is
   *  otherwise bare and collides once more than one part is mounted at once.
   *  Defaults to '' so a single-part result keeps its current id (SearchClient's
   *  refocusPhrase keys off the bare form). */
  idPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const editingHere =
    editor != null && options.some((o) => o.slotIndex === activeIndex);
  const panelOpen = open || editingHere;
  useClickOutside(
    anchorRef,
    () => (editingHere ? onCloseEditor?.() : setOpen(false)),
    panelOpen,
  );

  // Sentence phrases close their own editor when another edit takes over
  // (see ComposedSentence). This control doesn't, so a disabled flip has to
  // close the locally-owned dimension list itself.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // Same viewport collision handling as the composed sentence's phrase
  // popover. See clampPopoverLeft (./popoverPosition) for the shared math.
  const [panelOffset, setPanelOffset] = useState(0);
  useLayoutEffect(() => {
    if (!panelOpen) return;
    function measure() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const anchorRect = anchor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      setPanelOffset(
        clampPopoverLeft({
          anchorLeft: anchorRect.left,
          anchorWidth: anchorRect.width,
          popoverWidth: panelRect.width || 300,
          viewportWidth: window.innerWidth,
        }),
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [panelOpen]);

  if (options.length === 0) return null;

  return (
    <span ref={anchorRef} className="relative ml-2 inline-block">
      <button
        type="button"
        id={`${idPrefix}narrow-further-trigger`}
        aria-expanded={panelOpen}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center rounded-full border border-dashed border-g6 bg-white px-3.5 py-1.5 text-[14px] text-g4 hover:border-g3 disabled:cursor-default disabled:opacity-50"
      >
        + narrow further
      </button>
      {panelOpen && (
        <span
          ref={panelRef}
          style={{ left: panelOffset }}
          className="absolute top-full z-50 mt-2.5 w-[300px]"
        >
          {editingHere ? (
            editor
          ) : (
            <div
              role="dialog"
              aria-label="Narrow further"
              className="relative rounded-xl border border-g6 bg-white p-3 text-[14px] shadow-dark"
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <span
                aria-hidden="true"
                className="absolute -top-[7px] left-[22px] h-3 w-3 rotate-45 border-l border-t border-g6 bg-white"
              />
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-g4">
                  narrow on
                </span>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-g5"
                >
                  ×
                </button>
              </div>
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {options.map((o) => (
                  <li key={o.slotIndex}>
                    <button
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        setOpen(false);
                        onAdd(o.slotIndex);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-0.5 py-1 text-left"
                    >
                      <span className="flex-1 text-g6">{o.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </span>
      )}
    </span>
  );
}
