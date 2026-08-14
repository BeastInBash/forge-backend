/*
  Warnings:

  - You are about to drop the `Exercise` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Workout_Plan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_workout_PlanId_fkey";

-- DropForeignKey
ALTER TABLE "Workout_Plan" DROP CONSTRAINT "Workout_Plan_userId_fkey";

-- DropTable
DROP TABLE "Exercise";

-- DropTable
DROP TABLE "Workout_Plan";

-- CreateTable
CREATE TABLE "workout_plan" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "workout_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercies" (
    "id" TEXT NOT NULL,
    "workout_PlanId" TEXT,
    "exercise_name" TEXT NOT NULL,
    "repetition" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,

    CONSTRAINT "exercies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_id_key" ON "workout_plan"("id");

-- AddForeignKey
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercies" ADD CONSTRAINT "exercies_workout_PlanId_fkey" FOREIGN KEY ("workout_PlanId") REFERENCES "workout_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
