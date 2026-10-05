'use client';

/**
 * useClickOutside — calls `onOutside` when a pointer-down lands outside `ref`.
 * Used to dismiss popovers by clicking away. Only listens while `active`.
 */

import { useEffect, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  active = true,
): void {
  useEffect(() => {
    if (!active) return;
    function handle(event: MouseEvent) {
      const el = ref.current;
      if (el && !el.contains(event.target as Node)) onOutside();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, onOutside, active]);
}
