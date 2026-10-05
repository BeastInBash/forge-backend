/*
  Warnings:

  - You are about to drop the `exercies` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `userId` on table `workout_plan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "exercies" DROP CONSTRAINT "exercies_workout_PlanId_fkey";

-- DropForeignKey
ALTER TABLE "workout_plan" DROP CONSTRAINT "workout_plan_userId_fkey";

-- AlterTable
ALTER TABLE "workout_plan" ALTER COLUMN "userId" SET NOT NULL;

-- DropTable
DROP TABLE "exercies";

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "exercise_name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "exercise_video" TEXT,
    "exercise_icon" TEXT,
    "createdById" TEXT,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercise" (
    "id" TEXT NOT NULL,
    "workout_PlanId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "repetition" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "workout_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_name_key_key" ON "exercise"("name_key");

-- CreateIndex
CREATE INDEX "exercise_createdById_idx" ON "exercise"("createdById");

-- CreateIndex
CREATE INDEX "workout_exercise_exerciseId_idx" ON "workout_exercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_exercise_workout_PlanId_exerciseId_key" ON "workout_exercise"("workout_PlanId", "exerciseId");

-- CreateIndex
CREATE INDEX "workout_plan_userId_idx" ON "workout_plan"("userId");

-- AddForeignKey
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_PlanId_fkey" FOREIGN KEY ("workout_PlanId") REFERENCES "workout_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
