import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Sécurité Runtime : Validation stricte de la variable d'environnement sur le serveur Vercel
if (!process.env.DATABASE_URL) {
  throw new Error("❌ Variable d'environnement manquante : DATABASE_URL n'est pas configurée dans Vercel.")
}

// Configuration du pool de connexions persistant PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Nombre maximal de clients simultanés
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Initialisation de l'instance de base de données Drizzle ORM avec votre schéma applicatif
export const db = drizzle(pool, { schema })