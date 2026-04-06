/**
 * POST /api/push/test
 * Route de test uniquement — envoie une notification à TOUS les tokens en base.
 * À supprimer avant la mise en production finale.
 *
 * Corps attendu : { title: string, body: string, url?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushToSubscriptions } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  // Sécurité minimale : désactiver en production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Désactivé en production" }, { status: 403 });
  }

  try {
    const body = await req.json() as {
      title?: string;
      body?: string;
      url?: string;
    };

    const title = body.title ?? "🔴 Test SGR";
    const message = body.body ?? "Alerte de risque détectée !";
    const url = body.url ?? "/";

    // Récupère tous les tokens FCM en base
    const subscriptions = await prisma.pushSubscription.findMany({
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "Aucun token FCM en base — abonne-toi d'abord" },
        { status: 404 }
      );
    }

    // Envoie la notification à tous les tokens
    const expiredTokens = await sendPushToSubscriptions(subscriptions, {
      title,
      body: message,
      url,
    });

    // Supprime les tokens expirés
    if (expiredTokens.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredTokens } },
      });
    }

    return NextResponse.json({
      success: true,
      sent: subscriptions.length - expiredTokens.length,
      expired: expiredTokens.length,
    });
  } catch (error) {
    console.error("[FCM Test] Erreur :", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
