/** @type {import('next').NextConfig} */
// basePath/assetPrefix are only needed when deploying to GitHub Pages
// (repo is served under https://<user>.github.io/bikegallery_pujcovna/).
// For local development they must be empty so the app runs at http://localhost:3000/.
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.DEPLOY_TARGET === 'github-pages'

const nextConfig = {
  output: 'export',
  ...(isGithubPages
    ? {
        basePath: '/bikegallery_pujcovna',
        assetPrefix: '/bikegallery_pujcovna/',
      }
    : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

export default nextConfig