-- CreateEnum
CREATE TYPE "Fitness_Goal" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'MUSCLE_BUILDING');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "goal" "Fitness_Goal",
ADD COLUMN     "heightCm" DOUBLE PRECISION,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "weightKg" DOUBLE PRECISION;

