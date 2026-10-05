// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  ExportHubModal,
  slugify,
  generateExportFilename,
  discoverPeerEntities,
  extractYears,
} from "./ExportHubModal";
import type { Spec } from "@/lib/contract/types";

describe("slugify", () => {
  it("returns empty string for null, undefined, or whitespace", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("converts strings to lowercase hyphen-separated slugs", () => {
    expect(slugify("Nominal GDP per capita")).toBe("nominal-gdp-per-capita");
    expect(slugify("Kenya")).toBe("kenya");
  });

  it("handles special characters, punctuation, and multiple consecutive non-alphanumerics", () => {
    expect(slugify("CO2 Emissions (metric tons/capita) & % change!")).toBe(
      "co2-emissions-metric-tons-capita-change"
    );
    expect(slugify("---test---slug---")).toBe("test-slug");
    expect(slugify("!!!###$$$")).toBe("");
  });

  it("normalizes unicode and accented characters", () => {
    expect(slugify("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(slugify("São Tomé and Príncipe")).toBe("sao-tome-and-principe");
    expect(slugify("Zürich")).toBe("zurich");
  });
});

describe("discoverPeerEntities", () => {
  it("discovers peers from entity_options", () => {
    const mockSpec = {
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
      entity_options: [
        {
          options: [
            { value: { ref: { dcid: "country/UGA", label: "Uganda" } } },
            { value: { ref: { dcid: "country/TZA", label: "Tanzania" } } },
          ],
        },
      ],
    } as unknown as Spec;

    const peers = discoverPeerEntities(mockSpec);
    expect(peers).toEqual([
      { dcid: "country/UGA", label: "Uganda" },
      { dcid: "country/TZA", label: "Tanzania" },
    ]);
  });

  it("returns empty array when spec has no candidate entity_options or slot_options", () => {
    const mockSpec = {
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
    } as unknown as Spec;

    const peers = discoverPeerEntities(mockSpec);
    expect(peers).toEqual([]);
  });
});

describe("extractYears", () => {
  it("extracts start and end years from coverage.window", () => {
    const mockSpec = {
      coverage: { window: { start_year: 1990, end_year: 2024 } },
    } as unknown as Spec;
    expect(extractYears(mockSpec)).toEqual({ startYear: 1990, endYear: 2024 });
  });

  it("extracts start and end years from observations.series", () => {
    const mockSpec = {
      observations: {
        series: [
          {
            points: [
              { date: "2010", value: 1 },
              { date: "2023", value: 2 },
            ],
          },
        ],
      },
    } as unknown as Spec;
    expect(extractYears(mockSpec)).toEqual({ startYear: 2010, endYear: 2023 });
  });
});

describe("generateExportFilename", () => {
  const specWithMeasureAndPlace = {
    stat_vars: [
      { ref: { label: "Nominal gross domestic product per capita" } },
    ],
    entities: [{ ref: { label: "Kenya" } }],
  } as unknown as Spec;

  describe("measure + place combinations", () => {
    it("generates bundled package filename", () => {
      const filename = generateExportFilename({
        spec: specWithMeasureAndPlace,
        bundle: true,
      });
      expect(filename).toBe(
        "nominal-gross-domestic-product-per-capita_kenya_package.zip"
      );
    });

    it("generates wide pivot filenames across formats", () => {
      expect(
        generateExportFilename({
          spec: specWithMeasureAndPlace,
          format: "csv",
          layout: "wide",
          bundle: false,
        })
      ).toBe("nominal-gross-domestic-product-per-capita_kenya_wide.csv");

      expect(
        generateExportFilename({
          spec: specWithMeasureAndPlace,
          format: "xlsx",
          layout: "wide",
          bundle: false,
        })
      ).toBe("nominal-gross-domestic-product-per-capita_kenya_wide.xlsx");

      expect(
        generateExportFilename({
          spec: specWithMeasureAndPlace,
          format: "parquet",
          layout: "wide",
          bundle: false,
        })
      ).toBe("nominal-gross-domestic-product-per-capita_kenya_wide.parquet");
    });

    it("generates latest year suffix when timeScope is latest", () => {
      expect(
        generateExportFilename({
          spec: specWithMeasureAndPlace,
          format: "csv",
          layout: "long",
          bundle: false,
          timeScope: "latest",
          latestYear: 2024,
        })
      ).toBe("nominal-gross-domestic-product-per-capita_kenya_2024.csv");
    });

    it("generates peers suffix when includePeers is true", () => {
      expect(
        generateExportFilename({
          spec: specWithMeasureAndPlace,
          format: "csv",
          layout: "long",
          bundle: false,
          includePeers: true,
          peerCount: 4,
        })
      ).toBe(
        "nominal-gross-domestic-product-per-capita_kenya_and_4_peers.csv"
      );
    });
  });
});

describe("ExportHubModal UI & Download Flow", () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;

  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => "blob:mock-blob-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("renders modal and handles close", () => {
    const onClose = vi.fn();
    render(<ExportHubModal onClose={onClose} />);
    expect(screen.getByText("Export Dataset")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("uses optical vertical alignment and responsiveness positioning classes", () => {
    render(<ExportHubModal onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const container = dialog.parentElement;
    expect(container).toHaveClass(
      "items-start",
      "pt-[10vh]",
      "sm:pt-[12vh]",
      "pb-8",
      "overflow-y-auto"
    );
  });

  it("toggles Time Scope and reflects in code snippet", () => {
    const mockSpec = {
      spec_id: "spec_test_123",
      stat_vars: [{ ref: { dcid: "dcid_1", label: "Nominal GDP" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
      coverage: { window: { start_year: 1960, end_year: 2024 } },
    } as unknown as Spec;

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpec} />);

    expect(screen.getByText("All years (1960–2024)")).toBeInTheDocument();
    expect(screen.getByText("Latest year only (2024)")).toBeInTheDocument();

    const latestBtn = screen.getByRole("button", {
      name: /Latest year only \(2024\)/i,
    });
    fireEvent.click(latestBtn);
    expect(latestBtn).toHaveClass("bg-g6");

    // Check code snippet contains "kind": "latest"
    expect(screen.getByText(/"kind": "latest"/)).toBeInTheDocument();
  });

  it("toggles Regional Peers checkbox when entity candidates exist and omits when none exist", () => {
    // 1. When candidates exist
    const mockSpecWithPeers = {
      spec_id: "spec_test_123",
      stat_vars: [{ ref: { dcid: "dcid_1", label: "Nominal GDP" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
      entity_options: [
        {
          options: [
            { value: { ref: { dcid: "country/UGA", label: "Uganda" } } },
            { value: { ref: { dcid: "country/TZA", label: "Tanzania" } } },
          ],
        },
      ],
    } as unknown as Spec;

    const { unmount } = render(
      <ExportHubModal onClose={vi.fn()} spec={mockSpecWithPeers} />
    );

    const peersCheckbox = screen.getByRole("checkbox", {
      name: /Include 2 regional peer countries/i,
    });
    expect(peersCheckbox).not.toBeChecked();

    fireEvent.click(peersCheckbox);
    expect(peersCheckbox).toBeChecked();

    // Check code snippet contains peer dcids
    expect(screen.getByText(/country\/UGA/)).toBeInTheDocument();
    unmount();

    // 2. When NO candidates exist, option is gracefully omitted
    const mockSpecWithoutPeers = {
      spec_id: "spec_test_123",
      stat_vars: [{ ref: { dcid: "dcid_1", label: "Nominal GDP" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
    } as unknown as Spec;

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpecWithoutPeers} />);
    expect(
      screen.queryByRole("checkbox", { name: /peer countr/i })
    ).not.toBeInTheDocument();
  });

  it("defaults to cURL snippet, allows switching to Python and R", () => {
    const onClose = vi.fn();
    const mockSpec = {
      spec_id: "spec_test_123",
      stat_vars: [{ ref: { dcid: "dcid_1", label: "Nominal GDP" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
    } as unknown as Spec;

    render(<ExportHubModal onClose={onClose} spec={mockSpec} />);

    // Defaults to cURL
    expect(
      screen.getByText(/curl -o "nominal-gdp_kenya_package\.zip"/)
    ).toBeInTheDocument();

    // Snippet switching to Python
    const pyBtn = screen.getByRole("button", { name: /^Python$/ });
    fireEvent.click(pyBtn);
    expect(screen.getByText(/import requests/)).toBeInTheDocument();

    // Snippet switching to R
    const rBtn = screen.getByRole("button", { name: /^R$/ });
    fireEvent.click(rBtn);
    expect(screen.getByText(/library\(httr\)/)).toBeInTheDocument();
  });

  it("handles download proxy trigger with custom filename when API returns downloadUrl", async () => {
    const mockSpec = {
      spec_id: "spec_123",
      definition: { schema_version: 1, spec_id: "spec_123" },
      stat_vars: [{ ref: { dcid: "v1", label: "Nominal gross domestic product per capita" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
      observations: {
        series: [
          {
            points: [
              { date: "2020", value: 100 },
              { date: "2021", value: 110 },
            ],
          },
        ],
      },
    } as unknown as Spec;

    const gcsUrl = "https://storage.googleapis.com/test/download.zip";

    let clickedDownload = "";
    let clickedHref = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
        clickedHref = this.href;
      }
    );

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/datasets") {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              artifacts: [{ url: gcsUrl }],
            }),
        });
      }
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });

    global.fetch = fetchMock;

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpec} />);

    const downloadBtn = screen.getByRole("button", {
      name: /Download dataset/i,
    });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/datasets",
        expect.objectContaining({
          body: expect.stringContaining('"kind":"statvar_set"'),
        })
      );
      expect(clickedDownload).toBe(
        "nominal-gross-domestic-product-per-capita_kenya_package.zip"
      );
      expect(clickedHref).toContain("/prototype/api/download?url=");
      expect(clickedHref).toContain(encodeURIComponent(gcsUrl));
      expect(clickedHref).toContain(
        `filename=${encodeURIComponent(
          "nominal-gross-domestic-product-per-capita_kenya_package.zip"
        )}`
      );
    });
  });

  it("handles Excel format with bundle selection properly", async () => {
    const mockSpec = {
      spec_id: "spec_123",
      stat_vars: [{ ref: { dcid: "v1", label: "GDP" } }],
      entities: [{ ref: { dcid: "country/KEN", label: "Kenya" } }],
    } as unknown as Spec;

    const gcsUrl = "https://storage.googleapis.com/test/package.zip";
    let capturedBody: any = null;

    const fetchMock = vi.fn().mockImplementation((url: string, opts: any) => {
      if (url === "/api/datasets") {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              artifacts: [{ url: gcsUrl }],
            }),
        });
      }
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });

    global.fetch = fetchMock;

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpec} />);

    // Select Excel format
    const xlsxBtn = screen.getByRole("button", { name: /Excel \(\.xlsx\)/i });
    fireEvent.click(xlsxBtn);

    const downloadBtn = screen.getByRole("button", {
      name: /Download dataset/i,
    });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(capturedBody).toEqual({
        schema_version: 1,
        input: {
          kind: "statvar_set",
          statvars: ["dcid:v1"],
          scope: {
            window: { kind: "all" },
            entities: { observationAbout: ["country/KEN"] },
          },
        },
        options: {
          format: "xlsx",
          bundle: true,
        },
      });
    });
  });

  it("handles client-side fallback download for raw CSV when API fails", async () => {
    const mockSpec = {
      spec_id: "spec_123",
      stat_vars: [{ ref: { label: "GDP" } }],
      entities: [{ ref: { label: "Kenya" } }],
      observations: {
        series: [
          {
            points: [{ date: "2020", value: 100 }],
          },
        ],
      },
    } as unknown as Spec;

    let clickedDownload = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
      }
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpec} />);

    // Uncheck bundle to test raw CSV fallback
    const bundleCheckbox = screen.getByRole("checkbox", {
      name: /include data dictionary/i,
    });
    fireEvent.click(bundleCheckbox);

    const downloadBtn = screen.getByRole("button", {
      name: /Download dataset/i,
    });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(clickedDownload).toBe("gdp_kenya.csv");
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("displays error banner with CSV fallback option when bundled export fails", async () => {
    const mockSpec = {
      spec_id: "spec_123",
      stat_vars: [{ ref: { label: "GDP" } }],
      entities: [{ ref: { label: "Kenya" } }],
      observations: {
        series: [
          {
            points: [{ date: "2020", value: 100 }],
          },
        ],
      },
    } as unknown as Spec;

    let clickedDownload = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        clickedDownload = this.download;
      }
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "Backend timeout" }),
    });

    render(<ExportHubModal onClose={vi.fn()} spec={mockSpec} />);

    const downloadBtn = screen.getByRole("button", {
      name: /Download dataset/i,
    });
    fireEvent.click(downloadBtn);

    // Error banner should be displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Server export failed \(Backend timeout\)/i)
      ).toBeInTheDocument();
    });

    // Clicking fallback button downloads CSV
    const fallbackBtn = screen.getByRole("button", {
      name: /Download basic CSV instead/i,
    });
    fireEvent.click(fallbackBtn);

    expect(clickedDownload).toBe("gdp_kenya.csv");
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(<ExportHubModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
