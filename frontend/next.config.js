/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.profcrm.com', 'r2.cloudflarestorage.com'],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard/admin',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/dashboard/admin/:path*',
        permanent: false,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: 'memory',
      };
    }

    return config;
  },
};
module.exports = nextConfig;
