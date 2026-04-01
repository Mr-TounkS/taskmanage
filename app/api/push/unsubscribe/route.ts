/**
 * DELETE /api/push/unsubscribe
 * Supprime l'abonnement push d'un utilisateur (désactivation manuelle ou expiration).
 *
 * Corps attendu : { endpoint: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { endpoint?: string };
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint requis" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Push Unsubscribe] Erreur :", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
