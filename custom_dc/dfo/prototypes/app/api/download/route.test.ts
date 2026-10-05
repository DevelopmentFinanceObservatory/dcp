// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("Download proxy API route (GET /api/download)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when url param is missing", async () => {
    const req = new NextRequest("http://localhost:3000/prototype/api/download");
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Missing url parameter");
  });

  it("returns 400 when url is not from storage.googleapis.com", async () => {
    const req = new NextRequest(
      "http://localhost:3000/prototype/api/download?url=https://evil.com/file.xlsx"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid download origin");
  });

  it("proxies artifact stream with custom Content-Disposition filename", async () => {
    const upstreamUrl =
      "https://storage.googleapis.com/test-bucket/spec_123.xlsx";
    const customFilename = "gdp_kenya.xlsx";

    const mockBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: mockBody,
      headers: new Headers({
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-length": "3",
      }),
    });

    const req = new NextRequest(
      `http://localhost:3000/prototype/api/download?url=${encodeURIComponent(
        upstreamUrl
      )}&filename=${encodeURIComponent(customFilename)}`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain(
      `filename="${customFilename}"`
    );
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(global.fetch).toHaveBeenCalledWith(upstreamUrl);
  });
});
