import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tradebridge/ui', '@tradebridge/types'],
};

export default nextConfig;
