"use client";

/**
 * DebugPanel — a development-only window onto what the front end received from the
 * engine. Dumps the full ResolveResponse verbatim (schema_version / status /
 * query_echo / diagnostics / `parts[]`, each part carrying its own status, spec /
 * candidates / no_data / unsupported payload, timing_ms, and warnings) alongside
 * the client-captured streaming detail, so the contract is inspectable while
 * iterating on the engine.
 *
 * Gated to development by the caller (NODE_ENV !== 'production'), so it never
 * reaches end users. Collapsed by default.
 */

import { memo, useState, useMemo } from "react";
import type { ResolveResponse } from "@/lib/contract/types";
import { JsonViewer } from "./JsonViewer";

function DebugPanelImpl({
  response,
  extra,
}: {
  response: ResolveResponse | null;
  /** anything else worth inspecting (streaming progress, status…) */
  extra?: Record<string, unknown>;
}) {
  const [copied, setCopied] = useState(false);
  const data = useMemo(
    () => ({ response, ...(extra ? { client: extra } : {}) }),
    [response, extra],
  );
  const payloadString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  function copy() {
    navigator.clipboard
      ?.writeText(payloadString)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <details className="rounded-2xl border border-g2 bg-g1 p-4 text-[14px]">
      <summary className="cursor-pointer select-none text-[13px] font-medium text-g5 hover:text-g6">
        Debug · engine payload
      </summary>
      <div className="mt-2.5 mb-3 flex items-center justify-between">
        <span className="text-[12px] text-g4">
          Raw ResolveResponse + client state (dev only)
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-g3 bg-white px-2.5 py-1 text-[12px] font-medium text-g5 hover:border-g5 hover:text-g6"
        >
          <span>{copied ? "Copied" : "Copy JSON"}</span>
        </button>
      </div>

      <JsonViewer data={data} className="shadow-sm" />
    </details>
  );
}

export const DebugPanel = memo(DebugPanelImpl);
