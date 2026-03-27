-- AlterTable
ALTER TABLE "Task" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "startedAt" DATETIME;

-- CreateTable
CREATE TABLE "ColumnWIPConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "wipLimit" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ColumnWIPConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnWIPConfig_projectId_column_key" ON "ColumnWIPConfig"("projectId", "column");
