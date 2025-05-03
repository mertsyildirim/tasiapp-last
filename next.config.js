/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'graph.facebook.com'],
  },
  experimental: {
    esmExternals: "loose",
    serverComponentsExternalPackages: ["mongoose", "mongodb"],
    layers: true
  },
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    
    config.experiments = {
      topLevelAwait: true,
      layers: true
    };
    
    // MongoDB ve ilgili modülleri istemci tarafında yüklemeyi engelle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        mongodb: false,
        'gcp-metadata': false
      };
    }
    
    return config
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig 