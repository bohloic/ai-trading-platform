import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Dashboard } from '@/components/dashboard'

export const runtime = 'nodejs'

export default async function HomePage() {
  // 1. Récupération sécurisée de la session sur le serveur PostgreSQL
  const session = await auth.api.getSession({
    headers: await headers()
  })

  // 2. Redirection vers la page d'authentification si l'utilisateur n'est pas connecté
  if (!session?.user) {
    redirect('/sign-in')
  }

  // 3. Transmission sécurisée des données utilisateur au Dashboard (Composant Client)
  return <Dashboard user={session.user} />
}