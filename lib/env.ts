// import { z } from 'zod'

// const schema = z.object({
//   DATABASE_URL: z.string().min(1),
//   BETTER_AUTH_URL: z.string().url().optional(),
//   RISK_MAX_TRADE_PCT: z
//     .string()
//     .optional()
//     .transform((v) => (v ? Number(v) : 0.02))
//     .refine((v) => Number.isFinite(v) && v > 0 && v < 1, {
//       message: 'RISK_MAX_TRADE_PCT must be a number between 0 and 1',
//     }),
// })

// export type AppEnv = z.infer<typeof schema>

// export function getAppEnv(): AppEnv {
//   const parsed = schema.safeParse(process.env)
//   if (!parsed.success) {
//     throw new Error(`Invalid environment: ${parsed.error.message}`)
//   }
//   return parsed.data
// }

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),
  // Configuration Bybit issue des sources [2]
  BYBIT_API_KEY: z.string().min(1),
  BYBIT_API_SECRET: z.string().min(1),
  BYBIT_TESTNET: z.enum(["true", "false"]).transform((v) => v === "true"),
  RISK_MAX_TRADE_PCT: z.coerce.number().default(0.02),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse(process.env);