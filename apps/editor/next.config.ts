import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@remotion/player'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;