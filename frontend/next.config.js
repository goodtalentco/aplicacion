/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode to avoid double renders and duplicated calls
  reactStrictMode: false,
  
  // Keep SWC enabled but without minification in dev
  swcMinify: false,
  
  // Minimal webpack optimizations - don't break core functionality
  webpack: (config, { dev }) => {
    if (dev) {
      // Only modify watch options, don't remove core plugins
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 1000, // Slower but not too slow
        ignored: /node_modules/,
      }
    }
    return config
  },
}

module.exports = nextConfig