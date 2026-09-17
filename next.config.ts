import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// A stray lockfile above this directory makes Turbopack infer the wrong
// workspace root, which silently breaks module resolution. Pin it.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: projectRoot },
  // three ships untranspiled ESM; without this the production server build can
  // fail on `Unexpected token 'export'` even though dev is fine.
  transpilePackages: ['three'],
  // The booking route talks to Postgres through Prisma; keeping the engine out
  // of the bundle trace avoids Next trying to bundle native binaries.
  serverExternalPackages: ['@prisma/client', 'twilio'],
};

export default nextConfig;
