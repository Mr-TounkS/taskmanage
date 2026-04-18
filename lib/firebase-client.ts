/**
 * lib/firebase-client.ts
 * Initialisation du client Firebase pour les notifications FCM.
 *
 * Firebase Cloud Messaging (FCM) remplace le Web Push VAPID natif
 * car il utilise un chemin d'enregistrement différent (Firebase → FCM)
 * qui contourne les restrictions réseau liées à FCM direct.
 *
 * Section mémoire : 3.4 — Module actif de gestion des risques (notifications)
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton — évite de ré-initialiser Firebase à chaque import
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * Retourne l'instance Messaging Firebase.
 * Disponible uniquement côté client (window requis).
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  return getMessaging(app);
}
