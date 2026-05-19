/**
 * GET /__/firebase/init.json
 * Supprime le 404 que Firebase SDK génère en mode auto-config Firebase Hosting.
 * L'app n'est pas hébergée sur Firebase Hosting (elle est sur Vercel), donc
 * ce fichier n'existe pas. On retourne un objet vide pour stopper la requête.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({});
}
