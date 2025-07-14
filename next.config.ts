import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['remotion', '@remotion/player'],
};

export default nextConfig;