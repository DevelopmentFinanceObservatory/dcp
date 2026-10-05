"use client";

/**
 * ExportHubModal renders dataset export controls for CSV, Excel, and Parquet formats.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Spec } from "@/lib/contract/types";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/components/useFocusTrap";

export type ExportFormat = "csv" | "xlsx" | "parquet";
export type ExportLayout = "long" | "wide";
export type TimeScope = "all" | "latest";
export type SnippetLang = "curl" | "python" | "r";

export interface ExportHubModalProps {
  onClose: () => void;
  spec?: Spec | null;
}

export interface GenerateExportFilenameOptions {
  spec?: Spec | null;
  format?: ExportFormat;
  layout?: ExportLayout;
  bundle?: boolean;
  timeScope?: TimeScope;
  latestYear?: string | number | null;
  includePeers?: boolean;
  peerCount?: number;
}

/**
 * Slugifies text into a clean alphanumeric hyphenated identifier.
 */
export function slugify(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Discovers peer entities strictly from the engine's resolved candidates in the spec.
 * If the engine does not supply candidate alternatives, returns an empty array and the UI gracefully omits the peer option.
 */
export function discoverPeerEntities(
  spec?: Spec | null,
): Array<{ dcid: string; label: string }> {
  const currentDcid = spec?.entities?.[0]?.ref?.dcid;
  if (!currentDcid) return [];

  const peerMap = new Map<string, string>();

  // 1. Inspect entity_options
  for (const eo of spec?.entity_options ?? []) {
    for (const opt of eo.options ?? []) {
      const d = opt.value?.ref?.dcid;
      const l = opt.value?.ref?.label;
      if (
        d &&
        d !== currentDcid &&
        !d.startsWith("africa") &&
        !d.startsWith("LowIncome")
      ) {
        peerMap.set(d, l || d);
      }
    }
  }

  // 2. Inspect slot_options for where/place axis
  for (const so of spec?.slot_options ?? []) {
    const isWhere =
      so.key?.axis === "where" ||
      (typeof so.key === "string" && (so.key as string).includes("where"));
    if (isWhere) {
      for (const opt of so.options ?? []) {
        const d = opt.value?.ref?.dcid;
        const l = opt.value?.ref?.label;
        if (d && d !== currentDcid && d.startsWith("country/")) {
          peerMap.set(d, l || d);
        }
      }
    }
  }

  return Array.from(peerMap.entries()).map(([dcid, label]) => ({
    dcid,
    label,
  }));
}

/**
 * Extracts start and end years from spec.
 */
export function extractYears(
  spec?: Spec | null,
): { startYear: string | number; endYear: string | number } | null {
  if (spec?.coverage && "window" in spec.coverage && spec.coverage.window) {
    const { start_year, end_year } = spec.coverage.window;
    if (start_year && end_year)
      return { startYear: start_year, endYear: end_year };
    if (end_year)
      return { startYear: start_year ?? end_year, endYear: end_year };
  }

  if (spec?.observations?.series?.length) {
    const years: number[] = [];
    for (const s of spec.observations.series) {
      for (const pt of s?.points ?? []) {
        const y = parseInt(pt.date, 10);
        if (!isNaN(y)) years.push(y);
      }
    }
    if (years.length > 0) {
      return {
        startYear: Math.min(...years),
        endYear: Math.max(...years),
      };
    }
  }

  return null;
}

/**
 * Generates a human-readable dataset export filename based on measure, place, format, layout, time, and peers.
 */
export function generateExportFilename({
  spec,
  format = "csv",
  layout = "long",
  bundle = false,
  timeScope = "all",
  latestYear,
  includePeers = false,
  peerCount = 0,
}: GenerateExportFilenameOptions): string {
  const measureSlug = slugify(spec?.stat_vars?.[0]?.ref?.label);
  const entitySlug = slugify(spec?.entities?.[0]?.ref?.label);

  let entityPart = entitySlug;
  if (includePeers && peerCount > 0) {
    entityPart = `${entitySlug}_and_${peerCount}_peers`;
  }

  const parts = [measureSlug, entityPart].filter(Boolean);
  let base = parts.length > 0 ? parts.join("_") : "dfo-dataset";

  if (timeScope === "latest") {
    base = `${base}_${latestYear || "latest"}`;
  }

  if (bundle) {
    return `${base}_package.zip`;
  }
  if (layout === "wide") {
    return `${base}_wide.${format}`;
  }
  return `${base}.${format}`;
}

export function ExportHubModal({ onClose, spec }: ExportHubModalProps) {
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [layout, setLayout] = useState<ExportLayout>("long");
  const [timeScope, setTimeScope] = useState<TimeScope>("all");
  const [includePeers, setIncludePeers] = useState(false);
  const [bundle, setBundle] = useState(true);
  const [snippetLang, setSnippetLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    setMounted(true);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const sanitizedSpecId = (spec?.spec_id || "spec_latest").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const measureName = spec?.stat_vars?.[0]?.ref?.label || "Data Commons Series";
  const entityLabel = spec?.entities?.[0]?.ref?.label || "";
  const currentEntityDcid = spec?.entities?.[0]?.ref?.dcid;

  const yearInfo = useMemo(() => extractYears(spec), [spec]);
  const peers = useMemo(() => discoverPeerEntities(spec), [spec]);

  const filename = generateExportFilename({
    spec,
    format,
    layout,
    bundle,
    timeScope,
    latestYear: yearInfo?.endYear,
    includePeers,
    peerCount: peers.length,
  });

  const getApiUrl = () => {
    if (typeof window !== "undefined" && window.location) {
      return `${window.location.origin}/api/datasets`;
    }
    return "/api/datasets";
  };

  const getEntityRole = () => {
    const rawRole = spec?.entities?.[0]?.role;
    if (typeof rawRole === "string") return rawRole;
    if (rawRole && typeof rawRole === "object" && "direction" in rawRole) {
      return rawRole.direction === "from" ? "provider" : "observationAbout";
    }
    return "observationAbout";
  };

  const entityRole = getEntityRole();

  const getScopeBlock = () => {
    const scope: {
      window?: { kind: string };
      entities?: Record<string, string[]>;
    } = {};
    if (timeScope === "latest") {
      scope.window = { kind: "latest" };
    } else {
      scope.window = { kind: "all" };
    }

    if (includePeers && currentEntityDcid && peers.length > 0) {
      scope.entities = {
        [entityRole]: [currentEntityDcid, ...peers.map((p) => p.dcid)],
      };
    } else if (currentEntityDcid) {
      scope.entities = {
        [entityRole]: [currentEntityDcid],
      };
    }

    return Object.keys(scope).length > 0 ? scope : undefined;
  };

  const getDatasetsInput = () => {
    const scopeBlock = getScopeBlock();
    const statvars = (spec?.stat_vars ?? [])
      .map((sv) => {
        const d =
          typeof sv.ref === "string"
            ? sv.ref
            : sv.ref?.dcid || "";
        if (!d) return "";
        return d.startsWith("dcid:") ? d : `dcid:${d}`;
      })
      .filter(Boolean);

    if (statvars.length > 0) {
      return {
        kind: "statvar_set" as const,
        statvars,
        ...(scopeBlock ? { scope: scopeBlock } : {}),
      };
    }

    return {
      kind: "spec_id" as const,
      spec_id: sanitizedSpecId,
      ...(spec?.definition ? { definition: spec.definition } : {}),
      ...(scopeBlock ? { scope: scopeBlock } : {}),
    };
  };

  const getDatasetsOptions = () => {
    const optionsDict: {
      format: ExportFormat;
      bundle: boolean;
      pivot?: { index: string; columns: string };
    } = {
      format,
      bundle,
    };
    if (layout === "wide") {
      optionsDict.pivot = { index: entityRole, columns: "time_period" };
    }
    return optionsDict;
  };

  const getCodeSnippet = () => {
    const url = getApiUrl();
    const inputDict = getDatasetsInput();
    const optionsDict = getDatasetsOptions();

    if (snippetLang === "python") {
      return `import requests\nimport pandas as pd\n\n# 1. Mint dataset artifact package\nres = requests.post(\n    "${url}",\n    json={\n        "schema_version": 1,\n        "input": ${JSON.stringify(inputDict, null, 8).replace(/^ {8}/gm, "        ")},\n        "options": ${JSON.stringify(optionsDict, null, 8).replace(/^ {8}/gm, "        ")}\n    }\n)\ndownload_url = res.json()["artifacts"][0]["url"]\n\n# 2. Download or read directly\n${bundle ? `# Download package zip\nwith open("${filename}", "wb") as f:\n    f.write(requests.get(download_url).content)` : `df = pd.read_${format === "parquet" ? "parquet" : format === "xlsx" ? "excel" : "csv"}(download_url)\nprint(df.head())`}`;
    }

    if (snippetLang === "r") {
      return `library(httr)\n\n# 1. Mint dataset artifact package\nres <- POST(\n    "${url}",\n    body = list(\n        schema_version = 1,\n        input = ${JSON.stringify(inputDict)},\n        options = ${JSON.stringify(optionsDict)}\n    ),\n    encode = "json"\n)\ndownload_url <- content(res)$artifacts[[1]]$url\n\n# 2. Download artifact\ndownload.file(download_url, "${filename}", mode = "wb")`;
    }

    // Default cURL
    const reqBody = {
      schema_version: 1,
      input: inputDict,
      options: optionsDict,
    };

    return `# 1. Mint dataset and extract signed download URL\nDOWNLOAD_URL=$(curl -s -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(reqBody, null, 2)}' | jq -r '.artifacts[0].url')\n\n# 2. Download file to disk\ncurl -o "${filename}" "$DOWNLOAD_URL"`;
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(getCodeSnippet());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy code snippet to clipboard:", err);
    }
  };

  const isValidDownloadUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const input = getDatasetsInput();
      const options = getDatasetsOptions();

      const response = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_version: 1,
          input,
          options,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          const downloadUrl = data.artifacts?.[0]?.url;
          if (
            downloadUrl &&
            typeof downloadUrl === "string" &&
            isValidDownloadUrl(downloadUrl)
          ) {
            const proxyUrl = `/prototype/api/download?url=${encodeURIComponent(
              downloadUrl,
            )}&filename=${encodeURIComponent(filename)}`;

            const a = document.createElement("a");
            a.href = proxyUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            onClose();
            return;
          }
        }
      }

      let errorDetail = "";
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errJson.title || "";
      } catch {
        // ignore
      }

      // If user selected raw CSV without bundle and API failed, fallback to client CSV seamlessly
      if (format === "csv" && !bundle && !includePeers) {
        triggerClientFallbackDownload();
        onClose();
        return;
      }

      // For xlsx/parquet/bundle/peers, notify the user with an option to download client CSV
      setDownloadError(
        errorDetail
          ? `Server export failed (${errorDetail}). You can download a basic CSV instead.`
          : "Server export is currently unavailable. You can download a basic CSV instead."
      );
    } catch {
      if (format === "csv" && !bundle && !includePeers) {
        triggerClientFallbackDownload();
        onClose();
        return;
      }
      setDownloadError(
        "Network error while preparing export. You can download a basic CSV instead."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const escapeCsvCell = (value: unknown): string => {
    if (value == null) return "";
    let str = String(value);
    // CSV Formula Injection defense
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const triggerClientFallbackDownload = () => {
    if (!spec?.observations?.series?.length) {
      onClose();
      return;
    }

    const fallbackFilename = generateExportFilename({
      spec,
      format: "csv",
      layout,
      bundle: false,
      timeScope,
      latestYear: yearInfo?.endYear,
      includePeers,
      peerCount: peers.length,
    });

    let csvContent = "";

    // Filter points based on timeScope
    const filterSeriesPoints = (
      points: Array<{ date: string; value: number | null }>,
    ) => {
      if (timeScope === "latest" && yearInfo?.endYear) {
        return points.filter(
          (p) => String(p.date) === String(yearInfo.endYear),
        );
      }
      return points;
    };

    if (layout === "wide") {
      const allDatesSet = new Set<string>();
      for (const s of spec.observations.series) {
        for (const p of filterSeriesPoints(s?.points ?? [])) {
          if (p.date) allDatesSet.add(p.date);
        }
      }
      const sortedDates = Array.from(allDatesSet).sort();
      const headers = ["observationAbout", "stat_var", ...sortedDates];
      const rows: string[][] = [];

      for (const s of spec.observations.series) {
        const valMap = new Map<string, string | number | null>();
        for (const p of filterSeriesPoints(s?.points ?? [])) {
          valMap.set(p.date, p.value);
        }
        const entityLbl = spec.entities?.[0]?.ref?.label || "entity";
        const statVarLabel = spec.stat_vars?.[0]?.ref?.label || "value";
        const row = [
          escapeCsvCell(entityLbl),
          escapeCsvCell(statVarLabel),
          ...sortedDates.map((d) => escapeCsvCell(valMap.get(d) ?? "")),
        ];
        rows.push(row);
      }
      csvContent = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
    } else {
      const headers = ["date", "value", "stat_var", "entity"];
      const rows: string[][] = [];

      for (const s of spec.observations.series) {
        const points = filterSeriesPoints(s?.points ?? []);
        for (const p of points) {
          rows.push([
            escapeCsvCell(p.date),
            escapeCsvCell(p.value),
            escapeCsvCell(spec.stat_vars?.[0]?.ref?.label || "value"),
            escapeCsvCell(spec.entities?.[0]?.ref?.label || "entity"),
          ]);
        }
      }
      csvContent = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => window.URL?.revokeObjectURL?.(url), 1000);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:pt-[12vh] pb-8">
      <div
        className="fixed inset-0 bg-black/20 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="relative w-full max-w-xl rounded-2xl border-2 border-g6 bg-white p-6 shadow-dark animate-enter"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="export-title"
              className="text-[19px] font-bold tracking-[-0.01em] text-g6"
            >
              Export Dataset
            </h2>
            <p className="mt-0.5 text-[13px] text-g4">
              {measureName}
              {entityLabel ? ` • ${entityLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="cursor-pointer rounded-lg border border-transparent p-1.5 text-g4 hover:border-g2 hover:bg-g1 hover:text-g6"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {/* Format Selection */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-g4">
              Format
            </label>
            <div className="flex gap-2">
              {(["csv", "xlsx", "parquet"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    format === f
                      ? "border-g6 bg-g6 text-white"
                      : "border-g2 bg-white text-g5 hover:border-g4 hover:text-g6",
                  )}
                >
                  {f === "csv"
                    ? "CSV (.csv)"
                    : f === "xlsx"
                      ? "Excel (.xlsx)"
                      : "Parquet (.parquet)"}
                </button>
              ))}
            </div>
          </div>

          {/* Time Scope Selection */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-g4">
              Time Scope
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTimeScope("all")}
                className={cn(
                  "cursor-pointer rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  timeScope === "all"
                    ? "border-g6 bg-g6 text-white"
                    : "border-g2 bg-white text-g5 hover:border-g4 hover:text-g6",
                )}
              >
                {yearInfo
                  ? `All years (${yearInfo.startYear}–${yearInfo.endYear})`
                  : "All available years"}
              </button>
              <button
                type="button"
                onClick={() => setTimeScope("latest")}
                className={cn(
                  "cursor-pointer rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  timeScope === "latest"
                    ? "border-g6 bg-g6 text-white"
                    : "border-g2 bg-white text-g5 hover:border-g4 hover:text-g6",
                )}
              >
                {yearInfo?.endYear
                  ? `Latest year only (${yearInfo.endYear})`
                  : "Latest year only"}
              </button>
            </div>
          </div>

          {/* Table Layout */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-g4">
              Table Layout
            </label>
            <div className="flex gap-2">
              {(["long", "wide"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    layout === l
                      ? "border-g6 bg-g6 text-white"
                      : "border-g2 bg-white text-g5 hover:border-g4 hover:text-g6",
                  )}
                >
                  {l === "long"
                    ? "Long table (observations)"
                    : "Wide pivot (years as columns)"}
                </button>
              ))}
            </div>
          </div>

          {/* Options (Checkboxes) */}
          <div className="space-y-2.5 pt-1">
            {/* Regional Peers Option */}
            {peers.length > 0 && currentEntityDcid && (
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-g6">
                <input
                  type="checkbox"
                  checked={includePeers}
                  onChange={(e) => setIncludePeers(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-g6"
                />
                <div>
                  <span className="font-medium">
                    Include {peers.length} regional peer{" "}
                    {peers.length === 1 ? "country" : "countries"}
                  </span>
                  <span className="block text-[12px] text-g4">
                    {peers
                      .slice(0, 4)
                      .map((p) => p.label)
                      .join(", ")}
                    {peers.length > 4 ? ` +${peers.length - 4} more` : ""}
                  </span>
                </div>
              </label>
            )}

            {/* Bundle Option */}
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-g6">
              <input
                type="checkbox"
                checked={bundle}
                onChange={(e) => setBundle(e.target.checked)}
                className="h-4 w-4 rounded accent-g6"
              />
              <span>
                Include Data Dictionary &amp; Provenance README in export
                package
              </span>
            </label>
          </div>
        </div>

        {/* Advanced / Developer Recipes (Collapsible) */}
        <details className="group mt-4 border-t border-g2 pt-3">
          <summary className="flex cursor-pointer select-none items-center justify-between text-[13px] font-medium text-g5 transition-colors hover:text-g6">
            <span className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-g4"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Advanced (API and code snippets)</span>
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-g4 transition-transform duration-200 group-open:rotate-180"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(["curl", "python", "r"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSnippetLang(lang)}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
                      snippetLang === lang
                        ? "bg-g2 text-g6 font-semibold"
                        : "text-g4 hover:text-g6",
                    )}
                  >
                    {lang === "curl"
                      ? "cURL"
                      : lang === "python"
                        ? "Python"
                        : "R"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void copySnippet()}
                className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-g5 hover:text-g6"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>{copied ? "Copied!" : "Copy snippet"}</span>
              </button>
            </div>
            <pre className="mt-2 max-h-[140px] overflow-x-auto rounded-xl border border-g2 bg-g1 p-3 text-[12px] font-mono leading-relaxed text-g6">
              <code>{getCodeSnippet()}</code>
            </pre>
          </div>
        </details>

        {/* Error / Fallback Banner */}
        {downloadError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="font-medium">{downloadError}</p>
                {spec?.observations?.series?.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerClientFallbackDownload();
                      onClose();
                    }}
                    className="mt-1.5 inline-block text-[12px] font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
                  >
                    Download basic CSV instead
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-g3 bg-white px-4 py-2 text-[13px] font-medium text-g5 hover:border-g4 hover:text-g6"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-g6 bg-g6 px-4 py-2 text-[13px] font-semibold text-white shadow-dark transition-colors hover:bg-g5 disabled:opacity-50"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>{isDownloading ? "Preparing…" : "Download dataset"}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
