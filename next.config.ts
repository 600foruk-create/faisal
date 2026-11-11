import type { NextConfig } from 'next';

const isStaticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        pageExtensions: ['tsx', 'jsx'],
      }
    : {
        serverExternalPackages: ['node:sqlite'],
      }),
};

export default nextConfig;
