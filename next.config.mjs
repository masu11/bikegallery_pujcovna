/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/bikegallery_pujcovna',
  assetPrefix: '/bikegallery_pujcovna/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig