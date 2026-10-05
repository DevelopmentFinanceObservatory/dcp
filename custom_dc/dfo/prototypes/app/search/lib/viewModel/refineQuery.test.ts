import { describe, it, expect } from 'vitest';
import { spliceSentence } from './refineQuery';
import type { SentencePart, SlotView, ViewModel } from './types';

function slot(text: string, slotIndex: number, extra: Partial<Extract<SentencePart, { kind: 'slot' }>> = {}) {
  return {
    kind: 'slot' as const,
    axis: 'what' as const,
    label: '',
    text,
    bindingKind: 'value' as const,
    editable: true,
    slotIndex,
    ...extra,
  };
}

function text(t: string): SentencePart {
  return { kind: 'text', text: t };
}

function vm(sentenceTokens?: SentencePart[], sentence: SlotView[] = []): Pick<ViewModel, 'sentence' | 'sentenceTokens'> {
  return { sentence, sentenceTokens };
}

describe('spliceSentence', () => {
  it('replaces the first phrase, which has no leading connective ("Floods" -> "droughts")', () => {
    // "Floods in Pakistan between 2015-2026 according to Dynamic World Flood
    // Events..." typing "droughts" over "Floods" switches the what phrase, which
    // drops the shape-owned source qualifier along with it (see the what-switch
    // describe block below) -- where/when carry over.
    const model = vm([
      slot('Floods', 0),
      text(' in '),
      slot('Pakistan', 1, { axis: 'where' }),
      text(' between '),
      slot('2015–2026', 2, { axis: 'when' }),
      text(' according to '),
      slot('Dynamic World Flood Events', 3, { axis: 'source' }),
    ]);
    expect(spliceSentence(model, 0, 'droughts')).toBe(
      'droughts in Pakistan between 2015–2026',
    );
  });

  it('replaces a middle phrase, leaving both neighboring connectives intact', () => {
    const model = vm([
      slot('Floods', 0),
      text(' in '),
      slot('Pakistan', 1, { axis: 'where' }),
      text(' between '),
      slot('2015–2026', 2, { axis: 'when' }),
    ]);
    expect(spliceSentence(model, 1, 'Bangladesh')).toBe('Floods in Bangladesh between 2015–2026');
  });

  it('replaces a directional entity read-back phrase by role, not slot index', () => {
    const model = vm([
      slot('ODA', 0),
      text(' from '),
      { kind: 'slot', axis: 'where', label: '', text: 'France', bindingKind: 'value', editable: true, slotIndex: -1, entityRef: 'country/FRA', role: 'from' },
    ]);
    expect(spliceSentence(model, 'from', 'Germany')).toBe('ODA from Germany');
  });

  it('leaves an en-dash year window untouched when a different phrase is spliced', () => {
    const model = vm([slot('Floods', 0), text(' between '), slot('2015–2026', 1, { axis: 'when' })]);
    expect(spliceSentence(model, 0, 'droughts')).toBe('droughts between 2015–2026');
  });

  it('trims the typed replacement and never leaves a double space at the splice boundary', () => {
    const model = vm([slot('Floods', 0), text(' in '), slot('Pakistan', 1, { axis: 'where' })]);
    expect(spliceSentence(model, 0, '  droughts  ')).toBe('droughts in Pakistan');
  });

  it('collapses internal whitespace typed into the replacement text', () => {
    const model = vm([slot('Floods', 0), text(' in '), slot('Pakistan', 1, { axis: 'where' })]);
    expect(spliceSentence(model, 0, 'severe   droughts')).toBe('severe droughts in Pakistan');
  });

  it('falls back to the plain SlotView[] sentence when no sentenceTokens are present, inserting single spaces between phrases', () => {
    const sentence: SlotView[] = [
      { axis: 'what', label: 'flow', text: 'Floods', bindingKind: 'value', editable: true, slotIndex: 0 },
      { axis: 'where', label: 'recipient', text: 'Pakistan', bindingKind: 'value', editable: true, slotIndex: 1 },
    ];
    expect(spliceSentence(vm(undefined, sentence), 1, 'Bangladesh')).toBe('Floods Bangladesh');
  });

  it('returns the sentence unmodified when target matches no phrase', () => {
    const model = vm([slot('Floods', 0), text(' in '), slot('Pakistan', 1, { axis: 'where' })]);
    expect(spliceSentence(model, 5, 'x')).toBe('Floods in Pakistan');
  });
});

describe('spliceSentence — phrase-index targeting (shape-label fallback phrases)', () => {
  // A shape-label fallback phrase (buildViewModel's "no confirmable sibling"
  // case) has slotIndex -1 and no role, so it can only be targeted by its
  // position in the rendered parts array -- the same array SentenceRenderer's
  // own onEditPhrase index comes from.
  function fallbackPhrase(text: string) {
    return { kind: 'slot' as const, axis: 'what' as const, label: '', text, bindingKind: 'value' as const, editable: true, slotIndex: -1 };
  }

  it('splices the first phrase (index 0) — the motivating "Floods" case, with no real slotIndex/role at all', () => {
    const model = vm([fallbackPhrase('Floods'), text(' in '), slot('Pakistan', 0, { axis: 'where' })]);
    expect(spliceSentence(model, { kind: 'phrase', index: 0 }, 'droughts')).toBe('droughts in Pakistan');
  });

  it('splices a fallback phrase in the middle of the sentence by its exact position', () => {
    const model = vm([
      text('total '),
      fallbackPhrase('population'),
      text(' of '),
      slot('Kenya', 0, { axis: 'where' }),
    ]);
    expect(spliceSentence(model, { kind: 'phrase', index: 1 }, 'literacy rate')).toBe('total literacy rate of Kenya');
  });

  it('does not confuse a phrase-index target with a same-numbered real slotIndex', () => {
    // A slot-backed phrase at slotIndex 0 sits at parts position 2; targeting
    // phrase-index 0 must hit the fallback phrase at position 0, not it.
    const model = vm([fallbackPhrase('Floods'), text(' in '), slot('Pakistan', 0, { axis: 'where' })]);
    expect(spliceSentence(model, { kind: 'phrase', index: 0 }, 'droughts')).not.toContain('Floods');
    expect(spliceSentence(model, { kind: 'phrase', index: 0 }, 'droughts')).toContain('Pakistan');
  });

  it('returns the sentence unmodified when the phrase index is out of range', () => {
    const model = vm([fallbackPhrase('Floods'), text(' in '), slot('Pakistan', 0, { axis: 'where' })]);
    expect(spliceSentence(model, { kind: 'phrase', index: 99 }, 'droughts')).toBe('Floods in Pakistan');
  });
});

describe('spliceSentence — what-switch drops shape-owned how/source qualifiers', () => {
  // Engine-realistic tokens (see CONTEXT / toParts' spacing note): a text
  // token carries a TRAILING space only, and adjacent slot tokens carry no
  // separator at all -- unlike the leading+trailing-space convention the
  // suites above use, this is what buildSentenceTokens actually produces.
  function malariaPlan(): SentencePart[] {
    // "malaria grants to Ethiopia since 2015"
    return [
      slot('Official Development Assistance Grants', 0),
      text('for '),
      slot('Malaria control', 1, { axis: 'how' }),
      text('to '),
      slot('Ethiopia', 2, { axis: 'where', role: 'to' }),
      slot('since 2015', 3, { axis: 'when' }),
      text('according to '),
      slot('CRS', 4, { axis: 'source' }),
    ];
  }

  function co2Plan(): SentencePart[] {
    // "CO2 emissions per capita in Mexico since 1970"
    return [
      slot('CO2 Emissions Per Capita', 0),
      text('for '),
      slot('carbon dioxide', 1, { axis: 'how' }),
      text('in '),
      slot('Mexico', 2, { axis: 'where' }),
      slot('since 1970', 3, { axis: 'when' }),
      text('according to '),
      slot('World Development Indicators', 4, { axis: 'source' }),
    ];
  }

  it('drops the how and source qualifiers when the what phrase is switched (malaria -> total population), keeping where/when', () => {
    const model = vm(malariaPlan());
    expect(spliceSentence(model, 0, 'total population')).toBe(
      'total population to Ethiopia since 2015',
    );
  });

  it('drops the how and source qualifiers when the what phrase is switched (CO2 -> electricity consumption), keeping where/when', () => {
    const model = vm(co2Plan());
    expect(spliceSentence(model, 0, 'electricity consumption')).toBe(
      'electricity consumption in Mexico since 1970',
    );
  });

  it('keeps everything, including how and source, when a non-what phrase is switched (CO2 how: carbon dioxide -> methane)', () => {
    const model = vm(co2Plan());
    expect(spliceSentence(model, 1, 'methane')).toBe(
      'CO2 Emissions Per Capita for methane in Mexico since 1970 according to World Development Indicators',
    );
  });

  it('drops the how qualifier across the split when-token shape the real pipeline emits (text "since " + slot "2015", not one merged token)', () => {
    // buildSentenceTokens re-renders when-slots into a separate connective
    // text part + year-core slot part; neither is how/source, so both halves
    // must survive a what-switch intact.
    const model = vm([
      slot('Official Development Assistance Grants', 0),
      text('for '),
      slot('Malaria control', 1, { axis: 'how' }),
      text('to '),
      slot('Ethiopia', 2, { axis: 'where', role: 'to' }),
      text('since '),
      slot('2015', 3, { axis: 'when' }),
    ]);
    expect(spliceSentence(model, 0, 'total population')).toBe(
      'total population to Ethiopia since 2015',
    );
  });
});
