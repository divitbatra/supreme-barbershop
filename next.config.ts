import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The booking route talks to Postgres through Prisma; keeping the engine out
  // of the bundle trace avoids Next trying to bundle native binaries.
  serverExternalPackages: ['@prisma/client', 'twilio'],
};

export default nextConfig;
