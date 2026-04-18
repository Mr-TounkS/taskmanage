/**
 * DELETE /api/push/unsubscribe
 * Supprime le token FCM Firebase d'un utilisateur.
 *
 * Corps attendu : { token: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { token?: string };
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "token requis" }, { status: 400 });
    }

    // Le token FCM est stocké dans le champ endpoint
    await prisma.pushSubscription.deleteMany({ where: { endpoint: token } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[FCM Unsubscribe] Erreur :", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
