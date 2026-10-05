import { describe, it, expect } from 'vitest';
import { renderedSlotIndices } from './buildViewModel';
import type { SentencePart, SlotView } from './types';

// A bound what-axis slot (0) and an unbound how-axis slot (1) — the shape used
// by buildSentence's SlotView fallback (every non-absent slot renders a chip).
const sentence: SlotView[] = [
  { axis: 'what', label: 'flow', text: 'ODA grants', bindingKind: 'value', editable: true, slotIndex: 0 },
  { axis: 'how', label: 'sector', text: 'all sectors', bindingKind: 'unbound', editable: true, slotIndex: 1 },
];

describe('renderedSlotIndices', () => {
  it('without a sentence_plan, every SlotView slot already has a chip (bound or unbound)', () => {
    expect(renderedSlotIndices(sentence)).toEqual(new Set([0, 1]));
  });

  it('with a sentence_plan, an unbound slot whose token is empty (dropped) has no chip — stays addable', () => {
    // how-axis (slot 1) rendered an empty skeleton token upstream; buildSentenceTokens
    // drops it, so it never reaches sentenceTokens.
    const tokens: SentencePart[] = [
      { kind: 'slot', axis: 'what', label: 'flow', text: 'ODA grants', bindingKind: 'value', editable: true, slotIndex: 0 },
    ];
    const rendered = renderedSlotIndices(sentence, tokens);
    expect(rendered.has(0)).toBe(true);
    expect(rendered.has(1)).toBe(false);
  });

  it('with a sentence_plan, an unbound slot whose fallback token IS non-empty already has a chip — not addable', () => {
    // what-axis AXIS_OVERRIDES fallback: unbound but always renders a real, non-empty phrase.
    const tokens: SentencePart[] = [
      { kind: 'slot', axis: 'what', label: 'scheme', text: 'ODA', bindingKind: 'unbound', editable: true, slotIndex: 2 },
    ];
    expect(renderedSlotIndices(sentence, tokens).has(2)).toBe(true);
  });

  it('ignores slotIndex -1 tokens (donor read-back / shape-label fallback) — not real Spec.slots entries', () => {
    const tokens: SentencePart[] = [
      {
        kind: 'slot',
        axis: 'where',
        label: '',
        text: 'France',
        bindingKind: 'value',
        editable: false,
        slotIndex: -1,
        entityRef: 'country/FRA',
        role: 'from',
      },
    ];
    expect(renderedSlotIndices(sentence, tokens)).toEqual(new Set());
  });
});
