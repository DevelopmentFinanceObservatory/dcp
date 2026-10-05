"use client";

import { memo } from "react";

export interface GroundingCardProps {
  variables?: string[];
  places?: string[];
  dates?: string;
  className?: string;
}

/**
 * GroundingCard renders query interpretation tags.
 */
export const GroundingCard = memo(function GroundingCard({
  variables = [],
  places = [],
  dates,
  className,
}: GroundingCardProps) {
  if (variables.length === 0 && places.length === 0 && !dates) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 py-1 ${className ?? ""}`}
      aria-label="Query grounding"
    >
      {variables.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-full border border-g3 bg-g1 px-2.5 py-0.5 text-[12px] font-medium text-g6"
        >
          <span className="text-[11px] font-normal uppercase tracking-wider text-g4">
            measure
          </span>
          <span>{v}</span>
        </span>
      ))}
      {places.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1 rounded-full border border-g3 bg-g1 px-2.5 py-0.5 text-[12px] font-medium text-g6"
        >
          <span className="text-[11px] font-normal uppercase tracking-wider text-g4">
            place
          </span>
          <span>{p}</span>
        </span>
      ))}
      {dates && (
        <span className="inline-flex items-center gap-1 rounded-full border border-g3 bg-g1 px-2.5 py-0.5 text-[12px] font-medium text-g6">
          <span className="text-[11px] font-normal uppercase tracking-wider text-g4">
            window
          </span>
          <span>{dates}</span>
        </span>
      )}
    </div>
  );
});
