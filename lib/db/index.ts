import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Lazy singletons — evaluated at first use, not at import time.
// This avoids crashing the build/CI when DATABASE_URL is not set.
let _pool: Pool | undefined
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('Missing environment variable: DATABASE_URL')
  return url
}

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: getDatabaseUrl() })
  }
  return _pool
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getPool(), { schema })
  }
  return _db
}

// Convenience re-exports — resolved lazily on first property access.
// Use getPool() / getDb() directly if you need the instance itself.
export { schema }

// For backward-compatibility with code that does `import { db } from '@/lib/db'`
// We export getter-based aliases so existing call sites don't need changes.
export const pool: Pool = new Proxy({} as Pool, {
  get(_t, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver)
  },
  apply(_t, _this, args) {
    return Reflect.apply(getPool() as unknown as (...a: unknown[]) => unknown, _this, args)
  },
})

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_t, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver)
    },
  }
)
