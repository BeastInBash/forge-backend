-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "primary_muscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondary_muscles" TEXT[] DEFAULT ARRAY[]::TEXT[];
