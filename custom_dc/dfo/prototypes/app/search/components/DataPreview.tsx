"use client";

/**
 * DataPreview — the observation table for every definite part of a result,
 * in part order.
 *
 * A single part with a single series shipping more than one point renders
 * RecentValues (a compact newest-first Date/Value list). Two or more parts
 * union their rows into one DataTable instead, with a leading Variable
 * column (DataTable's own, already labelled from each row's own stat_var)
 * so a reader can tell which variable a row belongs to; a single part hides
 * that column, since there's nothing to distinguish rows by. A caption
 * under the table gives the row count per variable. Rendered only when at
 * least one part carries an observation series, since an all-em-dash table
 * reads as broken data.
 */

import type { Spec } from "@/lib/contract/types";
import { buildViewModel } from "../lib/viewModel";
import { DataTable } from "./DataTable";
import { RecentValues } from "./RecentValues";
import { ExportHubModal } from "./ExportHubModal";
import { useState } from "react";

export interface DataPreviewPart {
  spec: Spec;
  /** this part's own what-phrase text (e.g. "Total population", "GDP"),
   *  used only in the multi-part caption's row-count line. */
  label: string;
}

function PreviewHeader({ onExport }: { onExport: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[13px] font-semibold text-g5">Preview</div>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-g3 bg-white px-2.5 py-1 text-[12px] font-medium text-g6 shadow-sm hover:border-g4 hover:bg-g1"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        <span>Export dataset</span>
      </button>
    </div>
  );
}

export function DataPreview({ parts }: { parts: DataPreviewPart[] }) {
  const [showExport, setShowExport] = useState(false);
  const withStatVars = parts.filter((p) => (p.spec.stat_vars ?? []).length > 0);
  if (withStatVars.length === 0) return null;

  // No coverage count here. coverage.observation_count unions every facet,
  // while the preview ships one selected facet's windowed series, so
  // repeating the coverage number over a table with a different denominator
  // would read as a mismatch. The rail owns the coverage story; RecentValues'
  // own "Showing latest N of M" note carries the preview's denominator.
  const hasObservations = withStatVars.some(
    (p) => !!p.spec.observations?.series?.length,
  );
  if (!hasObservations) return null;

  if (withStatVars.length === 1) {
    const { spec } = withStatVars[0];
    const table = buildViewModel(spec).table;
    const recentPoints = table.recentPoints;
    return (
      <section aria-label="Data preview" className="grid gap-2">
        <PreviewHeader onExport={() => setShowExport(true)} />
        <div className="overflow-x-auto">
          {recentPoints && (recentPoints.points?.length ?? 0) > 1 ? (
            <RecentValues recentPoints={recentPoints} />
          ) : (
            <DataTable table={table} showVariableColumn={false} />
          )}
        </div>
        {showExport && (
          <ExportHubModal onClose={() => setShowExport(false)} spec={spec} />
        )}
      </section>
    );
  }

  const perPart = withStatVars.map((p) => ({
    label: p.label,
    table: buildViewModel(p.spec).table,
  }));
  const rows = perPart.flatMap(({ table }) => table.rows);
  const caption = perPart
    .map(
      ({ label, table }) =>
        `${table.rows.length} row${table.rows.length === 1 ? "" : "s"} for ${label}`,
    )
    .join(", ");

  return (
    <section aria-label="Data preview" className="grid gap-2">
      <PreviewHeader onExport={() => setShowExport(true)} />
      <div className="overflow-x-auto">
        <DataTable table={{ rows }} showVariableColumn />
      </div>
      <p className="m-0 text-[12px] text-g4">{caption}</p>
      {showExport && (
        <ExportHubModal
          onClose={() => setShowExport(false)}
          spec={withStatVars[0].spec}
        />
      )}
    </section>
  );
}
