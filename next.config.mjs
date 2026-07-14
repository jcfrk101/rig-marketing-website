/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for the Cloud Run container.
  output: 'standalone',
  async redirects() {
    return [
      // Mechanic join flow — /join is the stable inbound URL (the SEO
      // directory site links to it). Points at /shops until the dedicated
      // signup flow ships; flip only this entry when it does.
      { source: '/join', destination: '/shops', permanent: false },
      // The directory site links to /fleets for the fleet product.
      { source: '/fleets', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
