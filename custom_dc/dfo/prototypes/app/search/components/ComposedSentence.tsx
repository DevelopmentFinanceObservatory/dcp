"use client";

/**
 * ComposedSentence — the one-dataset, one-sentence rendering of a resolve
 * result. Renders the envelope's own composed `sentence_plan` as a single
 * hero sentence, every token inline in plan order: a `text` token (a
 * connective, a separator, any punctuation the composer mints) renders as
 * the plain text it is, a definite part's own token is an editable chip
 * routed to that part's own spec via `tokenPartIndex`, a token shared
 * across every part routes to `editShared`, and an unresolved part's own
 * what-token renders marked — a candidates or no_data part opens a popover
 * (a choice menu, or the grounding card and "did you mean" list), an
 * unsupported part just shows its reason on hover. A `note` token renders
 * as muted plain text, never as a chip, wherever the composer placed it
 * (after the terminal "."). A part's own loading state and rejected edit
 * attach to its phrase directly:
 * a pulsing marker on its what-token while an edit targeting it is in
 * flight, and a rejected edit's message where the toolbar shows the run's
 * own status, prefixed with that part's variable text. A candidates part's
 * observations-omitted note shows in its own candidate popover. DataPreview
 * unions every definite part's rows into one table, labelled by each part's
 * own variable text. CoverageRail and ResultSummary ("How this was
 * answered") follow, one rail per definite part and one summary panel
 * across all of them.
 *
 * A response with no envelope `sentence_plan` at all has nothing shared to
 * render: for more than one part there is nothing to compose client-side,
 * so the heading falls back to the run's own query text, rendered as plain
 * non-interactive text. A lone part always uses its own plan as the hero
 * sentence.
 *
 * Known limitation: a per-part edit (editSlot/editDonor/chooseSpec/
 * refineText) resubmits just that one part. The envelope's own composed
 * plan stays exactly as it was at the last full run, so the edited part's
 * own phrase in the heading doesn't change until a fresh run replaces the
 * whole envelope.
 */

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  Binding,
  Part,
  PlaceOptionsScope,
  ResolveResponse,
  SentenceToken,
  Spec,
  Warning,
} from "@/lib/contract/types";
import { partSentence } from "@/lib/contract/parts";
import { partsInPlan, tokenPartIndex } from "../lib/sentencePlan";
import { keyRef, currentDonorDcid } from "@/lib/client/searchClient";
import {
  renderBinding,
  type InterpretationView,
  type TraceRefView,
  type TraceView,
} from "../lib/viewModel";
import {
  spliceSentence,
  type RefineTarget,
} from "../lib/viewModel/refineQuery";
import type { PartView } from "../lib/store/specStore";
import { httpTransport } from "../lib/transport";
import { entityOptionsFromSpec, optionsFromSpec } from "../lib/taxonomy";
import { TimeEditor, deriveYearBounds } from "@/components";
import { computeAddableDimensions } from "./computeAddableDimensions";
import { NarrowFurther } from "./NarrowFurther";
import { PhrasePopover } from "./PhrasePopover";
import { PlacePopover } from "./PlacePopover";
import { EntityPopover } from "./EntityPopover";
import { CandidateView } from "./states/CandidateView";
import { NoDataView } from "./states/NoDataView";
import { clampPopoverLeft } from "./popoverPosition";
import { useClickOutside } from "./useClickOutside";
import { DataPreview } from "./DataPreview";
import { CoverageRail } from "./CoverageRail";
import { ResultSummary } from "./ResultSummary";
import { PartWarnings } from "./PartWarnings";
import { cn } from "@/lib/cn";

/** Dedups TraceRefViews by dcid, keeping the first occurrence's label. */
function dedupRefs(refs: TraceRefView[]): TraceRefView[] {
  const seen = new Map<string, TraceRefView>();
  for (const r of refs) if (!seen.has(r.dcid)) seen.set(r.dcid, r);
  return [...seen.values()];
}

/** Combines every definite part's own InterpretationView into one, for the
 *  multi-part "How this was answered" panel: variables concatenate in part
 *  order, places and the shape label dedup, dates take the first part that
 *  has one. */
function mergeInterpretation(views: InterpretationView[]): InterpretationView {
  return {
    variables: views.flatMap((v) => v.variables),
    places: Array.from(new Set(views.flatMap((v) => v.places))),
    dates: views.map((v) => v.dates).find((d) => d != null) ?? null,
    shapeLabel: Array.from(
      new Set(views.map((v) => v.shapeLabel).filter(Boolean)),
    ).join(", "),
  };
}

/** Combines every definite part's own TraceView into one: refs union and
 *  dedup by dcid across parts, pipeline steps taken from the first part
 *  (the pipeline shape is the same for every part in one run). */
function mergeTrace(views: TraceView[]): TraceView {
  return {
    statVars: dedupRefs(views.flatMap((v) => v.statVars)),
    entities: dedupRefs(views.flatMap((v) => v.entities)),
    sources: dedupRefs(views.flatMap((v) => v.sources)),
    steps: views[0]?.steps ?? [],
  };
}

/**
 * The envelope's own composed plan, when it has one. For a single part, a
 * response with no envelope-level plan still has exactly one sentence to
 * show, so that part's own plan (spec-level, or a synthetic one built from
 * its slots when the spec carries none either) stands in — identical to
 * what the composed plan would carry anyway. For more than one part with no
 * envelope plan, there's nothing to compose client-side: null, so the
 * caller falls back to the run's own query text for the heading.
 */
function resolvePlan(
  response: ResolveResponse | null,
  parts: PartView[],
): SentenceToken[] | null {
  if (response?.sentence_plan && response.sentence_plan.length) {
    return response.sentence_plan;
  }
  if (parts.length === 1) return partPlan(parts[0]);
  return null;
}

function partPlan(pv: PartView): SentenceToken[] {
  if (!pv.part) return [];
  const { sentence_plan } = partSentence(pv.part);
  if (sentence_plan && sentence_plan.length) return sentence_plan;
  if (pv.spec?.slots?.length) {
    const tokens: SentenceToken[] = [];
    for (const slot of pv.spec.slots) {
      if (slot.binding?.kind === "absent") continue;
      if (tokens.length > 0) tokens.push({ kind: "text", text: " " });
      tokens.push({
        kind: "slot",
        text: renderBinding(slot),
        axis: slot.key?.axis,
        property_dcid: slot.key?.property?.dcid ?? null,
        binding_ref: slot.key ? keyRef(slot.key) : null,
        entity_refs: [],
      });
    }
    if (tokens.length) return tokens;
  }
  return [
    {
      kind: "slot",
      text: pv.variableText ?? "",
      axis: "what",
      entity_refs: [],
    },
  ];
}

/** The slot in `spec.slots` a heading token addresses: by `binding_ref`
 *  first (the engine's own join key), falling back to axis (+ property, when
 *  the token carries one) for a synthesized plan whose tokens never got a
 *  binding_ref. -1 when nothing matches (a shape-label fallback). */
function findSlotIndex(
  spec: Spec | null | undefined,
  token: SentenceToken,
): number {
  if (!spec?.slots) return -1;
  if (token.binding_ref) {
    const idx = spec.slots.findIndex(
      (s) => keyRef(s.key) === token.binding_ref,
    );
    if (idx !== -1) return idx;
  }
  if (token.axis) {
    const idx = spec.slots.findIndex(
      (s) =>
        s.key.axis === token.axis &&
        (token.property_dcid
          ? s.key.property?.dcid === token.property_dcid
          : !s.key.property),
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

/** The position, within a part's own tokenised sentence, of its shape-label
 *  fallback phrase (the measure name itself, when it has no Spec.slots entry
 *  to edit by index) — the one addressing scheme spliceSentence's PhraseTarget
 *  needs that isn't content-addressed by slotIndex or role. There is
 *  realistically one such token per part. */
function shapeLabelLocalIndex(viewModel: PartView["viewModel"]): number {
  const tokens = viewModel?.sentenceTokens ?? [];
  return tokens.findIndex(
    (p) => p.kind === "slot" && p.slotIndex < 0 && p.role == null,
  );
}

function currentWherePlaceDcid(
  spec: Spec | null,
  binding: Binding | undefined,
): string | null {
  if (
    binding?.kind === "value" &&
    binding.value.value_kind === "entity" &&
    binding.value.ref
  ) {
    return binding.value.ref.dcid;
  }
  const subject = spec?.entities?.find((e) => e.role?.kind === "subject");
  return subject?.ref?.dcid ?? spec?.entities?.[0]?.ref?.dcid ?? null;
}

const NO_DATA_REASON_TEXT: Record<string, string> = {
  no_observations: "This region has no observations.",
  entity_not_resolved: "We couldn't match the place in that query.",
  variable_not_resolved: "We couldn't match the measure in that query.",
  no_matching_slice:
    "That specific combination is unavailable as a data series.",
  denominator_not_available:
    "The denominator needed for this measure is unavailable.",
  role_unresolved:
    'We couldn\'t tell whether that place is the aid donor or recipient. Try rephrasing with "to" or "from".',
};

function markedTitle(part: Part): string | undefined {
  if (part.status === "no_data") {
    return (
      NO_DATA_REASON_TEXT[part.no_data.reason] ?? "No data matched this query."
    );
  }
  if (part.status === "unsupported") {
    return part.unsupported.detail ?? "This part couldn't be answered.";
  }
  if (part.status === "candidates") {
    return "More than one reading fits — pick the one you mean.";
  }
  return undefined;
}

/** Which token is mid-edit — one of five addressing schemes, all resolved
 *  against a specific part's own spec/viewModel except `shared`, which edits
 *  every definite part at once (including `origin`, the hoisted donor
 *  read-back, fanned to editDonor per part rather than editSlot). `marked`
 *  covers an unresolved part's own what-token: a candidates part's choice
 *  menu, or a no_data part's grounding card and "did you mean" list. */
type EditTarget =
  | { kind: "slot"; partIndex: number; slotIndex: number }
  | { kind: "donor"; partIndex: number }
  | { kind: "phrase"; partIndex: number; localIndex: number; text: string }
  | { kind: "shared"; axis: "where" | "when" | "source" | "origin" }
  | { kind: "marked"; partIndex: number };

function targetKey(t: EditTarget): string {
  switch (t.kind) {
    case "slot":
      return `slot-${t.partIndex}-${t.slotIndex}`;
    case "donor":
      return `donor-${t.partIndex}`;
    case "phrase":
      return `phrase-${t.partIndex}-${t.localIndex}`;
    case "shared":
      return `shared-${t.axis}`;
    case "marked":
      return `marked-${t.partIndex}`;
  }
}

function sameTarget(a: EditTarget | null, b: EditTarget): boolean {
  return a != null && targetKey(a) === targetKey(b);
}

interface TokenChipProps {
  text: string;
  ariaLabel: string;
  editable: boolean;
  active: boolean;
  marked?: boolean;
  /** an edit targeting this token's own part is in flight — pulses the chip
   *  in place rather than showing a separate status line. */
  updating?: boolean;
  title?: string;
  highlight?: boolean;
  anchorRef?: RefObject<HTMLSpanElement | null>;
  popoverRef?: RefObject<HTMLSpanElement | null>;
  popoverOffset?: number;
  popover?: ReactNode;
  /** popover width, a Tailwind width class — wider for content that doesn't
   *  fit the default (a no_data popover's grounding card + suggestion list). */
  popoverWidthClass?: string;
  onClick?: () => void;
}

/** One clickable chip in the hero sentence — a resolved slot, a donor
 *  read-back, a shape-label fallback, a shared hoisted qualifier, or an
 *  unresolved part's marked what-token. The active one floats its popover
 *  underneath, clamped to stay inside the viewport (clampPopoverLeft). */
function TokenChip({
  text,
  ariaLabel,
  editable,
  active,
  marked = false,
  updating = false,
  title,
  highlight = false,
  anchorRef,
  popoverRef,
  popoverOffset = 0,
  popover,
  popoverWidthClass = "w-[320px]",
  onClick,
}: TokenChipProps) {
  return (
    <span
      className="relative inline-block"
      ref={active ? anchorRef : undefined}
    >
      <button
        type="button"
        disabled={!editable}
        onClick={editable ? onClick : undefined}
        title={title}
        aria-label={ariaLabel}
        aria-expanded={editable ? active : undefined}
        aria-busy={updating || undefined}
        className={cn(
          "mr-2 text-left font-[inherit] disabled:cursor-default",
          editable && "cursor-pointer",
          marked
            ? "border-b border-dashed border-[#b45309] font-normal text-[#b45309]"
            : "border-b-2 font-medium",
          !marked &&
            (active
              ? "border-g4 bg-g2 text-g6"
              : "border-g6 bg-transparent text-g6"),
          marked && active && "bg-[#fffbeb]",
          highlight && "animate-flash",
          updating && "animate-pulse opacity-60",
        )}
      >
        {text}
      </button>
      {active && popover ? (
        <span
          ref={popoverRef}
          style={{ left: popoverOffset }}
          className={cn("absolute top-full z-50 mt-2.5", popoverWidthClass)}
        >
          {popover}
        </span>
      ) : null}
    </span>
  );
}

export interface ComposedSentenceProps {
  response: ResolveResponse | null;
  parts: PartView[];
  editPending: number | null;
  lastEditedSlot: { partIndex: number; slotIndex: number } | null;
  onEditSlot: (
    partIndex: number,
    slotIndex: number,
    binding: Binding,
  ) => Promise<void>;
  onEditDonor: (partIndex: number, donorDcid: string) => Promise<void>;
  onEditShared: (
    edit:
      | { axis: "where" | "source"; binding: Binding }
      | { axis: "when"; startYear: number; endYear: number }
      | { axis: "origin"; dcid: string },
  ) => Promise<void>;
  onChooseSpec: (partIndex: number, spec: Spec) => Promise<void>;
  onRefineText: (partIndex: number, text: string) => Promise<void>;
  /** bumped by undo/redo/cancel/start-over — closes any open editor even on
   *  the rare step where `response` doesn't change identity. */
  stepGeneration: number;
  /** request-scoped warnings (SpecState.warnings), for the "How this was
   *  answered" panel — falls back to response.diagnostics.warnings there
   *  when empty, same as the single-part page always has. */
  warnings: Warning[];
}

export function ComposedSentence({
  response,
  parts,
  editPending,
  lastEditedSlot,
  onEditSlot,
  onEditDonor,
  onEditShared,
  onChooseSpec,
  onRefineText,
  stepGeneration,
  warnings,
}: ComposedSentenceProps) {
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const activeAnchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const [popoverOffset, setPopoverOffset] = useState(0);

  useClickOutside(activeAnchorRef, () => setEditing(null), editing != null);

  useEffect(() => {
    setEditing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepGeneration, response]);

  useLayoutEffect(() => {
    if (!editing) return;
    function measure() {
      const anchor = activeAnchorRef.current;
      const pop = popoverRef.current;
      if (!anchor || !pop) return;
      const anchorRect = anchor.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();
      setPopoverOffset(
        clampPopoverLeft({
          anchorLeft: anchorRect.left,
          anchorWidth: anchorRect.width,
          popoverWidth: popRect.width || 320,
          viewportWidth: window.innerWidth,
        }),
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [editing]);

  const wireParts: Part[] = parts
    .map((pv) => pv.part)
    .filter((p): p is Part => p != null);
  if (wireParts.length !== parts.length || parts.length === 0) return null;

  const plan = resolvePlan(response, parts);
  const planParts = plan ? partsInPlan(plan) : new Set<number>();
  const fallbackHeadingText =
    !plan && (response?.query_echo?.raw_query || parts[0]?.variableText || "");

  function closeEditing() {
    setEditing(null);
  }

  async function applySlot(
    partIndex: number,
    slotIndex: number,
    binding: Binding,
  ) {
    await onEditSlot(partIndex, slotIndex, binding);
    setEditing(null);
  }
  async function applyDonor(partIndex: number, dcid: string) {
    await onEditDonor(partIndex, dcid);
    setEditing(null);
  }
  async function applyShared(
    axis: "where" | "when" | "source",
    binding: Binding,
  ) {
    if (axis === "when") {
      const timeWindow =
        binding.kind === "value" && binding.value.value_kind === "time_window"
          ? binding.value.time_window
          : null;
      if (
        !timeWindow ||
        timeWindow.start_year == null ||
        timeWindow.end_year == null
      ) {
        setEditing(null);
        return;
      }
      await onEditShared({
        axis: "when",
        startYear: timeWindow.start_year,
        endYear: timeWindow.end_year,
      });
    } else {
      await onEditShared({ axis, binding });
    }
    setEditing(null);
  }
  async function applySharedOrigin(dcid: string) {
    await onEditShared({ axis: "origin", dcid });
    setEditing(null);
  }
  async function applyChoose(partIndex: number, spec: Spec) {
    await onChooseSpec(partIndex, spec);
    setEditing(null);
  }
  function refinePart(partIndex: number, target: RefineTarget, text: string) {
    const viewModel = parts[partIndex]?.viewModel;
    if (!viewModel) return;
    void onRefineText(partIndex, spliceSentence(viewModel, target, text));
  }

  function proxyDefiniteSpec(): Spec | null {
    for (const pv of parts) {
      if (pv.part?.status === "definite" && pv.spec) return pv.spec;
    }
    return null;
  }

  function sharedSlotLabel(
    axis: "where" | "when" | "source",
  ): string | undefined {
    for (const pv of parts) {
      if (pv.part?.status !== "definite") continue;
      const slot = pv.spec?.slots?.find((s) => s.key.axis === axis);
      if (slot?.key?.label) return slot.key.label;
    }
    return undefined;
  }

  /** A hoisted qualifier renders once, shared across every definite part —
   *  but it still belongs to each of those parts' own shape. Marks it
   *  rendered on every definite part that carries a slot on `axis`, the same
   *  lookup `sharedSlotLabel` uses, so `computeAddableDimensions` doesn't
   *  also offer it back per part as a redundant "narrow further" pill (one
   *  that would route through `editSlot` for a single part and un-hoist it). */
  function markSharedRendered(axis: "where" | "when" | "source") {
    parts.forEach((pv, partIndex) => {
      if (pv.part?.status !== "definite") return;
      const slotIndex = pv.spec?.slots?.findIndex((s) => s.key.axis === axis);
      if (slotIndex != null && slotIndex !== -1) {
        markRendered(partIndex, slotIndex);
      }
    });
  }

  // The active edit's popover content — built once, then anchored under
  // whichever hero chip (or NarrowFurther entry) turns out to be its target.
  let popoverContent: ReactNode = null;
  if (editing?.kind === "slot") {
    const editTarget = editing;
    const spec = parts[editTarget.partIndex]?.spec;
    const slot = spec?.slots?.[editTarget.slotIndex];
    if (spec && slot) {
      const onApply = (b: Binding) =>
        void applySlot(editTarget.partIndex, editTarget.slotIndex, b);
      if (slot.key.axis === "when") {
        const { minYear, maxYear } = deriveYearBounds(spec.stat_vars);
        popoverContent = (
          <TimeEditor
            label={slot.key.label}
            currentBinding={slot.binding}
            minYear={minYear}
            maxYear={maxYear}
            onApply={onApply}
            onClose={closeEditing}
          />
        );
      } else if (slot.key.axis === "where" && !slot.key.property) {
        popoverContent = (
          <PlacePopover
            label={slot.key.label}
            currentBinding={slot.binding}
            fetchOptions={(scope: PlaceOptionsScope) => {
              if (!httpTransport.placeOptions) {
                return Promise.reject(
                  new Error("This transport does not support place lookups."),
                );
              }
              return httpTransport.placeOptions({
                stat_var_dcids: (spec.stat_vars ?? [])
                  .map((v) => v.ref.dcid)
                  .filter(Boolean),
                anchor_dcid: currentWherePlaceDcid(spec, slot.binding) ?? "",
                scope,
                identity: spec.definition?.identity ?? (spec as any)?.identity,
              });
            }}
            onApply={onApply}
            onClose={closeEditing}
          />
        );
      } else {
        popoverContent = (
          <PhrasePopover
            label={slot.key.label}
            options={optionsFromSpec(spec, slot.key)}
            currentBinding={slot.binding}
            onApply={onApply}
            onClose={closeEditing}
            onRefine={
              slot.key.axis === "source"
                ? undefined
                : (text) =>
                    refinePart(editTarget.partIndex, editTarget.slotIndex, text)
            }
          />
        );
      }
    }
  } else if (editing?.kind === "donor") {
    const editTarget = editing;
    const spec = parts[editTarget.partIndex]?.spec;
    if (spec) {
      popoverContent = (
        <EntityPopover
          label="donor"
          options={entityOptionsFromSpec(spec, "from")}
          currentDcid={currentDonorDcid(spec.entities) ?? null}
          onPick={(dcid) => void applyDonor(editTarget.partIndex, dcid)}
          onClose={closeEditing}
          onRefine={(text) => refinePart(editTarget.partIndex, "from", text)}
        />
      );
    }
  } else if (editing?.kind === "phrase") {
    const editTarget = editing;
    popoverContent = (
      <PhrasePopover
        label={editTarget.text}
        options={[]}
        onApply={() => {}}
        onClose={closeEditing}
        onRefine={(text) =>
          refinePart(
            editTarget.partIndex,
            { kind: "phrase", index: editTarget.localIndex },
            text,
          )
        }
      />
    );
  } else if (editing?.kind === "shared" && editing.axis === "origin") {
    // The hoisted donor read-back, identical across every definite part —
    // fans out to editDonor per part via onEditShared, not a slot lookup.
    const spec = proxyDefiniteSpec();
    if (spec) {
      popoverContent = (
        <EntityPopover
          label="donor"
          options={entityOptionsFromSpec(spec, "from")}
          currentDcid={currentDonorDcid(spec.entities) ?? null}
          onPick={(dcid) => void applySharedOrigin(dcid)}
          onClose={closeEditing}
        />
      );
    }
  } else if (editing?.kind === "shared" && editing.axis !== "origin") {
    // TS doesn't carry the `axis !== "origin"` narrowing through this alias
    // (it narrows `editing.axis`'s read type, not `editing`'s own type), so
    // it's asserted once here rather than cast at every read below.
    const editTarget = editing as {
      kind: "shared";
      axis: "where" | "when" | "source";
    };
    const spec = proxyDefiniteSpec();
    const slot = spec?.slots?.find((s) => s.key.axis === editTarget.axis);
    if (spec && slot) {
      const onApply = (b: Binding) => void applyShared(editTarget.axis, b);
      if (editTarget.axis === "when") {
        const { minYear, maxYear } = deriveYearBounds(spec.stat_vars);
        popoverContent = (
          <TimeEditor
            label={slot.key.label}
            currentBinding={slot.binding}
            minYear={minYear}
            maxYear={maxYear}
            onApply={onApply}
            onClose={closeEditing}
          />
        );
      } else if (editTarget.axis === "where" && !slot.key.property) {
        popoverContent = (
          <PlacePopover
            label={slot.key.label}
            currentBinding={slot.binding}
            fetchOptions={(scope: PlaceOptionsScope) => {
              if (!httpTransport.placeOptions) {
                return Promise.reject(
                  new Error("This transport does not support place lookups."),
                );
              }
              return httpTransport.placeOptions({
                stat_var_dcids: (spec.stat_vars ?? [])
                  .map((v) => v.ref.dcid)
                  .filter(Boolean),
                anchor_dcid: currentWherePlaceDcid(spec, slot.binding) ?? "",
                scope,
                identity: spec.definition?.identity ?? (spec as any)?.identity,
              });
            }}
            onApply={onApply}
            onClose={closeEditing}
          />
        );
      } else {
        popoverContent = (
          <PhrasePopover
            label={slot.key.label}
            options={optionsFromSpec(spec, slot.key)}
            currentBinding={slot.binding}
            onApply={onApply}
            onClose={closeEditing}
          />
        );
      }
    }
  } else if (editing?.kind === "marked") {
    const editTarget = editing;
    const part = parts[editTarget.partIndex]?.part;
    if (part?.status === "candidates") {
      popoverContent = (
        <CandidateView
          part={part}
          partIndex={editTarget.partIndex}
          onChoose={(spec) => void applyChoose(editTarget.partIndex, spec)}
        />
      );
    } else if (part?.status === "no_data") {
      popoverContent = (
        <NoDataView
          part={part}
          partIndex={editTarget.partIndex}
          onChoose={(spec) => void applyChoose(editTarget.partIndex, spec)}
        />
      );
    }
  }

  const renderedByPart = new Map<number, Set<number>>();
  function markRendered(partIndex: number, slotIndex: number) {
    if (slotIndex < 0) return;
    const set = renderedByPart.get(partIndex) ?? new Set<number>();
    set.add(slotIndex);
    renderedByPart.set(partIndex, set);
  }

  /** Renders one of a definite part's own tokens as an editable chip: a
   *  directional read-back routes to editDonor, a slot found by binding_ref
   *  (falling back to axis) routes to editSlot and marks that slot rendered
   *  so computeAddableDimensions doesn't also offer it as "narrow further",
   *  and anything else falls back to the shape-label free-text refine (the
   *  part's own what-token, which has no Spec.slots entry). Pulses while an
   *  edit targeting this part's what-token is in flight. */
  function renderPartToken(
    token: SentenceToken,
    partIndex: number,
    key: string,
  ): ReactNode {
    const pv = parts[partIndex];
    if (!pv?.part) return <Fragment key={key}>{token.text}</Fragment>;
    const busy = editPending === partIndex;
    const updating = busy && token.axis === "what";

    // A directional entity read-back (the donor) — no Spec.slots entry.
    if (token.role != null) {
      const target: EditTarget = { kind: "donor", partIndex };
      const active = sameTarget(editing, target);
      return (
        <TokenChip
          key={key}
          text={token.text}
          ariaLabel={token.text}
          editable={!busy}
          active={active}
          updating={updating}
          anchorRef={active ? activeAnchorRef : undefined}
          popoverRef={active ? popoverRef : undefined}
          popoverOffset={popoverOffset}
          popover={popoverContent}
          onClick={() =>
            setEditing((cur) => (sameTarget(cur, target) ? null : target))
          }
        />
      );
    }

    const slotIndex = findSlotIndex(pv.spec, token);
    if (slotIndex !== -1) {
      markRendered(partIndex, slotIndex);
      const label = pv.spec!.slots![slotIndex].key?.label;
      const target: EditTarget = { kind: "slot", partIndex, slotIndex };
      const active = sameTarget(editing, target);
      const highlight =
        lastEditedSlot?.partIndex === partIndex &&
        lastEditedSlot?.slotIndex === slotIndex;
      return (
        <TokenChip
          key={key}
          text={token.text}
          ariaLabel={label ? `${label}: ${token.text}` : token.text}
          editable={!busy}
          active={active}
          highlight={highlight}
          updating={updating}
          anchorRef={active ? activeAnchorRef : undefined}
          popoverRef={active ? popoverRef : undefined}
          popoverOffset={popoverOffset}
          popover={popoverContent}
          onClick={() =>
            setEditing((cur) => (sameTarget(cur, target) ? null : target))
          }
        />
      );
    }

    // Shape-label fallback (the measure name itself, e.g. "Total population",
    // "Floods") — no Spec.slots entry, free-text refine only.
    const target: EditTarget = {
      kind: "phrase",
      partIndex,
      localIndex: shapeLabelLocalIndex(pv.viewModel),
      text: token.text,
    };
    const active = sameTarget(editing, target);
    return (
      <TokenChip
        key={key}
        text={token.text}
        ariaLabel={token.text}
        editable={!busy}
        active={active}
        updating={updating}
        anchorRef={active ? activeAnchorRef : undefined}
        popoverRef={active ? popoverRef : undefined}
        popoverOffset={popoverOffset}
        popover={popoverContent}
        onClick={() =>
          setEditing((cur) => (sameTarget(cur, target) ? null : target))
        }
      />
    );
  }

  const headingNodes: ReactNode[] = !plan
    ? [<Fragment key="fallback">{fallbackHeadingText}</Fragment>]
    : plan.map((token, i) => {
        // A note never renders as a chip — muted plain text, wherever it
        // falls (after the terminal "." per the composer's own ordering).
        if (token.kind === "note")
          return (
            <span key={`n-${i}`} className="italic text-g4">
              {token.text}
            </span>
          );
        // A connective, a separator, or any other punctuation the composer
        // mints — always plain text, never a chip.
        if (token.kind === "text")
          return <Fragment key={`t-${i}`}>{token.text}</Fragment>;
        if (!token.text) return null; // empty placeholder — surfaced via Add Criteria instead

        const partIndex = tokenPartIndex(token, planParts);

        if (partIndex == null) {
          // Shared (hoisted) qualifier: no owning part, fans to every
          // definite part through editShared.
          if (token.role != null) {
            // A hoisted donor read-back, identical across every definite
            // part — fans out via editShared/editDonor, not a per-part edit.
            const target: EditTarget = { kind: "shared", axis: "origin" };
            const active = sameTarget(editing, target);
            return (
              <TokenChip
                key={`s-${i}`}
                text={token.text}
                ariaLabel={`donor: ${token.text}`}
                editable
                active={active}
                anchorRef={active ? activeAnchorRef : undefined}
                popoverRef={active ? popoverRef : undefined}
                popoverOffset={popoverOffset}
                popover={popoverContent}
                onClick={() =>
                  setEditing((cur) => (sameTarget(cur, target) ? null : target))
                }
              />
            );
          }
          const axis =
            token.axis === "where" ||
            token.axis === "when" ||
            token.axis === "source"
              ? token.axis
              : null;
          if (!axis) return <Fragment key={`s-${i}`}>{token.text}</Fragment>;
          markSharedRendered(axis);
          const target: EditTarget = { kind: "shared", axis };
          const active = sameTarget(editing, target);
          const label = sharedSlotLabel(axis);
          return (
            <TokenChip
              key={`s-${i}`}
              text={token.text}
              ariaLabel={label ? `${label}: ${token.text}` : token.text}
              editable
              active={active}
              anchorRef={active ? activeAnchorRef : undefined}
              popoverRef={active ? popoverRef : undefined}
              popoverOffset={popoverOffset}
              popover={popoverContent}
              onClick={() =>
                setEditing((cur) => (sameTarget(cur, target) ? null : target))
              }
            />
          );
        }

        const pv = parts[partIndex];
        if (!pv?.part) return <Fragment key={`s-${i}`}>{token.text}</Fragment>;
        const busy = editPending === partIndex;

        // An unresolved part's own marked what-token: candidates/no_data
        // open a popover, unsupported just shows its reason (hover only).
        if (pv.part.status !== "definite") {
          const clickable =
            (pv.part.status === "candidates" || pv.part.status === "no_data") &&
            !busy;
          const target: EditTarget = { kind: "marked", partIndex };
          const active = clickable && sameTarget(editing, target);
          return (
            <TokenChip
              key={`s-${i}`}
              text={token.text}
              ariaLabel={token.text}
              marked
              editable={clickable}
              active={active}
              updating={busy}
              title={markedTitle(pv.part)}
              popoverWidthClass={
                pv.part.status === "no_data" ? "w-[380px]" : "w-[320px]"
              }
              anchorRef={active ? activeAnchorRef : undefined}
              popoverRef={active ? popoverRef : undefined}
              popoverOffset={popoverOffset}
              popover={popoverContent}
              onClick={() =>
                setEditing((cur) => (sameTarget(cur, target) ? null : target))
              }
            />
          );
        }

        return renderPartToken(token, partIndex, `s-${i}`);
      });

  // A folded part collapsed onto an earlier part's identical spec_id — no
  // independent result of its own, so every aggregate surface below
  // (preview, coverage, narrow further) dedupes it out, keeping only the
  // first part carrying that spec_id. Its own collapse notice, naming the
  // part it matches, renders separately below.
  function isFoldedDuplicate(partIndex: number): boolean {
    const specId = parts[partIndex]?.spec?.spec_id;
    if (!specId) return false;
    return parts
      .slice(0, partIndex)
      .some((p) => p.part?.status === "definite" && p.spec?.spec_id === specId);
  }

  function foldedRepresentative(partIndex: number): PartView | undefined {
    const specId = parts[partIndex]?.spec?.spec_id;
    if (!specId) return undefined;
    return parts
      .slice(0, partIndex)
      .find((p) => p.part?.status === "definite" && p.spec?.spec_id === specId);
  }

  const narrowFurtherNodes: ReactNode[] = parts
    .map((pv, partIndex) => {
      if (pv.part?.status !== "definite" || !pv.spec) return null;
      if (isFoldedDuplicate(partIndex)) return null;
      const rendered = renderedByPart.get(partIndex) ?? new Set<number>();
      const options = computeAddableDimensions(pv.spec, rendered);
      if (options.length === 0) return null;
      const editingHere =
        editing?.kind === "slot" &&
        editing.partIndex === partIndex &&
        options.some((o) => o.slotIndex === editing.slotIndex);
      return (
        <NarrowFurther
          key={`nf-${partIndex}`}
          idPrefix={`p${partIndex}-`}
          options={options}
          onAdd={(slotIndex) =>
            setEditing({ kind: "slot", partIndex, slotIndex })
          }
          activeIndex={
            editing?.kind === "slot" && editing.partIndex === partIndex
              ? editing.slotIndex
              : null
          }
          editor={editingHere ? popoverContent : null}
          onCloseEditor={closeEditing}
          disabled={editPending === partIndex}
        />
      );
    })
    .filter((n) => n != null);

  // Every definite part with its own spec, labelled by its own variable
  // text — the Variable column DataPreview shows once there's more than one.
  const dataPreviewParts = parts
    .map((pv, partIndex) => ({ pv, partIndex }))
    .filter(
      ({ pv, partIndex }) =>
        pv.part?.status === "definite" &&
        pv.spec &&
        !isFoldedDuplicate(partIndex),
    )
    .map(({ pv, partIndex }) => ({
      spec: pv.spec!,
      label: pv.variableText ?? `Variable ${partIndex + 1}`,
    }));

  // One CoverageRail per definite part, below the preview; unlabelled for a
  // single part, labelled with that part's own variable text once there's
  // more than one to tell apart.
  const coverageEntries = parts
    .map((pv, partIndex) => ({ pv, partIndex }))
    .filter(
      (
        e,
      ): e is {
        pv: PartView & { viewModel: NonNullable<PartView["viewModel"]> };
        partIndex: number;
      } =>
        e.pv.part?.status === "definite" &&
        e.pv.viewModel != null &&
        !isFoldedDuplicate(e.partIndex),
    );
  const definiteViewModels = coverageEntries.map((e) => e.pv.viewModel);

  // "How this was answered" renders once, taking every definite part. A
  // single part renders its own interpretation/trace directly; more than one
  // merges them across all of them (there's no single spec_id to show for
  // that case).
  let resultSummaryNode: ReactNode = null;
  if (definiteViewModels.length === 1) {
    const pv = coverageEntries[0].pv;
    resultSummaryNode = (
      <ResultSummary
        interpretation={pv.viewModel.interpretation}
        trace={pv.viewModel.inspector}
        warnings={
          warnings.length > 0 ? warnings : response?.diagnostics?.warnings
        }
        traceId={response?.diagnostics?.trace_id ?? null}
        llmUsage={response?.diagnostics?.llm_usage}
        specId={pv.spec?.spec_id ?? pv.viewModel.specId}
      />
    );
  } else if (definiteViewModels.length > 1) {
    resultSummaryNode = (
      <ResultSummary
        interpretation={mergeInterpretation(
          definiteViewModels.map((vm) => vm.interpretation),
        )}
        trace={mergeTrace(definiteViewModels.map((vm) => vm.inspector))}
        warnings={
          warnings.length > 0 ? warnings : response?.diagnostics?.warnings
        }
        traceId={response?.diagnostics?.trace_id ?? null}
        llmUsage={response?.diagnostics?.llm_usage}
      />
    );
  }

  // A folded part's own collapse notice — no independent result to preview
  // or show coverage for, so it renders separately, naming the earlier part
  // it matches.
  const foldedNotices = parts
    .map((pv, partIndex) => ({ pv, partIndex }))
    .filter(
      ({ pv }) =>
        pv.part &&
        pv.part.status === "definite" &&
        pv.part.warnings.some((w) => w.code === "binding_folded"),
    );

  return (
    <div className="grid gap-3">
      <div className="m-0 text-[34px] leading-[1.35] tracking-[-0.01em]">
        {headingNodes}
      </div>
      {narrowFurtherNodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {narrowFurtherNodes}
        </div>
      )}
      <DataPreview parts={dataPreviewParts} />
      {coverageEntries.length > 0 && (
        <div className="flex flex-wrap gap-8">
          {coverageEntries.map(({ pv, partIndex }) => (
            <div key={partIndex}>
              {coverageEntries.length > 1 && (
                <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-g4">
                  {pv.variableText ?? `Variable ${partIndex + 1}`}
                </div>
              )}
              <CoverageRail coverage={pv.viewModel.coverage} />
            </div>
          ))}
        </div>
      )}
      {foldedNotices.map(({ pv, partIndex }) => (
        <PartWarnings
          key={`folded-${partIndex}`}
          warnings={pv.part!.warnings}
          foldedWithVariableText={foldedRepresentative(partIndex)?.variableText}
        />
      ))}
      {resultSummaryNode}
    </div>
  );
}
