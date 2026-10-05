// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentValues } from './RecentValues';
import type { RecentPointsView } from '../lib/viewModel';

function recentPoints(over: Partial<RecentPointsView> = {}): RecentPointsView {
  return {
    variable: 'Count of female persons',
    entity: 'Kenya',
    points: [
      { date: '2023', value: '28,300,000' },
      { date: '2022', value: '27,700,000' },
    ],
    shownCount: 2,
    totalObs: 2,
    ...over,
  };
}

describe('<RecentValues>', () => {
  it('renders one row per point, newest first, em-dash for a null value', () => {
    render(
      <RecentValues
        recentPoints={recentPoints({
          points: [
            { date: '2023', value: '28,300,000' },
            { date: '2022', value: null },
          ],
        })}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1); // drop the header row
    expect(rows).toHaveLength(2);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('28,300,000')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('omits the truncation note when every observation is shown', () => {
    render(<RecentValues recentPoints={recentPoints({ shownCount: 2, totalObs: 2 })} />);
    expect(screen.queryByText(/Showing latest/)).not.toBeInTheDocument();
  });

  it('shows a truncation note when shownCount is less than totalObs', () => {
    render(<RecentValues recentPoints={recentPoints({ shownCount: 5, totalObs: 270 })} />);
    expect(screen.getByText('Showing latest 5 of 270 observations')).toBeInTheDocument();
  });
});
