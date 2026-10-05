// Origin of the dfo-apis service that /api/search and /api/datasets proxy to.
// Next.js resolves rewrites when it builds, so the value is baked into the
// image: the Docker build takes it as the DFO_APIS_BASE_URL build argument, and
// `next dev` reads it from the shell. A missing value fails the build, so an
// image can only proxy to the environment it was built for.
const apisBaseUrl = process.env.DFO_APIS_BASE_URL;
if (!apisBaseUrl) {
  throw new Error(
    "DFO_APIS_BASE_URL is not set. Set it to the dfo-apis origin, for example http://127.0.0.1:8083.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/prototype",
  output: "standalone",
  reactStrictMode: true,
  // @google/adk pulls dockerode/ssh2 and optional Cloud telemetry exporters through
  // its barrel export; those are native or dynamically required and cannot be
  // bundled. Keep it external so the standalone server requires it at runtime.
  serverExternalPackages: ["@google/adk"],
  // Container build context root is the repo; the app lives in a subdir.
  // Root at the app dir so the standalone tracer's COPY in the Dockerfile is self-contained.
  outputFileTracingRoot: import.meta.dirname,
  // Same-origin /api/search/* and /api/datasets/*: proxy to dfo-apis.
  // basePath:false because the search backend path is not under /prototype.
  rewrites: async () => [
    {
      source: "/api/search",
      destination: `${apisBaseUrl}/api/search`,
      basePath: false,
    },
    {
      source: "/api/search/:path*",
      destination: `${apisBaseUrl}/api/search/:path*`,
      basePath: false,
    },
    {
      source: "/api/datasets",
      destination: `${apisBaseUrl}/api/datasets`,
      basePath: false,
    },
    {
      source: "/api/datasets/:path*",
      destination: `${apisBaseUrl}/api/datasets/:path*`,
      basePath: false,
    },
  ],
};

export default nextConfig;
