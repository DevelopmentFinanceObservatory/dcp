'use client';

/**
 * LiveSentence — the in-flight sentence rendered while a resolve streams,
 * occupying the exact space (and typography) the settled sentence will fill.
 *
 * Non-interactive by design: phrases are spans, not buttons — nothing is
 * editable until the result commits. Resolved phrases render slightly muted
 * (the sentence is forming, not final); placeholders for slots still being
 * resolved show the slot's label with a dashed underline, the same non-colour
 * cue the settled sentence uses for "open" phrases. Announcements are owned by
 * CommsTrace's role="status" line, so this stays out of the live-region chatter.
 */

import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import type { LivePart } from '../lib/viewModel/liveSentence';

export function LiveSentence({ sentences }: { sentences: LivePart[][] }) {
  return (
    <div aria-hidden="true">
      {sentences.map((parts, s) => (
        <div key={s} className="animate-reveal m-0 text-[34px] leading-[1.35] tracking-[-0.01em]">
          {parts.map((part, i) =>
            part.kind === 'text' ? (
              <Fragment key={`t-${i}`}>{part.text}</Fragment>
            ) : (
              <span
                key={`p-${i}`}
                className={cn(
                  'mr-2 inline-block',
                  part.pending
                    ? 'border-b border-dashed border-g3 font-normal text-g3'
                    : 'border-b-2 border-g3 font-medium text-g5',
                )}
              >
                {part.text}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
