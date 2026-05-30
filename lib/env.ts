import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),

  // Configuration Bybit avec transformation de types
  BYBIT_API_KEY: z.string().min(1),
  BYBIT_API_SECRET: z.string().min(1),
  BYBIT_TESTNET: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  BYBIT_RECV_WINDOW_MS: z.coerce.number().int().default(5000),

  // Configuration Deriv
  DERIV_APP_ID: z.string().min(1),
  DERIV_TOKEN: z.string().min(1),
  DERIV_ENV: z.enum(['demo', 'live']).default('demo'),

  // Paramètres de Risque — Hard cap à 5% pour sécurité
  RISK_MAX_TRADE_PCT: z.coerce.number().min(0).max(0.05).default(0.02),
})

export type Env = z.infer<typeof envSchema>

// Validation au démarrage — une seule lecture de process.env, résultat figé en singleton
const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format())
  throw new Error('Invalid environment variables — see details above.')
}

/**
 * Singleton immuable des variables d'environnement validées.
 * Utilisez `env.BYBIT_API_KEY`, `env.DATABASE_URL`, etc.
 */
export const env = Object.freeze(_env.data)

