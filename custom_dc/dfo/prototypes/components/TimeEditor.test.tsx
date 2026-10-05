// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeEditor, deriveYearBounds } from './TimeEditor';

function setup(extra: Partial<Parameters<typeof TimeEditor>[0]> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(<TimeEditor label="time" onApply={onApply} onClose={onClose} {...extra} />);
  return { onApply, onClose };
}

describe('<TimeEditor>', () => {
  it('applies a two-year span as a "between" time_window (ordered)', () => {
    const { onApply } = setup();
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2023' } });
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '2016' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply.mock.calls[0][0]).toEqual({
      kind: 'value',
      value: { value_kind: 'time_window', time_window: { start_year: 2016, end_year: 2023 } },
    });
  });

  it('applies a single year as an "in" time_window (start only)', () => {
    const { onApply } = setup();
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2019' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply.mock.calls[0][0]).toEqual({
      kind: 'value',
      value: { value_kind: 'time_window', time_window: { start_year: 2019 } },
    });
  });

  it('previews "between" and "in" as the years change', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Start year'), { target: { value: '2015' } });
    expect(screen.getByText('in 2015')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('End year'), { target: { value: '2020' } });
    expect(screen.getByText('between 2015–2020')).toBeInTheDocument();
  });

  it('pre-fills the fields from the current binding', () => {
    setup({
      currentBinding: { kind: 'value', value: { value_kind: 'time_window', time_window: { start_year: 2016, end_year: 2023 } } },
    });
    expect((screen.getByLabelText('Start year') as HTMLInputElement).value).toBe('2016');
    expect((screen.getByLabelText('End year') as HTMLInputElement).value).toBe('2023');
  });

  it('snaps out-of-range years into the data range on blur', () => {
    const { onApply } = setup({ minYear: 1960, maxYear: 2024 });
    const startInput = screen.getByLabelText('Start year') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '100' } });
    fireEvent.blur(startInput);
    expect(startInput.value).toBe('1960'); // below range → lowest

    const endInput = screen.getByLabelText('End year') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '2500' } });
    fireEvent.blur(endInput);
    expect(endInput.value).toBe('2024'); // above range → highest

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply.mock.calls[0][0]).toEqual({
      kind: 'value',
      value: { value_kind: 'time_window', time_window: { start_year: 1960, end_year: 2024 } },
    });
  });

  it('applies unbound when "All years" is checked', () => {
    const { onApply } = setup({
      currentBinding: { kind: 'value', value: { value_kind: 'time_window', time_window: { start_year: 2015 } } },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'All years' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply.mock.calls[0][0]).toEqual({ kind: 'unbound' });
  });
});

describe('deriveYearBounds', () => {
  it('unions min(start)/max(end) across StatVars, e.g. Kenya Count_Person 1960–2024', () => {
    expect(
      deriveYearBounds([
        { data_date_range: { start: '1960', end: '2020' } },
        { data_date_range: { start: '1975', end: '2024' } },
      ]),
    ).toEqual({ minYear: 1960, maxYear: 2024 });
  });

  it('parses "YYYY-MM" and full-date strings defensively', () => {
    expect(deriveYearBounds([{ data_date_range: { start: '1960-06', end: '2024-01-15' } }])).toEqual({
      minYear: 1960,
      maxYear: 2024,
    });
  });

  it('handles partial data — only a start or only an end known', () => {
    expect(deriveYearBounds([{ data_date_range: { start: '1960' } }])).toEqual({ minYear: 1960, maxYear: undefined });
    expect(deriveYearBounds([{ data_date_range: { end: '2024' } }])).toEqual({ minYear: undefined, maxYear: 2024 });
  });

  it('returns no bounds when stat_vars is absent, empty, or carries no data_date_range', () => {
    expect(deriveYearBounds(undefined)).toEqual({ minYear: undefined, maxYear: undefined });
    expect(deriveYearBounds([])).toEqual({ minYear: undefined, maxYear: undefined });
    expect(deriveYearBounds([{ data_date_range: null }, {}])).toEqual({ minYear: undefined, maxYear: undefined });
  });
});
