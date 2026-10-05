import { describe, it, expect } from "vitest";
import { clampPopoverLeft } from "./popoverPosition";

describe("clampPopoverLeft (viewport collision math)", () => {
  it("stays flush with the anchor when the popover fits within the viewport", () => {
    const offset = clampPopoverLeft({
      anchorLeft: 100,
      anchorWidth: 80,
      popoverWidth: 300,
      viewportWidth: 1000,
    });
    expect(offset).toBe(0);
  });

  it("flips right-aligned with the anchor when flush-left would overflow the right edge", () => {
    // anchor near the right edge of a narrow 500px viewport
    const offset = clampPopoverLeft({
      anchorLeft: 400,
      anchorWidth: 60,
      popoverWidth: 300,
      viewportWidth: 500,
    });
    // popover's right edge (anchorLeft + anchorWidth) should land at/near the anchor's right edge
    const popoverLeft = 400 + offset;
    expect(popoverLeft + 300).toBeLessThanOrEqual(500 - 8 + 0.01);
    expect(offset).toBeLessThan(0);
  });

  it("never pushes the popover past the left viewport edge, even flipped", () => {
    // anchor near the left edge, popover wider than the viewport itself
    const offset = clampPopoverLeft({
      anchorLeft: 10,
      anchorWidth: 40,
      popoverWidth: 300,
      viewportWidth: 320,
    });
    const popoverLeft = 10 + offset;
    expect(popoverLeft).toBeGreaterThanOrEqual(8);
  });

  it("respects a custom margin", () => {
    const offset = clampPopoverLeft({
      anchorLeft: 0,
      anchorWidth: 40,
      popoverWidth: 300,
      viewportWidth: 320,
      margin: 20,
    });
    expect(0 + offset).toBeGreaterThanOrEqual(20);
  });
});
