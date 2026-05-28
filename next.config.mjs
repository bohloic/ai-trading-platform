/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Disable Next.js image optimisation only in development or when explicitly
    // requested (e.g. static export). In production the optimiser is kept on
    // so images are served efficiently via the built-in Image Optimization API.
    unoptimized: process.env.NODE_ENV !== 'production',
  },
}

export default nextConfig
