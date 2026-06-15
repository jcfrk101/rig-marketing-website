/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for the Cloud Run container.
  output: 'standalone',
}

export default nextConfig
