// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { TableView } from '../lib/viewModel';

describe('<DataTable>', () => {
  it('renders nothing when there are no rows', () => {
    const { container } = render(<DataTable table={{ rows: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Variable | Place | Latest value | Date columns with formatted values', () => {
    const table: TableView = {
      rows: [
        { variable: 'Count of female persons', entity: 'Kenya', value: '28,300,000', date: '2023', obsCount: 5 },
        { variable: 'Count of female persons', entity: 'Nigeria', value: '109,600,000', date: '2023', obsCount: 4 },
      ],
    };
    render(<DataTable table={table} />);
    expect(screen.getByText('Kenya')).toBeInTheDocument();
    expect(screen.getByText('Nigeria')).toBeInTheDocument();
    expect(screen.getByText('28,300,000')).toBeInTheDocument();
    expect(screen.getByText('109,600,000')).toBeInTheDocument();
    expect(screen.getAllByText('2023')).toHaveLength(2);
    expect(screen.getByText('Latest value')).toBeInTheDocument();
  });

  it('renders an em-dash for a row with no matching observation series, never dropping the row', () => {
    const table: TableView = {
      rows: [{ variable: 'ODA grants', entity: 'France', value: null, date: null, obsCount: 0 }],
    };
    render(<DataTable table={table} />);
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2); // value cell + date cell
  });

  it('renders an em-dash place cell when the row has no resolved entity', () => {
    const table: TableView = {
      rows: [{ variable: 'ODA grants', entity: '', value: null, date: null, obsCount: 0 }],
    };
    render(<DataTable table={table} />);
    expect(screen.getAllByText('—')).toHaveLength(3); // place + value + date cells
  });
});
