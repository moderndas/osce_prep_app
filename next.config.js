/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
    experimental: {
    esmExternals: 'loose'
  },
  // Next.js 13+ only: ensure the SDK gets run through Babel/Webpack
  // so directory imports get flattened at build time
  transpilePackages: ['@anam-ai/js-sdk']
};
// Force Next to transpile the Anam SDK so that its directory imports get flattened
module.exports = nextConfig;