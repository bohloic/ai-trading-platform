import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().optional(),
  RISK_MAX_TRADE_PCT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0.02))
    .refine((v) => Number.isFinite(v) && v > 0 && v < 1, {
      message: 'RISK_MAX_TRADE_PCT must be a number between 0 and 1',
    }),
})

export type AppEnv = z.infer<typeof schema>

export function getAppEnv(): AppEnv {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`)
  }
  return parsed.data
}

