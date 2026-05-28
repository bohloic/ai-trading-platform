import { z } from 'zod'

const schema = z.object({
  DERIV_APP_ID: z.string().min(1),
  DERIV_TOKEN: z.string().min(1),
  DERIV_ENV: z.enum(['demo', 'live']).optional().default('demo'),
})

export type DerivEnv = z.infer<typeof schema>

export function getDerivEnv(): DerivEnv {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid Deriv env: ${parsed.error.message}`)
  }
  return parsed.data
}

