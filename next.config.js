/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle node module fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
      encoding: false,
      'pino-pretty': false,
    };

    // Ignore optional dependencies that cause warnings
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch\/lib\/index\.js/ },
      { module: /node_modules\/pino\/lib\/tools\.js/ },
    ];

    // Add externals for server-side
    if (!isServer) {
      config.externals.push('pino-pretty', 'encoding');
    }

    return config;
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
