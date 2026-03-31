/**
 * /api/tasks/[taskId]/status — Route REST pour la mise à jour du statut d'une tâche.
 *
 * Pourquoi cette route en plus de la Server Action updateTaskStatus ?
 * Les Server Actions Next.js utilisent un format POST interne non rejouable
 * par le Service Worker. Cette route REST standard peut être :
 *   1. Appelée directement par le KanbanBoard quand offline
 *   2. Stockée dans IndexedDB et rejouée par le SW via Background Sync
 *
 * Corps attendu : { status: "To Do" | "In Progress" | "Done" }
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PrismaTaskRepository } from "@/infrastructure/repositories/PrismaTaskRepository";
import { UpdateTaskStatusUseCase } from "@/application/use-cases/task/UpdateTaskStatusUseCase";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;

    const body = await request.json() as { status?: string };
    const { status } = body;

    if (!status || !["To Do", "In Progress", "Done"].includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide. Valeurs acceptées : To Do, In Progress, Done" },
        { status: 400 }
      );
    }

    const taskRepo = new PrismaTaskRepository(prisma);
    const useCase = new UpdateTaskStatusUseCase(taskRepo);
    const updatedTask = await useCase.execute(taskId, status);

    return NextResponse.json({ success: true, task: updatedTask }, { status: 200 });
  } catch (error) {
    console.error("[API] Erreur mise à jour statut tâche :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
