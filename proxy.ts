import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes accessibles sans authentification
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/offline',
  '/api/webhooks/(.*)', // Webhooks GitHub — appelés par des services externes, pas par des utilisateurs
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Exclut : fichiers Next.js internes, fichiers statiques, et fichiers PWA
    // json exclu ici (manifest.json) — les routes API JSON sont couvertes par le 2e pattern
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json|txt)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}