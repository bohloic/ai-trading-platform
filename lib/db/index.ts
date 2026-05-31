import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Sécurité Runtime : Validation stricte de la variable d'environnement sur le serveur Vercel
if (!process.env.DATABASE_URL) {
  throw new Error("❌ Variable d'environnement manquante : DATABASE_URL n'est pas configurée dans Vercel.")
}

// 1. Initialisation unique du pool de connexions PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Nombre maximal de clients simultanés
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// 2. Initialisation de l'instance Drizzle ORM
export const db = drizzle(pool, { schema })

// 3. Fonctions d'encapsulation requises par le reste de votre codebase (Auth & Routes API)
export function getDb() {
  return db
}

export function getPool() {
  return pool
}