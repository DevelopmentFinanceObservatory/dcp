"use client";

/**
 * SharePopover renders sharing options for the search prototype.
 */

import { useEffect, useRef, useState } from "react";
import { useClickOutside } from "./useClickOutside";
import { useFocusTrap } from "@/components/useFocusTrap";

export interface SharePopoverProps {
  specId?: string | null;
  query?: string | null;
  onClose: () => void;
  baseUrl?: string;
}

export function SharePopover({
  specId,
  query,
  onClose,
  baseUrl,
}: SharePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedSpec, setCopiedSpec] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  useFocusTrap(popoverRef, true);
  useClickOutside(popoverRef, onClose);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const getBase = () => {
    if (baseUrl) return baseUrl;
    if (typeof window !== "undefined" && window.location) {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return "https://datacommons.org/prototype/search";
  };

  const base = getBase();
  const effectiveSpecId = specId?.trim() || "spec_latest";
  const trimmedQuery = query?.trim() || "";

  const specUrl = trimmedQuery
    ? `${base}?spec=${encodeURIComponent(effectiveSpecId)}&q=${encodeURIComponent(trimmedQuery)}`
    : `${base}?spec=${encodeURIComponent(effectiveSpecId)}`;

  const queryUrl = trimmedQuery
    ? `${base}?q=${encodeURIComponent(trimmedQuery)}`
    : base;

  const handleCopySpec = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(specUrl);
        setCopiedSpec(true);
        setTimeout(() => setCopiedSpec(false), 2000);
      }
    } catch (err) {
      console.warn("Failed to copy spec URL to clipboard:", err);
    }
  };

  const handleCopyQuery = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(queryUrl);
        setCopiedQuery(true);
        setTimeout(() => setCopiedQuery(false), 2000);
      }
    } catch (err) {
      console.warn("Failed to copy query URL to clipboard:", err);
    }
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Share options"
      aria-modal="true"
      className="w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-g6 bg-white p-4 text-[13px] text-g6 shadow-dark animate-enter"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-[14px] font-bold text-g6">Share</h2>
          <p className="m-0 text-[12px] text-g4">
            Choose whether to share these results or the query
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-transparent text-g5 hover:border-g3 hover:bg-g1 hover:text-g6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Option 1: Share results */}
        <div className="rounded-xl border-2 border-g6 bg-g1/40 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-g6">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-g6"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Share results</span>
            </div>
          </div>

          <p className="m-0 mb-2.5 text-[12px] leading-snug text-g5">
            Links directly to these results and chosen filters
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={specUrl}
              aria-label="Results link URL"
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-g3 bg-white px-2.5 py-1.5 font-mono text-[11px] text-g5 outline-none focus:border-g6 select-all"
            />
            <button
              type="button"
              onClick={() => void handleCopySpec()}
              aria-label="Copy results link"
              className={`inline-flex flex-none cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4 ${
                copiedSpec
                  ? "border-[#15803d] bg-[#15803d] text-white"
                  : "border-g6 bg-g6 text-white hover:bg-black"
              }`}
            >
              {copiedSpec ? (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Option 2: Share query */}
        <div className="rounded-xl border border-g3 bg-white p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-g6">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-g5"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Share query</span>
            </div>
          </div>

          <p className="m-0 mb-2.5 text-[12px] leading-snug text-g5">
            Links to the search query to run again
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={queryUrl}
              aria-label="Query link URL"
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-g2 bg-g1/50 px-2.5 py-1.5 font-mono text-[11px] text-g5 outline-none focus:border-g4 select-all"
            />
            <button
              type="button"
              onClick={() => void handleCopyQuery()}
              aria-label="Copy query link"
              className={`inline-flex flex-none cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-g4 ${
                copiedQuery
                  ? "border-[#15803d] bg-[#15803d] text-white"
                  : "border-g3 bg-white text-g6 hover:border-g5 hover:bg-g1"
              }`}
            >
              {copiedQuery ? (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
