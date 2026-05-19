/**
 * DELETE /api/push/unsubscribe
 * Supprime l'abonnement Web Push VAPID d'un utilisateur.
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
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[WebPush Unsubscribe] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
