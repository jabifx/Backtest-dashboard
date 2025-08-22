import { NextConfig } from 'next'

/** @type {NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['http://127.0.0.1:3000'],
  },
  output: 'standalone',
  distDir: '.next',
}

export default nextConfig
