/**
 * POST /api/push/subscribe
 * Enregistre le token FCM d'un utilisateur via RegisterPushSubscriptionUseCase.
 *
 * Corps attendu : { token: string, userEmail: string }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PrismaUserRepository } from "@/infrastructure/repositories/PrismaUserRepository";
import { PrismaSubscriptionRepository } from "@/infrastructure/repositories/PrismaSubscriptionRepository";
import { RegisterPushSubscriptionUseCase } from "@/application/use-cases/push/RegisterPushSubscriptionUseCase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userEmail?: string;
      endpoint?: string;
      p256dh?: string;
      auth?: string;
    };
    const { userEmail, endpoint, p256dh, auth } = body;

    if (!userEmail || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing fields: userEmail, endpoint, p256dh and auth required" },
        { status: 400 }
      );
    }

    const userRepo         = new PrismaUserRepository(prisma);
    const subscriptionRepo = new PrismaSubscriptionRepository(prisma);
    const useCase          = new RegisterPushSubscriptionUseCase(subscriptionRepo, userRepo);

    await useCase.execute({ userEmail, token: endpoint, p256dh, auth });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[Push Subscribe] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    const status  = message.includes("introuvable") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
