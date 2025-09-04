/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: false,
  
  // Disable ESLint and TypeScript during build for now
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Use export for static site generation on Netlify
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Disable SWC completely
  swcMinify: false,
  compiler: {
    // Disable SWC transforms
    styledComponents: false,
    emotion: false,
  },
  
  // Minimal experimental config
  experimental: {
    esmExternals: false,
    forceSwcTransforms: false
  },
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      // Add redirects here if needed
    ];
  },
  
  // Rewrites
  async rewrites() {
    return [
      // Add rewrites here if needed
    ];
  },
};

module.exports = nextConfig;