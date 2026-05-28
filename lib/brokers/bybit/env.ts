import { z } from 'zod'

const schema = z.object({
  BYBIT_API_KEY: z.string().min(1),
  BYBIT_API_SECRET: z.string().min(1),
  BYBIT_TESTNET: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  BYBIT_RECV_WINDOW_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 5000))
    .refine((v) => Number.isFinite(v) && v >= 1000 && v <= 20000, {
      message: 'BYBIT_RECV_WINDOW_MS must be between 1000 and 20000',
    }),
})

export type BybitEnv = z.infer<typeof schema>

export function getBybitEnv(): BybitEnv {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    // Do not include secrets in errors; zod will only mention keys/shape.
    throw new Error(`Invalid Bybit env: ${parsed.error.message}`)
  }
  return parsed.data
}

