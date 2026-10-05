// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadTimeline } from './LoadTimeline';

const emptyProgress = { variables: [], entities: [], dates: [], shapeLabel: null, stepMs: {} };

describe('<LoadTimeline>', () => {
  it('shows one milestone at a time, advancing on the fallback timer', () => {
    vi.useFakeTimers();
    try {
      render(<LoadTimeline />);
      expect(screen.getByText('Reading your question…')).toBeInTheDocument();
      // Only the current milestone is shown — later ones aren't rendered.
      expect(screen.queryByText('Finding your data…')).not.toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(1500));
      expect(screen.getByText('Finding your data…')).toBeInTheDocument();
      expect(screen.queryByText('Reading your question…')).not.toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(1500));
      expect(screen.getByText('Getting the numbers…')).toBeInTheDocument();

      act(() => void vi.advanceTimersByTime(3000));
      // clamps at the last milestone, no looping
      expect(screen.getByText('Composing the answer…')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('jumps ahead to match real streamed progress', () => {
    // recall done → milestone 1, even before the timer gets there
    render(<LoadTimeline steps={['extract', 'recall']} progress={emptyProgress} />);
    expect(screen.getByText('Finding your data…')).toBeInTheDocument();
  });

  it('surfaces the extracted terms as the detail on the first milestone', () => {
    render(
      <LoadTimeline
        steps={['extract']}
        progress={{ ...emptyProgress, variables: ['ODA grants'], entities: ['France'], dates: ['2015–2020'] }}
      />,
    );
    expect(screen.getByText('Reading your question…')).toBeInTheDocument();
    expect(screen.getByText('ODA grants · France · 2015–2020')).toBeInTheDocument();
  });

  it('names the variables in the "finding data" milestone once they stream', () => {
    render(
      <LoadTimeline steps={['extract', 'recall']} progress={{ ...emptyProgress, variables: ['malaria grants'] }} />,
    );
    expect(screen.getByText('Finding data on malaria grants…')).toBeInTheDocument();
  });

  it('names the places in the "getting the numbers" milestone once they stream', () => {
    render(
      <LoadTimeline
        steps={['extract', 'recall', 'shape', 'bind', 'materialise']}
        progress={{ ...emptyProgress, entities: ['Ethiopia'] }}
      />,
    );
    expect(screen.getByText('Getting the numbers for Ethiopia…')).toBeInTheDocument();
  });

  it('compacts a long place list in the milestone label', () => {
    render(
      <LoadTimeline
        steps={['extract', 'recall', 'shape', 'bind', 'materialise']}
        progress={{ ...emptyProgress, entities: ['Ethiopia', 'Kenya', 'Uganda'] }}
      />,
    );
    expect(screen.getByText('Getting the numbers for Ethiopia and 2 more…')).toBeInTheDocument();
  });

  it('surfaces the matched shape as the detail once that milestone is live', () => {
    render(
      <LoadTimeline
        steps={['extract', 'recall', 'shape']}
        progress={{ ...emptyProgress, shapeLabel: 'Development finance' }}
      />,
    );
    expect(screen.getByText('Finding your data…')).toBeInTheDocument();
    expect(screen.getByText('Development finance')).toBeInTheDocument();
  });

  it('shows a step counter', () => {
    render(<LoadTimeline steps={['extract']} progress={emptyProgress} />);
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
  });

  it('visually hides the detail line but keeps it for screen readers when hideDetail is set', () => {
    render(
      <LoadTimeline
        steps={['extract']}
        progress={{ ...emptyProgress, variables: ['ODA grants'], entities: ['France'], dates: ['2015–2020'] }}
        hideDetail
      />,
    );
    expect(screen.getByText('Reading your question…')).toBeInTheDocument();
    // still in the DOM (and inside the aria-live region) for assistive tech —
    // LiveSentence, which visually replaces it, is aria-hidden — just sr-only.
    expect(screen.getByText('ODA grants · France · 2015–2020')).toHaveClass('sr-only');
  });

  it('renders the detail line visibly (no sr-only) when hideDetail is unset', () => {
    render(
      <LoadTimeline steps={['extract']} progress={{ ...emptyProgress, variables: ['ODA grants'] }} />,
    );
    expect(screen.getByText('ODA grants')).not.toHaveClass('sr-only');
  });
});
