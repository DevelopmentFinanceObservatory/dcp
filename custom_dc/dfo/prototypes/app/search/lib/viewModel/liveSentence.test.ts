import { describe, it, expect } from 'vitest';
import { livePartsFromPlan, livePartsFromInterpretation, liveSentenceParts } from './liveSentence';
import type { SentenceToken } from '@/lib/client/searchClient';
import type { LiveSentenceView, StreamProgress } from '../store/specStore';

function progress(over: Partial<StreamProgress> = {}): StreamProgress {
  return { variables: [], entities: [], dates: [], shapeLabel: null, stepMs: {}, ...over };
}

describe('livePartsFromPlan', () => {
  it('passes text tokens through', () => {
    const plan: SentenceToken[] = [{ kind: 'text', text: 'to ' }];
    expect(livePartsFromPlan(plan, {})).toEqual([{ kind: 'text', text: 'to ' }]);
  });

  it('drops empty text tokens', () => {
    const plan: SentenceToken[] = [{ kind: 'text', text: '' }];
    expect(livePartsFromPlan(plan, {})).toEqual([]);
  });

  it('turns a slot token with text into a non-pending phrase', () => {
    const plan: SentenceToken[] = [{ kind: 'slot', text: 'Ethiopia', axis: 'where', binding_ref: 'where:' }];
    expect(livePartsFromPlan(plan, {})).toEqual([{ kind: 'phrase', text: 'Ethiopia', pending: false }]);
  });

  it('turns an empty slot token into a pending phrase named from the labels map', () => {
    const plan: SentenceToken[] = [{ kind: 'slot', text: '', axis: 'where', binding_ref: 'where:' }];
    const labels = { 'where:': 'recipient' };
    expect(livePartsFromPlan(plan, labels)).toEqual([{ kind: 'phrase', text: 'recipient', pending: true }]);
  });

  it('falls back to the axis when the binding_ref has no label', () => {
    const plan: SentenceToken[] = [{ kind: 'slot', text: '', axis: 'where', binding_ref: 'where:' }];
    expect(livePartsFromPlan(plan, {})).toEqual([{ kind: 'phrase', text: 'where', pending: true }]);
  });

  it('drops an empty slot token when neither a label nor an axis exists', () => {
    const plan: SentenceToken[] = [{ kind: 'slot', text: '' }];
    expect(livePartsFromPlan(plan, {})).toEqual([]);
  });
});

describe('livePartsFromInterpretation', () => {
  it('joins variables, entities, and dates with interpuncts', () => {
    const parts = livePartsFromInterpretation(
      progress({ variables: ['ODA grants'], entities: ['France'], dates: ['2015–2020'] }),
    );
    expect(parts).toEqual([
      { kind: 'phrase', text: 'ODA grants', pending: false },
      { kind: 'text', text: ' · ' },
      { kind: 'phrase', text: 'France', pending: false },
      { kind: 'text', text: ' · ' },
      { kind: 'phrase', text: '2015–2020', pending: false },
    ]);
  });
});

describe('liveSentenceParts', () => {
  function view(text: string): LiveSentenceView {
    return { plan: [{ kind: 'text', text }], labels: {}, bound: false };
  }

  it('prefers live plans, ordered by variable index, over the interpretation echo', () => {
    // Insertion order is 1 then 0 -- the result must still come out 0 then 1.
    const liveSentences = { 1: view('B'), 0: view('A') };
    const result = liveSentenceParts(liveSentences, progress({ variables: ['ignored'] }));
    expect(result).toEqual([[{ kind: 'text', text: 'A' }], [{ kind: 'text', text: 'B' }]]);
  });

  it('falls back to the echo when progress has variables or entities and no plan streamed yet', () => {
    const p = progress({ variables: ['ODA grants'] });
    expect(liveSentenceParts({}, p)).toEqual([livePartsFromInterpretation(p)]);
  });

  it('returns null when there is nothing to show', () => {
    expect(liveSentenceParts({}, null)).toBeNull();
    expect(liveSentenceParts({}, progress())).toBeNull();
  });
});
