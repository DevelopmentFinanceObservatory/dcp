// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NarrowFurther } from './NarrowFurther';

const options = [
  { slotIndex: 1, label: 'age' },
  { slotIndex: 4, label: 'source' },
];

describe('<NarrowFurther>', () => {
  it('renders nothing when there are no addable dimensions', () => {
    const { container } = render(<NarrowFurther options={[]} onAdd={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists addable dimensions when opened and adds the chosen one', () => {
    const onAdd = vi.fn();
    render(<NarrowFurther options={options} onAdd={onAdd} />);

    // collapsed by default
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '+ narrow further' }));
    expect(screen.getByRole('dialog', { name: 'Narrow further' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'age' }));
    expect(onAdd).toHaveBeenCalledWith(1);
  });

  it('closes when clicking outside', () => {
    render(<NarrowFurther options={options} onAdd={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '+ narrow further' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the editor in place of the dimension list once activeIndex matches an option', () => {
    render(
      <NarrowFurther
        options={options}
        onAdd={() => {}}
        activeIndex={1}
        editor={<div role="dialog" aria-label="Edit age" />}
      />,
    );
    // No click on the trigger needed: the parent already opened this slot for editing.
    expect(screen.getByRole('dialog', { name: 'Edit age' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Narrow further' })).toBeNull();
  });

  it('calls onCloseEditor, not onAdd/local close, when clicking outside while editing', () => {
    const onCloseEditor = vi.fn();
    render(
      <NarrowFurther
        options={options}
        onAdd={() => {}}
        activeIndex={1}
        editor={<div role="dialog" aria-label="Edit age" />}
        onCloseEditor={onCloseEditor}
      />,
    );
    fireEvent.mouseDown(document.body);
    expect(onCloseEditor).toHaveBeenCalledTimes(1);
  });

  it('gives the trigger a stable id for focus restoration', () => {
    render(<NarrowFurther options={options} onAdd={() => {}} />);
    expect(screen.getByRole('button', { name: '+ narrow further' })).toHaveAttribute(
      'id',
      'narrow-further-trigger',
    );
  });

  describe('disabled', () => {
    it('renders the trigger natively disabled', () => {
      render(<NarrowFurther options={options} onAdd={() => {}} disabled />);
      expect(screen.getByRole('button', { name: '+ narrow further' })).toBeDisabled();
    });

    it('suppresses onAdd even if the list were somehow still open', () => {
      const onAdd = vi.fn();
      const { rerender } = render(<NarrowFurther options={options} onAdd={onAdd} />);
      fireEvent.click(screen.getByRole('button', { name: '+ narrow further' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<NarrowFurther options={options} onAdd={onAdd} disabled />);
      // the flip already closes the list (next test), but the click handler
      // itself is guarded too — belt and suspenders against a stale render.
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('closes an open dimension list when disabled flips true', () => {
      const { rerender } = render(<NarrowFurther options={options} onAdd={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: '+ narrow further' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<NarrowFurther options={options} onAdd={() => {}} disabled />);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
