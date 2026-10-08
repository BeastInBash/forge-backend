-- CreateTable
CREATE TABLE "lift_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lift_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lift_set" (
    "id" TEXT NOT NULL,
    "liftLogId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "reps" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "lift_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lift_log_userId_exerciseId_performedAt_idx" ON "lift_log"("userId", "exerciseId", "performedAt");

-- CreateIndex
CREATE INDEX "lift_set_liftLogId_idx" ON "lift_set"("liftLogId");

-- AddForeignKey
ALTER TABLE "lift_log" ADD CONSTRAINT "lift_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_log" ADD CONSTRAINT "lift_log_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lift_set" ADD CONSTRAINT "lift_set_liftLogId_fkey" FOREIGN KEY ("liftLogId") REFERENCES "lift_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
