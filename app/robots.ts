import type { MetadataRoute } from 'next'

// Testovací provoz: zabrání vyhledávačům procházení stránek.
// Poznámka: robots.txt zabrání procházení, ale NEodstraní už indexované stránky –
// proto je v layout.tsx nastavené i <meta name="robots" content="noindex, nofollow">.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}