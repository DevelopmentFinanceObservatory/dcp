/**
 * Dimensions a part's shape supports but its own sentence phrase doesn't show
 * a chip for — feeds each part's "+ narrow further" affordance. Pulled out of
 * SearchClient so both it and ComposedSentence (the composed hero) can share
 * one implementation without importing each other.
 *
 * The common case is an `unbound` slot. bind_universal leaves a constraint
 * property open ("all sectors") rather than naming it, and the engine's
 * sentence plan usually emits that as an empty-text placeholder token, which
 * the renderer drops. The slot has no chip in the sentence, so this list is
 * its only surface. A *bound* slot can end up chipless too: the engine also
 * folds a phrase's text away when its value is already named by another
 * part of the sentence (e.g. "female population kenya": gender is bound to
 * Female, but "Female population" already says it, so the gender token
 * renders empty). The binding is real, not unbound, so this can't key off
 * `binding.kind` at all. Any slot without a rendered chip is addable here,
 * unbound or bound, as long as it isn't `absent` (the property doesn't apply
 * to this series at all, and isn't a real phrase to edit). Symmetrically,
 * some axes render a non-empty phrase for an unbound slot, so a slot already
 * rendered as a chip must not also be offered here. The caller passes the
 * set of slot indices it actually rendered.
 *
 * A chipless bound slot's label carries its current value ("gender: Female")
 * so the user can tell it's set, not just addable. A chipless unbound slot
 * keeps its bare label ("all …" is implied).
 *
 * These slots are gated on refine_supported, since editing one re-binds a
 * property via construct-and-confirm. One axis is special-cased further:
 * the source axis never gets engine-surfaced slot_options in v1, so an
 * unbound source slot that slips through the filters above would open a
 * popover with zero options, a dead end. Drop it unless the spec actually
 * carries a slot_options entry for it, via the same optionsFromSpec lookup
 * used below. 'when' and 'where' need no such gate, since they open
 * dedicated editors (TimeEditor / PlacePopover) that don't depend on
 * slot_options at all.
 */

import type { Spec } from "@/lib/contract/types";
import { optionsFromSpec } from "../lib/taxonomy";
import { renderBinding } from "../lib/viewModel";
import type { NarrowOption } from "./NarrowFurther";

export function computeAddableDimensions(
  spec: Spec | null,
  rendered: Set<number>,
): NarrowOption[] {
  if (!spec || !spec.shape?.refine_supported || !spec.slots) return [];
  return spec.slots
    .map((s, i) => ({ slotIndex: i, slot: s }))
    .filter(
      ({ slotIndex, slot }) =>
        slot?.binding?.kind !== "absent" && !rendered.has(slotIndex),
    )
    .filter(({ slot }) => {
      // when-axis has its own dedicated editor (TimeEditor)
      if (slot?.key?.axis === "when") return true;
      // property-less where-axis has its own dedicated editor (PlacePopover)
      if (slot?.key?.axis === "where" && !slot?.key?.property) return true;
      // If the spec carried slot_options, only offer dimensions that actually have options with observations
      if (spec.slot_options !== undefined) {
        const opts = optionsFromSpec(spec, slot.key);
        if (opts.length === 0) return false;
        return opts.some(
          (o) =>
            o.coverage == null ||
            o.coverage.has_data !== false ||
            (o.count ?? 0) > 0,
        );
      }
      return (
        slot?.key?.axis !== "source" ||
        optionsFromSpec(spec, slot.key).length > 0
      );
    })
    .map(({ slotIndex, slot }) => ({
      slotIndex,
      label:
        slot.binding?.kind === "unbound"
          ? (slot.key?.label ?? "")
          : `${slot.key?.label ?? ""}: ${renderBinding(slot)}`,
    }));
}
