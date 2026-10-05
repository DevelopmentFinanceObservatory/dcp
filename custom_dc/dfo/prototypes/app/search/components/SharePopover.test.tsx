// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SharePopover } from "./SharePopover";

describe("<SharePopover>", () => {
  const defaultProps = {
    specId: "spec_abc123",
    query: "health expenditure kenya",
    onClose: vi.fn(),
    baseUrl: "https://datacommons.org/prototype/search",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with role='dialog' and title", () => {
    render(<SharePopover {...defaultProps} />);
    const dialog = screen.getByRole("dialog", { name: /share/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("renders Option 1: Share results with correct subtext and URL", () => {
    render(<SharePopover {...defaultProps} />);
    expect(screen.getByText("Share results")).toBeInTheDocument();
    expect(
      screen.getByText("Links directly to these results and chosen filters"),
    ).toBeInTheDocument();

    const specInput = screen.getByLabelText(
      "Results link URL",
    ) as HTMLInputElement;
    expect(specInput.value).toBe(
      "https://datacommons.org/prototype/search?spec=spec_abc123&q=health%20expenditure%20kenya",
    );
  });

  it("renders Option 2: Share query with correct subtext and URL", () => {
    render(<SharePopover {...defaultProps} />);
    expect(screen.getByText("Share query")).toBeInTheDocument();
    expect(
      screen.getByText("Links to the search query to run again"),
    ).toBeInTheDocument();

    const queryInput = screen.getByLabelText(
      "Query link URL",
    ) as HTMLInputElement;
    expect(queryInput.value).toBe(
      "https://datacommons.org/prototype/search?q=health%20expenditure%20kenya",
    );
  });

  it("copies results link with feedback on button click", async () => {
    render(<SharePopover {...defaultProps} />);

    const copySpecBtn = screen.getByRole("button", {
      name: "Copy results link",
    });
    expect(copySpecBtn).toHaveTextContent("Copy");

    fireEvent.click(copySpecBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://datacommons.org/prototype/search?spec=spec_abc123&q=health%20expenditure%20kenya",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copy results link" }),
      ).toHaveTextContent("Copied!");
    });
  });

  it("copies query link with feedback on button click", async () => {
    render(<SharePopover {...defaultProps} />);

    const copyQueryBtn = screen.getByRole("button", {
      name: "Copy query link",
    });
    expect(copyQueryBtn).toHaveTextContent("Copy");

    fireEvent.click(copyQueryBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://datacommons.org/prototype/search?q=health%20expenditure%20kenya",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copy query link" }),
      ).toHaveTextContent("Copied!");
    });
  });

  it("handles null/empty specId by defaulting to spec_latest", () => {
    render(<SharePopover {...defaultProps} specId={null} query="test query" />);
    const specInput = screen.getByLabelText(
      "Results link URL",
    ) as HTMLInputElement;
    expect(specInput.value).toBe(
      "https://datacommons.org/prototype/search?spec=spec_latest&q=test%20query",
    );
  });

  it("handles null/empty query gracefully without trailing ?q=", () => {
    render(<SharePopover {...defaultProps} specId="spec_123" query={null} />);
    const specInput = screen.getByLabelText(
      "Results link URL",
    ) as HTMLInputElement;
    expect(specInput.value).toBe(
      "https://datacommons.org/prototype/search?spec=spec_123",
    );

    const queryInput = screen.getByLabelText(
      "Query link URL",
    ) as HTMLInputElement;
    expect(queryInput.value).toBe("https://datacommons.org/prototype/search");
  });

  it("handles clipboard write failure gracefully", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });

    render(<SharePopover {...defaultProps} />);
    const copySpecBtn = screen.getByRole("button", {
      name: "Copy results link",
    });
    fireEvent.click(copySpecBtn);

    // Button should still show Copy (not crash)
    expect(copySpecBtn).toHaveTextContent("Copy");
  });

  it("handles missing navigator.clipboard gracefully", async () => {
    const originalClipboard = navigator.clipboard;
    // @ts-expect-error - simulating browser without clipboard API
    delete navigator.clipboard;

    render(<SharePopover {...defaultProps} />);
    const copySpecBtn = screen.getByRole("button", {
      name: "Copy results link",
    });
    fireEvent.click(copySpecBtn);

    expect(copySpecBtn).toHaveTextContent("Copy");

    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it("calls onClose when close button is clicked", () => {
    render(<SharePopover {...defaultProps} />);
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    render(<SharePopover {...defaultProps} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
