"use client";

/**
 * JsonViewer renders collapsible JSON payloads with filtering and copy actions.
 */

import { useState, useMemo, memo } from "react";
import { cn } from "@/lib/cn";

interface JsonNodeProps {
  name?: string;
  value: unknown;
  depth?: number;
  isLast?: boolean;
  filter?: string;
  defaultExpanded?: boolean;
}

function JsonValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="italic text-g4 font-mono text-[12px]">null</span>;
  }
  if (value === undefined) {
    return (
      <span className="italic text-g4 font-mono text-[12px]">undefined</span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span className="font-mono text-[12px] font-semibold text-[#7c3aed]">
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono text-[12px] font-semibold text-[#c2410c]">
        {value}
      </span>
    );
  }
  if (typeof value === "string") {
    return (
      <span className="font-mono text-[12px] text-[#047857]">
        {`"${value}"`}
      </span>
    );
  }
  return <span className="font-mono text-[12px] text-g6">{String(value)}</span>;
}

function JsonNode({
  name,
  value,
  depth = 0,
  isLast = true,
  filter = "",
  defaultExpanded = true,
  maxExpandedDepth = 10,
}: JsonNodeProps & { maxExpandedDepth?: number }) {
  const [isExpanded, setIsExpanded] = useState<boolean>(
    depth < maxExpandedDepth ? defaultExpanded : false,
  );
  const [copied, setCopied] = useState(false);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  const keys = useMemo(() => {
    if (!isObject || value === null) return [];
    return Object.keys(value as Record<string, unknown>);
  }, [isObject, value]);

  // Check if current node or any children match filter
  const matchesFilter = useMemo(() => {
    if (!filter) return true;
    const lowerFilter = filter.toLowerCase();
    if (name && name.toLowerCase().includes(lowerFilter)) return true;
    if (!isObject) {
      return String(value).toLowerCase().includes(lowerFilter);
    }
    try {
      return JSON.stringify(value).toLowerCase().includes(lowerFilter);
    } catch {
      return false;
    }
  }, [filter, name, value, isObject]);

  if (filter && !matchesFilter) {
    return null;
  }

  const copyNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // Ignore
    }
  };

  const comma = isLast ? "" : ",";

  if (!isObject) {
    return (
      <div className="group flex items-baseline gap-1 py-0.5 pl-4 hover:bg-g1/80 rounded transition-colors font-mono text-[12px]">
        {name && (
          <span className="font-semibold text-[#1e293b]">
            {`"${name}"`}
            <span className="text-g4 font-normal">: </span>
          </span>
        )}
        <JsonValue value={value} />
        <span className="text-g4">{comma}</span>
        <button
          type="button"
          onClick={copyNode}
          title="Copy value"
          aria-label="Copy value"
          className="ml-2 opacity-0 group-hover:opacity-100 text-[10px] text-g4 hover:text-g6 transition-opacity px-1 rounded bg-g2/50"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    );
  }

  const count = isArray ? (value as unknown[]).length : keys.length;
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  if (count === 0) {
    return (
      <div className="flex items-baseline gap-1 py-0.5 pl-4 font-mono text-[12px]">
        {name && (
          <span className="font-semibold text-[#1e293b]">
            {`"${name}"`}
            <span className="text-g4 font-normal">: </span>
          </span>
        )}
        <span className="text-g5">
          {openBracket}
          {closeBracket}
        </span>
        <span className="text-g4">{comma}</span>
      </div>
    );
  }

  return (
    <div className="py-0.5 font-mono text-[12px]">
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="group flex cursor-pointer items-center gap-1.5 rounded py-0.5 pl-1 hover:bg-g1/80 select-none transition-colors"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] text-g4 group-hover:text-g6 transition-transform">
          {isExpanded ? "▼" : "▶"}
        </span>
        {name && (
          <span className="font-semibold text-[#1e293b]">
            {`"${name}"`}
            <span className="text-g4 font-normal">: </span>
          </span>
        )}
        <span className="text-g5 font-semibold">{openBracket}</span>
        {!isExpanded && (
          <span className="rounded bg-g2/70 px-1.5 py-0.2 text-[11px] text-g5 font-normal">
            {count}{" "}
            {isArray
              ? count === 1
                ? "item"
                : "items"
              : count === 1
                ? "key"
                : "keys"}
          </span>
        )}
        {!isExpanded && (
          <span className="text-g5 font-semibold">{closeBracket}</span>
        )}
        {!isExpanded && <span className="text-g4">{comma}</span>}
        <button
          type="button"
          onClick={copyNode}
          title="Copy node JSON"
          aria-label="Copy node JSON"
          className="ml-auto mr-2 opacity-0 group-hover:opacity-100 text-[10px] text-g4 hover:text-g6 transition-opacity px-1 rounded bg-g2/50"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>

      {isExpanded && (
        <div className="border-l border-g2/80 ml-3 pl-2">
          {isArray
            ? (value as unknown[]).map((item, index) => (
                <JsonNode
                  key={index}
                  value={item}
                  depth={depth + 1}
                  isLast={index === (value as unknown[]).length - 1}
                  filter={filter}
                  defaultExpanded={defaultExpanded}
                  maxExpandedDepth={maxExpandedDepth}
                />
              ))
            : keys.map((k, index) => (
                <JsonNode
                  key={k}
                  name={k}
                  value={(value as Record<string, unknown>)[k]}
                  depth={depth + 1}
                  isLast={index === keys.length - 1}
                  filter={filter}
                  defaultExpanded={defaultExpanded}
                  maxExpandedDepth={maxExpandedDepth}
                />
              ))}
        </div>
      )}

      {isExpanded && (
        <div className="pl-4 text-g5 font-semibold">
          {closeBracket}
          <span className="text-g4 font-normal">{comma}</span>
        </div>
      )}
    </div>
  );
}

export interface JsonViewerProps {
  data: unknown;
  initialExpandedDepth?: number;
  className?: string;
}

export const JsonViewer = memo(function JsonViewer({
  data,
  className,
}: JsonViewerProps) {
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "code">("tree");
  const [expandKey, setExpandKey] = useState<number>(0);
  const [expandAllState, setExpandAllState] = useState<boolean>(true);

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const toggleExpandAll = () => {
    setExpandAllState((prev) => !prev);
    setExpandKey((k) => k + 1);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-g2 bg-white overflow-hidden",
        className,
      )}
    >
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-g2 bg-g1 px-3 py-2 text-[12px]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter keys or values…"
            className="rounded-lg border border-g3 bg-white px-2.5 py-1 text-[12px] text-g6 placeholder:text-g4 focus:border-g5 focus:outline-none w-[180px] sm:w-[220px]"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="cursor-pointer text-[11px] text-g4 hover:text-g6"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === "tree" && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="cursor-pointer rounded-md border border-g3 bg-white px-2 py-1 text-[11px] font-medium text-g5 hover:border-g4 hover:text-g6"
            >
              {expandAllState ? "Collapse all" : "Expand all"}
            </button>
          )}
          <div className="flex items-center rounded-lg border border-g3 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn(
                "cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                viewMode === "tree"
                  ? "bg-g6 text-white"
                  : "text-g5 hover:text-g6",
              )}
            >
              Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={cn(
                "cursor-pointer rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                viewMode === "code"
                  ? "bg-g6 text-white"
                  : "text-g5 hover:text-g6",
              )}
            >
              Raw code
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-h-[460px] overflow-auto p-3 bg-white">
        {viewMode === "tree" ? (
          <div key={expandKey}>
            <JsonNode
              value={data}
              filter={filter}
              defaultExpanded={expandAllState}
            />
          </div>
        ) : (
          <pre className="font-mono text-[12px] leading-relaxed text-g6 whitespace-pre-wrap word-break-all">
            {formattedJson}
          </pre>
        )}
      </div>
    </div>
  );
});
