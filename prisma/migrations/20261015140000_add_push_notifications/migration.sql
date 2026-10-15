-- AlterTable
ALTER TABLE "water_goal" ADD COLUMN     "lastReminderAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "push_token" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "push_ticket" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_token_userId_idx" ON "push_token"("userId");

-- CreateIndex
CREATE INDEX "push_ticket_createdAt_idx" ON "push_ticket"("createdAt");

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

