/*
  Warnings:

  - You are about to drop the column `symbol` on the `Orders` table. All the data in the column will be lost.
  - Added the required column `market_id` to the `Fills` table without a default value. This is not possible if the table is not empty.
  - Added the required column `market_id` to the `Orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slippage` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Fills" ADD COLUMN     "market_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "symbol",
ADD COLUMN     "market_id" TEXT NOT NULL,
ADD COLUMN     "slippage" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "imageUri" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);
