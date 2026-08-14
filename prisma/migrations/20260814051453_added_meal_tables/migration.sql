-- AlterTable
ALTER TABLE "exercies" ADD COLUMN     "exercise_icon" TEXT,
ADD COLUMN     "exercise_video" TEXT;

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "food_image" TEXT,
    "food_name" TEXT NOT NULL,
    "calorie_value" TEXT NOT NULL,
    "meal_TimeId" TEXT,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nutrition_qunatity" TEXT NOT NULL,
    "food_ItemsId" TEXT,

    CONSTRAINT "nutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal_Time" (
    "id" TEXT NOT NULL,
    "time_name" TEXT NOT NULL,

    CONSTRAINT "Meal_Time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diet" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Diet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_meal_TimeId_fkey" FOREIGN KEY ("meal_TimeId") REFERENCES "Meal_Time"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition" ADD CONSTRAINT "nutrition_food_ItemsId_fkey" FOREIGN KEY ("food_ItemsId") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
