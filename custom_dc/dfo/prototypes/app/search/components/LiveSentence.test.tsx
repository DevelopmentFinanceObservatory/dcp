// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveSentence } from './LiveSentence';
import type { LivePart } from '../lib/viewModel/liveSentence';

describe('<LiveSentence>', () => {
  it('renders text parts and phrases, marking a pending phrase with the dashed style', () => {
    const sentences: LivePart[][] = [
      [
        { kind: 'text', text: 'to ' },
        { kind: 'phrase', text: 'Ethiopia', pending: false },
        { kind: 'text', text: ' from ' },
        { kind: 'phrase', text: 'donor', pending: true },
      ],
    ];
    const { container } = render(<LiveSentence sentences={sentences} />);
    expect(container.textContent).toBe('to Ethiopia from donor');

    // A resolved phrase is a plain solid underline -- no dashed placeholder cue.
    expect(screen.getByText('Ethiopia').className).not.toContain('border-dashed');
    // A pending phrase (the slot's label, still resolving) gets the dashed cue.
    expect(screen.getByText('donor').className).toContain('border-dashed');
  });

  it('renders one line per sentence in the sentences array', () => {
    const sentences: LivePart[][] = [
      [{ kind: 'phrase', text: 'A', pending: false }],
      [{ kind: 'phrase', text: 'B', pending: false }],
    ];
    const { container } = render(<LiveSentence sentences={sentences} />);
    expect(container.firstElementChild?.children).toHaveLength(2);
  });

  it('marks the wrapper aria-hidden (announcements are owned elsewhere)', () => {
    const { container } = render(<LiveSentence sentences={[[{ kind: 'text', text: 'x' }]]} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
