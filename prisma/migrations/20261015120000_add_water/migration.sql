-- CreateTable
CREATE TABLE "water_goal" (
    "userId" TEXT NOT NULL,
    "dailyGoalMl" INTEGER NOT NULL,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderStart" TEXT NOT NULL DEFAULT '08:00',
    "reminderEnd" TEXT NOT NULL DEFAULT '22:00',
    "reminderIntervalMin" INTEGER NOT NULL DEFAULT 120,
    "timezone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_goal_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "water_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMl" INTEGER NOT NULL,
    "drankAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "water_log_userId_drankAt_idx" ON "water_log"("userId", "drankAt");

-- AddForeignKey
ALTER TABLE "water_goal" ADD CONSTRAINT "water_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_log" ADD CONSTRAINT "water_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

