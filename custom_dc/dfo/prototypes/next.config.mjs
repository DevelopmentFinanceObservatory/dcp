// Origin of the website that /api/search and /api/datasets proxy to. The
// website forwards both paths to dfo-apis with its own credentials, so this app
// reaches apis only through the website. A local dfo-apis engine also serves
// both paths.
// Next.js resolves rewrites when it builds, so the value is baked into the
// image: the Docker build takes it as the DFO_SITE_ORIGIN build argument, and
// `next dev` reads it from the shell. A missing value fails the build, so an
// image can only proxy to the environment it was built for.
const siteOrigin = process.env.DFO_SITE_ORIGIN;
if (!siteOrigin) {
  throw new Error(
    "DFO_SITE_ORIGIN is not set. Set it to the website origin, for example https://developmentfinance.org.",
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
  // Same-origin /api/search/* and /api/datasets/*: proxy to the website.
  // basePath:false because the search backend path is not under /prototype.
  rewrites: async () => [
    {
      source: "/api/search",
      destination: `${siteOrigin}/api/search`,
      basePath: false,
    },
    {
      source: "/api/search/:path*",
      destination: `${siteOrigin}/api/search/:path*`,
      basePath: false,
    },
    {
      source: "/api/datasets",
      destination: `${siteOrigin}/api/datasets`,
      basePath: false,
    },
    {
      source: "/api/datasets/:path*",
      destination: `${siteOrigin}/api/datasets/:path*`,
      basePath: false,
    },
  ],
};

export default nextConfig;
