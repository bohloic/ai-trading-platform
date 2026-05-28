# AI Trading Platform (V1)

## Prérequis
- Node.js + pnpm
- Postgres (recommandé: Neon pour Vercel)

## Configuration
Copie `.env.example` vers `.env` et remplis les valeurs.

Variables principales:
- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `BYBIT_API_KEY`, `BYBIT_API_SECRET`, `BYBIT_TESTNET`, `BYBIT_RECV_WINDOW_MS`
- `DERIV_APP_ID`, `DERIV_TOKEN`, `DERIV_ENV`
- `RISK_MAX_TRADE_PCT` (par défaut `0.02`)

## Base de données (migrations)
Une migration initiale est fournie dans `drizzle/0000_init.sql`.

Scripts:

```bash
pnpm db:generate
pnpm db:migrate
```

Sur Vercel, configure `DATABASE_URL` (Neon), puis exécute les migrations depuis ton poste/CI.

## Déploiement Vercel
1) Crée une base Postgres (Neon) et récupère `DATABASE_URL`.
2) Sur Vercel, configure les env vars de `.env.example`.
3) Déploie.

### Notes sur le temps réel
En production Vercel, le flux serveur `WS brokers -> SSE` est désactivé (connexions WebSocket long-running instables en serverless).

- Pour voir les marchés en temps réel: onglet **TradingView**.
- Pour du realtime broker fiable et/ou exécution continue: utilise un **worker long-running** ou une stratégie client-side.

## Sécurité
- Ne loggue jamais `BYBIT_API_SECRET` / `DERIV_TOKEN`.
- Le bouton **Arrêt d’urgence** désactive `autoTrade` et coupe toutes les connexions brokers côté app.

