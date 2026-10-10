
-- CreateTable
CREATE TABLE "meal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealTime" TEXT NOT NULL,
    "eatenAt" TIMESTAMP(3) NOT NULL,
    "aiModel" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_item" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "food" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "state" TEXT,
    "assumption" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "per100g" JSONB NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "meal_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_userId_eatenAt_idx" ON "meal"("userId", "eatenAt");

-- CreateIndex
CREATE INDEX "meal_item_mealId_idx" ON "meal_item"("mealId");

-- AddForeignKey
ALTER TABLE "meal" ADD CONSTRAINT "meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

