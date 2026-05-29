/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Optimisation active en production, désactivée en dev pour la rapidité
    unoptimized: process.env.NODE_ENV !== 'production',
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Politique de base : tout vient de soi
              "default-src 'self'",
              // TradingView nécessite 'unsafe-eval' pour son widget JS
              "script-src 'self' 'unsafe-eval' https://s3.tradingview.com",
              // Styles inline tolérés (shadcn/ui, tailwind)
              "style-src 'self' 'unsafe-inline'",
              // WebSockets et fetch restreints aux brokers officiels uniquement
              // Empêche l'exfiltration de clés API si XSS
              "connect-src 'self' wss://*.bybit.com wss://stream.bybit.com wss://stream-testnet.bybit.com wss://*.derivws.com https://*.bybit.com https://api.bybit.com https://api-testnet.bybit.com",
              // Fonts Google (Geist)
              "font-src 'self' https://fonts.gstatic.com",
              // Images depuis soi-même et data: URIs
              "img-src 'self' data: https:",
              // Prévient le clickjacking — aucune frame externe autorisée
              "frame-ancestors 'none'",
              // TradingView widget iframe
              "frame-src https://www.tradingview.com",
            ].join('; '),
          },
          // Double protection anti-clickjacking (compatibilité navigateurs anciens)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Empêche le MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Force HTTPS pendant 2 ans, sous-domaines inclus
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Contrôle du Referer pour éviter les fuites d'URL
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Désactive les permissions navigateur non nécessaires
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
