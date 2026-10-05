// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorView } from './ErrorView';

describe('<ErrorView>', () => {
  it('announces the failure and shows the message', () => {
    render(<ErrorView message="The engine could not be reached." onRetry={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The engine could not be reached.');
  });

  it('calls onRetry when "try again" is pressed', () => {
    const onRetry = vi.fn();
    render(<ErrorView message="oops" onRetry={onRetry} />);
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onRetry).toHaveBeenCalled();
  });
});
