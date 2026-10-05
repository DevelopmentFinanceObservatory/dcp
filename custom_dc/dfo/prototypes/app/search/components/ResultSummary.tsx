"use client";

/**
 * ResultSummary displays query interpretation, execution metrics, and Data Commons identifiers.
 */

import { memo, useState } from "react";
import type { Warning } from "@/lib/contract/types";
import type {
  InterpretationView,
  TraceRefView,
  TraceView,
} from "../lib/viewModel";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="contents">
      <dt className="text-g4">{label}</dt>
      <dd className="m-0 text-g6">{value}</dd>
    </div>
  );
}

function CopyButton({
  text,
  ariaLabel,
  label = "Copy",
}: {
  text: string;
  ariaLabel: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy text to clipboard:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={ariaLabel}
      className="cursor-pointer text-[12px] font-medium text-g5 underline hover:text-g6"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function RefList({ title, refs }: { title: string; refs: TraceRefView[] }) {
  if (refs.length === 0) return null;
  const allDcids = refs.map((r) => r.dcid).join(", ");

  return (
    <div className="mt-2.5">
      <div className="mb-1 flex items-center justify-between text-[12px] text-g4">
        <span>{title}</span>
        {refs.length > 1 && (
          <CopyButton
            text={allDcids}
            ariaLabel={`Copy all ${title} DCIDs`}
            label="Copy all"
          />
        )}
      </div>
      <ul className="m-0 space-y-1 p-0 list-none">
        {refs.map((r) => (
          <li
            key={r.dcid}
            className="flex items-center justify-between rounded-lg border border-g2 bg-white px-2.5 py-1 text-[12px]"
          >
            <span className="font-medium text-g6">{r.label}</span>
            <div className="flex items-center gap-2">
              <code className="text-g4 font-mono text-[11px]">{r.dcid}</code>
              <CopyButton
                text={r.dcid}
                ariaLabel={`Copy DCID for ${r.label}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ResultSummaryProps {
  interpretation: InterpretationView;
  trace: TraceView;
  warnings?: Warning[];
  traceId?: string | null;
  llmUsage?: Record<string, number> | null;
  specId?: string | null;
}

function ResultSummaryImpl({
  interpretation,
  trace,
  warnings,
  traceId,
  llmUsage,
  specId,
}: ResultSummaryProps) {
  const ran = trace.steps.filter((s) => s.ran);
  const totalMs = ran.reduce((sum, s) => sum + (s.ms ?? 0), 0);
  const prominentWarnings = (warnings ?? []).filter(
    (w) => w?.severity === "warn" || w?.severity === "degraded",
  );

  const rows: { label: string; value: string }[] = [];
  if (interpretation.variables.length)
    rows.push({ label: "Measure", value: interpretation.variables.join(", ") });
  if (interpretation.places.length)
    rows.push({ label: "Place", value: interpretation.places.join(", ") });
  if (interpretation.dates)
    rows.push({ label: "Dates", value: interpretation.dates });
  if (interpretation.shapeLabel)
    rows.push({ label: "Data shape", value: interpretation.shapeLabel });

  return (
    <div className="grid gap-3" aria-label="Resolution explanation">
      {prominentWarnings.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2.5 text-[13px] text-[#92400e]"
        >
          <div className="font-semibold">
            {prominentWarnings.some((w) => w.severity === "degraded")
              ? "Degraded result"
              : "Partial coverage"}
          </div>
          <ul className="mt-1 list-disc pl-4 text-[12px] leading-[1.4]">
            {prominentWarnings.map((w, idx) => (
              <li key={`${w.code}-${idx}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-2xl border border-g2 bg-g1 p-4 text-[14px] transition-colors hover:border-g3">
        <summary className="cursor-pointer select-none text-[13px] font-medium text-g5">
          How this was answered
          <span className="text-g4">
            {" · "}Resolved in{" "}
            {totalMs > 0 ? `${(totalMs / 1000).toFixed(2)}s` : "<1s"}
            {trace.statVars.length > 0
              ? ` · ${trace.statVars.length} series`
              : ""}
          </span>
        </summary>

        {/* Pipeline steps latency breakdown */}
        {ran.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-g2 pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-g4">
              pipeline
            </span>
            {ran.map((s) => (
              <span
                key={s.step}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-g2 px-2 py-0.5 text-[11px] text-g6 font-mono"
              >
                <span>{s.step}</span>
                {s.ms != null && <span className="text-g4">({s.ms}ms)</span>}
              </span>
            ))}
            {llmUsage && (
              <span className="ml-auto text-[11px] text-g4 font-mono">
                Tokens: {llmUsage.input_tokens ?? 0} in /{" "}
                {llmUsage.output_tokens ?? 0} out
              </span>
            )}
          </div>
        )}

        {/* Plain language interpretation */}
        {rows.length > 0 && (
          <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            {rows.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>
        )}

        {/* Graph identifiers disclosure */}
        <details className="mt-3 border-t border-g2 pt-2.5">
          <summary className="cursor-pointer select-none text-[12px] font-medium text-g5 hover:text-g6">
            Data Commons details
          </summary>
          <div className="mt-2">
            <RefList title="Variables (StatVars)" refs={trace.statVars} />
            <RefList title="Entities" refs={trace.entities} />
            <RefList title="Sources and provenance" refs={trace.sources} />

            {specId && (
              <div className="mt-3 flex items-center justify-between border-t border-g2 pt-2 text-[12px] text-g4">
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Spec ID</span>
                  <code className="text-g6">{specId}</code>
                </div>
                <CopyButton text={specId} ariaLabel="Copy spec ID" />
              </div>
            )}

            {traceId && (
              <div className="mt-3 flex items-center justify-between border-t border-g2 pt-2 text-[12px] text-g4">
                <div className="flex items-center gap-1.5 font-mono">
                  <span>Trace ID</span>
                  <code className="text-g6">{traceId}</code>
                </div>
                <CopyButton text={traceId} ariaLabel="Copy request trace ID" />
              </div>
            )}
          </div>
        </details>
      </details>
    </div>
  );
}

export const ResultSummary = memo(ResultSummaryImpl);
