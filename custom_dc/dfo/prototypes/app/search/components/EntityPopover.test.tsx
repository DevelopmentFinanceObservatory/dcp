// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityPopover } from './EntityPopover';
import type { SlotOption } from '../lib/taxonomy';

function opt(label: string, dcid: string, count?: number, coverage?: SlotOption['coverage']): SlotOption {
  return {
    label,
    binding: { kind: 'value', value: { value_kind: 'entity', ref: { dcid, label } } },
    count,
    coverage,
  };
}

const kenya = opt('Kenya', 'country/KEN', 120);
const ethiopia = opt('Ethiopia', 'country/ETH', 50);

function setup(extra: Partial<Parameters<typeof EntityPopover>[0]> = {}) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <EntityPopover
      label="donor"
      options={[kenya, ethiopia]}
      currentDcid="country/KEN"
      onPick={onPick}
      onClose={onClose}
      {...extra}
    />,
  );
  return { onPick, onClose };
}

describe('<EntityPopover>', () => {
  it('renders one row per option with counts, and marks the currentDcid row aria-current', () => {
    setup();
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(screen.getByText('Ethiopia')).toBeInTheDocument();
    expect(screen.getByText('120 obs')).toBeInTheDocument();
    expect(screen.getByText('50 obs')).toBeInTheDocument();
    expect(screen.getByText('Kenya').closest('button')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Ethiopia').closest('button')).not.toHaveAttribute('aria-current');
  });

  it('clicking a row calls onPick with that option\'s dcid', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByText('Ethiopia').closest('button')!);
    expect(onPick).toHaveBeenCalledWith('country/ETH');
  });

  it('the filter input narrows rows', () => {
    setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter options' }), {
      target: { value: 'ken' },
    });
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(screen.queryByText('Ethiopia')).toBeNull();
  });

  it('Escape calls onClose', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  // A probed-zero option (the engine ran the probe and confirmed no data) ranks
  // last, is disabled, and can't be clicked -- same rank-and-demote contract as
  // PhrasePopover -- UNLESS it's the entity currently bound, which must stay
  // visible and pickable-in-place (a user's own selection never vanishes).
  describe('probed-zero options', () => {
    const somalia = opt('Somalia', 'country/SOM', undefined, {
      kind: 'exact',
      has_data: false,
      observation_count: 0,
    });

    it('renders disabled and unclickable when not the current pick', () => {
      const onPick = vi.fn();
      render(
        <EntityPopover
          label="donor"
          options={[kenya, somalia]}
          currentDcid="country/KEN"
          onPick={onPick}
          onClose={vi.fn()}
        />,
      );
      const button = screen.getByText('Somalia').closest('button')!;
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onPick).not.toHaveBeenCalled();
    });

    it('stays enabled when it is the current pick', () => {
      render(
        <EntityPopover
          label="donor"
          options={[kenya, somalia]}
          currentDcid="country/SOM"
          onPick={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByText('Somalia').closest('button')).toBeEnabled();
    });
  });
});

describe('<EntityPopover> free-text refine', () => {
  it('omits the refine field entirely when onRefine is not passed (back-compat)', () => {
    setup();
    expect(screen.queryByPlaceholderText(/search for something different/i)).toBeNull();
  });

  it('renders the refine field under the option list, not auto-focused (the filter keeps focus)', () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    expect(screen.getByRole('textbox', { name: 'Search for something different' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Filter options' })).toHaveFocus();
  });

  it('Enter with typed text calls onRefine with the trimmed text', () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    fireEvent.change(field, { target: { value: '  Germany  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRefine).toHaveBeenCalledWith('Germany');
  });

  it('Enter with empty/whitespace-only text is a no-op', () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRefine).not.toHaveBeenCalled();
  });

  it('ArrowDown while typing in the refine field does not steal focus to an option', () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    field.focus();
    fireEvent.keyDown(field, { key: 'ArrowDown' });
    expect(field).toHaveFocus();
  });

  it('Escape from the refine field still closes the popover', () => {
    const onRefine = vi.fn();
    const { onClose } = setup({ onRefine });
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('no options + onRefine: the field replaces the dead-end text and is auto-focused, with a hint', () => {
    const onRefine = vi.fn();
    render(
      <EntityPopover label="donor" options={[]} currentDcid={null} onPick={vi.fn()} onClose={vi.fn()} onRefine={onRefine} />,
    );
    expect(screen.queryByText('No options available for this phrase.')).toBeNull();
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    expect(field).toHaveFocus();
    expect(screen.getByText(/runs a new search keeping the rest of the sentence/i)).toBeInTheDocument();
  });

  it('no options + no onRefine: keeps the plain dead-end text (back-compat)', () => {
    render(<EntityPopover label="donor" options={[]} currentDcid={null} onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('No options available for this phrase.')).toBeInTheDocument();
  });

  it('Search button is disabled until text is typed, and clicking it calls onRefine with the trimmed text', () => {
    const onRefine = vi.fn();
    setup({ onRefine });
    const field = screen.getByRole('textbox', { name: 'Search for something different' });
    const search = screen.getByRole('button', { name: 'Search' });
    expect(search).toBeDisabled();
    fireEvent.change(field, { target: { value: '  Germany  ' } });
    expect(search).toBeEnabled();
    fireEvent.click(search);
    expect(onRefine).toHaveBeenCalledWith('Germany');
  });

  it('no options + onRefine: renders the Search button as the sole action', () => {
    const onRefine = vi.fn();
    render(
      <EntityPopover label="donor" options={[]} currentDcid={null} onPick={vi.fn()} onClose={vi.fn()} onRefine={onRefine} />,
    );
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
});
