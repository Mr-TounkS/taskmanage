/**
 * POST /api/push/subscribe
 * Sauvegarde l'abonnement push d'un utilisateur en base de données.
 *
 * Corps attendu :
 *   { endpoint: string, p256dh: string, auth: string, userEmail: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
      userEmail?: string;
    };

    const { endpoint, p256dh, auth, userEmail } = body;

    if (!endpoint || !p256dh || !auth || !userEmail) {
      return NextResponse.json(
        { error: "Champs manquants : endpoint, p256dh, auth, userEmail requis" },
        { status: 400 }
      );
    }

    // Récupère l'utilisateur en base via son email
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Upsert : évite les doublons si l'utilisateur réabonne le même navigateur
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth },
      update: { p256dh, auth },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[Push Subscribe] Erreur :", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
