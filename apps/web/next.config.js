import { execSync } from 'child_process';

const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
  },
  output: "standalone",
  transpilePackages: ["@repo/ui", "@repo/mock-data", "@repo/db"],
  serverExternalPackages: ["ssh2"],
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ["http://localhost:3100", "http://localhost:3101", "http://localhost:4000", "http://localhost:4001", "http://88.80.135.10:3100", "http://88.80.135.10:4000", "admin.asns.ro"],
  async headers() {
    return [
      {
        // Force revalidation on HTML pages (not static assets)
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
