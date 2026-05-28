import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'Missing environment variable DATABASE_URL — required by drizzle-kit.\n' +
    'Copy .env.example to .env and fill in your database connection string.'
  )
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
