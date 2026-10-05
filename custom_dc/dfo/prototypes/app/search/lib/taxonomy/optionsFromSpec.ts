/**
 * Engine slot options → popover options.
 *
 * The shipped engine surfaces the candidate set each slot was bound against on the
 * response itself (`Spec.slot_options`), with a per-option observation count when
 * `include_option_coverage` is set — that count IS the "consequence before commit"
 * the popover already shows. This maps those to the popover's SlotOption shape and
 * joins them to a slot on SlotKey's ref form ("axis:property_dcid").
 *
 * When the spec carries no slot_options for a key, `optionsFromSpec` returns
 * `[]` — an honest empty list, not a fabricated one — EXCEPT for the source
 * axis, which falls back to `Spec.resolution.resolved_sources` (see
 * `sourceFallbackOptions` below); that isn't fabrication, since resolved_sources
 * is the engine's own truth about which facets actually back THIS answer. Every
 * other axis's empty list is rendered by callers (SearchClient's PhrasePopover
 * branch) as "no options available" / free-text refine, rather than papering
 * over an engine gap with canned values.
 */

import type { Coverage, Direction, GraphRef, SlotKey, SlotValue, Spec } from '@/lib/contract/types';
import { humanizeSourceLabel } from '../humanizeSourceLabel';
import type { SlotOption } from './SlotOptionsProvider';

/** SlotKey.as_ref(): the "axis:property_dcid" join key. */
function keyRef(key: SlotKey): string {
  return `${key.axis}:${key.property?.dcid ?? ''}`;
}

function valueLabel(v: SlotValue): string {
  if (v.value_kind === 'literal') return v.literal ?? '';
  return v.ref?.label ?? '';
}

/** Observation count for the popover, when the engine's coverage was `exact`.
 *  `breadth`/`bare` coverage has no single scalar count -- their has_data
 *  verdict rides along on `coverage` instead (see mapOptions below). */
function optionCount(coverage?: Coverage | null): number | undefined {
  return coverage?.kind === 'exact' ? coverage.observation_count : undefined;
}

/** Map an engine SlotOption[] to the popover's SlotOption[] (shared shape). */
function mapOptions(options: { value: SlotValue; coverage?: Coverage | null }[]): SlotOption[] {
  return options
    .map((o) => ({
      label: valueLabel(o.value),
      binding: { kind: 'value' as const, value: o.value },
      count: optionCount(o.coverage),
      coverage: o.coverage,
    }))
    // The engine omits a dcid that failed to resolve a label; guard anyway.
    .filter((o) => o.label !== '');
}

/** The dcid's trailing segment ("country/KEN" -> "KEN") -- last-resort display
 *  text for a resolved source whose GraphRef carries no label at all. */
function dcidTail(dcid: string): string {
  return dcid.split('/').pop() ?? dcid;
}

/**
 * Source-axis fallback: the engine doesn't yet surface slot_options for the
 * source axis in v1 (region_grounding.py skips when/source), so this is the
 * only way a multi-facet answer's source becomes switchable. Only kicks in
 * with 2+ resolved sources -- a single source has nothing to switch to, and
 * offering a one-item picker would be a dead end (mirrors buildViewModel's
 * identical >1 gate for source-chip editability, which this function's
 * result backs). No count/coverage: resolved_sources carries neither, and the
 * popover already handles an option with no coverage fine (never-probed, not
 * no-data).
 */
function sourceFallbackOptions(sources: GraphRef[]): SlotOption[] {
  if (sources.length < 2) return [];
  return sources.map((ref) => ({
    label: humanizeSourceLabel(ref.label || dcidTail(ref.dcid)),
    binding: { kind: 'value', value: { value_kind: 'source', ref } },
  }));
}

/** Engine-provided candidate values for a slot; empty when the spec has none
 *  (source axis excepted -- see sourceFallbackOptions above). Engine-provided
 *  slot_options, when present, always win over the source fallback. */
export function optionsFromSpec(spec: Spec, key: SlotKey): SlotOption[] {
  const match = (spec.slot_options ?? []).find((so) => keyRef(so.key) === keyRef(key));
  if (match) return mapOptions(match.options);
  if (key.axis === 'source') return sourceFallbackOptions(spec.resolution?.resolved_sources ?? []);
  return [];
}

/**
 * Engine-provided candidate entities for a directional slot (dev-finance donor,
 * role "from"); empty when the spec carries no entity_options for that role.
 */
export function entityOptionsFromSpec(spec: Spec, role: Direction): SlotOption[] {
  const match = (spec.entity_options ?? []).find((eo) => eo.role === role);
  return match ? mapOptions(match.options) : [];
}
