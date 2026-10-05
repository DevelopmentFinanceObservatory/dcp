/**
 * Pure clamping math for a popover anchored under a phrase or pill: flush
 * with the anchor's left edge by default, flipped to right-align with the
 * anchor when that would overflow the viewport's right edge, and never
 * pushed past the left edge either. Returns the `left` offset (px, may be
 * negative) to apply relative to the anchor's own left edge. Shared by every
 * popover in the search UI (ComposedSentence's phrase chips, NarrowFurther's
 * panel) rather than duplicated per consumer.
 */
export function clampPopoverLeft({
  anchorLeft,
  anchorWidth,
  popoverWidth,
  viewportWidth,
  margin = 8,
}: {
  anchorLeft: number;
  anchorWidth: number;
  popoverWidth: number;
  viewportWidth: number;
  margin?: number;
}): number {
  const flushLeft = anchorLeft;
  const overflowsRight = flushLeft + popoverWidth > viewportWidth - margin;
  const desired = overflowsRight
    ? anchorLeft + anchorWidth - popoverWidth
    : flushLeft;
  const clamped = Math.max(desired, margin);
  return clamped - anchorLeft;
}
