// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverageRail } from './CoverageRail';
import { buildViewModel } from '../lib/viewModel';
import {
  definiteExactSpec,
  definiteBreadthSpec,
  definiteBareSpec,
} from '../lib/fixtures';

describe('<CoverageRail>', () => {
  it('renders an observation count for exact coverage', () => {
    render(<CoverageRail coverage={buildViewModel(definiteExactSpec).coverage} />);
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('observations')).toBeInTheDocument();
  });

  it('renders dimension chips for breadth coverage', () => {
    render(<CoverageRail coverage={buildViewModel(definiteBreadthSpec).coverage} />);
    expect(screen.getByText('donors')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('methods')).toBeInTheDocument();
  });

  it('flags bare coverage as not counted with a no-data cue', () => {
    render(<CoverageRail coverage={buildViewModel(definiteBareSpec).coverage} />);
    expect(screen.getByText(/not counted/)).toBeInTheDocument();
    expect(screen.getByText(/no observations/)).toBeInTheDocument();
  });
});
