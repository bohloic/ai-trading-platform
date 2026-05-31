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

              // CORRECTION TRADINGVIEW : Ajout de 'unsafe-inline' requis pour l'exécution des scripts de widgets
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://s3.tradingview.com https://*.tradingview.com",

              // Styles inline tolérés (shadcn/ui, tailwind)
              "style-src 'self' 'unsafe-inline'",

              // CORRECTION WEBSOCKET BACKEND : Ajout de votre URL Hugging Face (https et wss) pour autoriser la liaison de l'IA
              "connect-src 'self' wss://*.bybit.com wss://stream.bybit.com wss://stream-testnet.bybit.com wss://*.derivws.com https://*.bybit.com https://api.bybit.com https://api-testnet.bybit.com wss://kemma23-ai-trading-backend.hf.space https://kemma23-ai-trading-backend.hf.space wss://spaces.huggingface.tech https://*.tradingview.com",

              // Fonts Google (Geist)
              "font-src 'self' https://fonts.gstatic.com",

              // Images depuis soi-même et data: URIs
              "img-src 'self' data: https:",

              // Prévient le clickjacking — aucune frame externe autorisée
              "frame-ancestors 'none'",

              // TradingView widget iframe (Autorisation des sous-domaines CDN de TradingView)
              "frame-src https://www.tradingview.com https://*.tradingview.com",
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