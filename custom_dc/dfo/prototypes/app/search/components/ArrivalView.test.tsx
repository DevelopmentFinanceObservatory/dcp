// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArrivalView, type ArrivalItem } from './ArrivalView';

const items: ArrivalItem[] = [
  { query: 'malaria grants to Ethiopia', primary: 'ODA grants malaria control Ethiopia', secondary: '36 donors · 9 years · 3 methods' },
  { query: 'GDP of Atlantis', primary: 'GDP of Atlantis', secondary: 'no data' },
];

describe('<ArrivalView>', () => {
  it('renders each starter as a pill (not a bare field)', () => {
    render(<ArrivalView items={items} onPick={() => {}} />);
    expect(screen.getByRole('button', { name: 'ODA grants malaria control Ethiopia' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(items.length);
  });

  it('runs a starter query when picked', () => {
    const onPick = vi.fn();
    render(<ArrivalView items={items} onPick={onPick} />);
    screen.getAllByRole('button')[0].click();
    expect(onPick).toHaveBeenCalledWith('malaria grants to Ethiopia');
  });
});
