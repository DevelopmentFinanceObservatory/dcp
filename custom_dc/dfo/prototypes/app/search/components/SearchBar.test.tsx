// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';

describe('<SearchBar>', () => {
  it('submits the typed query', () => {
    const onSubmit = vi.fn();
    render(<SearchBar onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'health ODA grants to Ethiopia' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('health ODA grants to Ethiopia');
  });

  it('does not submit an empty query', () => {
    const onSubmit = vi.fn();
    render(<SearchBar onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole('search'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a Stop button while busy and calls onCancel when clicked', () => {
    const onCancel = vi.fn();
    render(<SearchBar onSubmit={() => {}} busy onCancel={onCancel} />);
    const stop = screen.getByRole('button', { name: 'Stop' });
    fireEvent.click(stop);
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-busy', 'true');
  });

  it('returns keyboard focus to the input after Stop is clicked', () => {
    render(<SearchBar onSubmit={() => {}} busy onCancel={() => {}} />);
    const stop = screen.getByRole('button', { name: 'Stop' });
    fireEvent.click(stop);
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('renders no Stop button and no aria-busy when not busy', () => {
    render(<SearchBar onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).not.toHaveAttribute('aria-busy');
  });

  it('still calls onSubmit while busy — the store fences requests, the bar must not block', () => {
    const onSubmit = vi.fn();
    render(<SearchBar onSubmit={onSubmit} busy onCancel={() => {}} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'malaria grants to Kenya' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('malaria grants to Kenya');
  });

  it('disables the submit button while the trimmed query is empty', () => {
    render(<SearchBar onSubmit={() => {}} />);
    const submit = screen.getByRole('button', { name: 'Search' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '   ' } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ODA grants' } });
    expect(submit).toBeEnabled();
  });

  it('submits the typed query by clicking the (now enabled) submit button', () => {
    const onSubmit = vi.fn();
    render(<SearchBar onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'malaria grants to Kenya' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSubmit).toHaveBeenCalledWith('malaria grants to Kenya');
  });
});
