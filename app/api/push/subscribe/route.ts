/**
 * POST /api/push/subscribe
 * Sauvegarde le token FCM Firebase d'un utilisateur en base de données.
 *
 * Migration Web Push → Firebase FCM :
 * Le token FCM est stocké dans le champ `endpoint` (réutilisé).
 * Les champs `p256dh` et `auth` sont conservés vides pour compatibilité schéma.
 *
 * Corps attendu : { token: string, userEmail: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      token?: string;
      userEmail?: string;
    };

    const { token, userEmail } = body;

    if (!token || !userEmail) {
      return NextResponse.json(
        { error: "Champs manquants : token et userEmail requis" },
        { status: 400 }
      );
    }

    // Récupère l'utilisateur en base via son email
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Upsert : le token FCM est stocké dans le champ endpoint
    // p256dh et auth sont vides — non utilisés par Firebase FCM
    await prisma.pushSubscription.upsert({
      where:  { endpoint: token },
      create: { userId: user.id, endpoint: token, p256dh: "", auth: "" },
      update: { userId: user.id },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[FCM Subscribe] Erreur :", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
