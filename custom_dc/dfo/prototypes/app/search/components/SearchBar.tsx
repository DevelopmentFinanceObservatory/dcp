'use client';

/**
 * SearchBar — the describe-in-plain-language entry point. A single instance
 * persists across the home and result views (its size animates via the `slim`
 * class), so it can be driven as a controlled input (pass `value` + `onChange`)
 * or stand alone uncontrolled. Submits a free-text query.
 *
 * While `busy`, the search icon becomes a spinner and a Stop button appears
 * (wired to `onCancel`). Submitting again while busy is allowed — the store
 * fences requests, so a new query replaces the in-flight one.
 *
 * The search icon is itself the submit button, disabled while the trimmed
 * query is empty — Enter on an empty/whitespace query was already a silent
 * no-op; this just gives the click affordance the same, visibly, rather than
 * dispatching nothing with no sign why.
 */

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="flex-none text-g6">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-[18px] w-[18px] flex-none animate-spin rounded-full border-2 border-g3 border-t-g6"
    />
  );
}

export function SearchBar({
  onSubmit,
  value,
  onChange,
  onFocus,
  placeholder = 'e.g. total population of Kenya',
  slim = false,
  autoFocus = false,
  busy = false,
  onCancel,
}: {
  onSubmit: (query: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  slim?: boolean;
  autoFocus?: boolean;
  /** a lookup is in flight — show the spinner and (with onCancel) a Stop button */
  busy?: boolean;
  onCancel?: () => void;
}) {
  const controlled = onChange !== undefined;
  const [internal, setInternal] = useState(value ?? '');
  const current = controlled ? (value ?? '') : internal;
  const inputRef = useRef<HTMLInputElement>(null);

  function update(next: string) {
    if (controlled) onChange?.(next);
    else setInternal(next);
  }

  return (
    <form
      role="search"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl border-2 border-g6 bg-white shadow-dark',
        'transition-[max-width,padding] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        slim ? 'max-w-[560px] px-3.5 py-2' : 'max-w-[720px] px-[1.1rem] py-[0.7rem]',
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const q = current.trim();
        if (q) onSubmit(q);
      }}
    >
      <button
        type="submit"
        aria-label="Search"
        disabled={!current.trim()}
        className="flex-none cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default disabled:opacity-40"
      >
        {busy ? <Spinner /> : <SearchIcon />}
      </button>
      <input
        ref={inputRef}
        type="search"
        aria-label="Describe the data you want"
        aria-busy={busy || undefined}
        placeholder={placeholder}
        value={current}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onChange={(e) => update(e.target.value)}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent text-g6 outline-none placeholder:text-g3',
          // Suppress the native search-field chrome (cancel ✕, results pill —
          // engine-dependent, can render inside the box once text is typed);
          // the form's own icon/Stop affordances cover those roles.
          'appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden',
          'transition-[font-size] duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          slim ? 'text-[15px]' : 'text-[17px]',
        )}
      />
      {busy && onCancel && (
        <button
          type="button"
          onClick={() => {
            onCancel();
            // Stop hands focus back to the input — the user's next move is
            // almost always to keep typing, not to go hunting for the field.
            inputRef.current?.focus();
          }}
          className="flex-none cursor-pointer rounded-lg border border-g3 bg-white px-2.5 py-1 text-[13px] font-medium text-g5 hover:border-g4 hover:text-g6"
        >
          Stop
        </button>
      )}
    </form>
  );
}
