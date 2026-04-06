/**
 * lib/firebase-admin.ts
 * Initialisation du SDK Firebase Admin pour l'envoi de notifications FCM côté serveur.
 *
 * Remplace lib/push-notifications.ts (web-push VAPID) par firebase-admin.
 * Le token FCM (stocké dans PushSubscription.endpoint) est utilisé pour cibler
 * chaque abonnement utilisateur.
 *
 * Variables d'environnement requises (serveur uniquement) :
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (avec \n échappés)
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques
 */

import * as admin from "firebase-admin";

// Singleton — évite la ré-initialisation entre les Server Actions / API Routes
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Les \n sont échappés dans les variables d'environnement Vercel
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const fcmAdmin = admin.messaging();
