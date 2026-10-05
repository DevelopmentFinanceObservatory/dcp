import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const rawFilename = searchParams.get("filename") || "dataset";

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Security validation: only allow storage.googleapis.com
  try {
    const parsed = new URL(targetUrl);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith("storage.googleapis.com")
    ) {
      return new NextResponse("Invalid download origin", { status: 400 });
    }
  } catch {
    return new NextResponse("Malformed URL", { status: 400 });
  }

  // Sanitize filename for Content-Disposition header
  const sanitizedFilename = rawFilename
    .replace(/["\r\n\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_");

  try {
    const upstreamRes = await fetch(targetUrl);
    if (!upstreamRes.ok) {
      return new NextResponse("Failed to fetch upstream artifact", {
        status: upstreamRes.status,
      });
    }

    const contentType =
      upstreamRes.headers.get("content-type") || "application/octet-stream";

    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodeURIComponent(rawFilename)}`
    );
    headers.set("Content-Type", contentType);

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstreamRes.body, {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse("Download proxy error", { status: 502 });
  }
}
