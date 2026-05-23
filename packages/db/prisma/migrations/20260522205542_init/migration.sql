-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Cancelled', 'PartiallyFilled', 'filled', 'Open');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('Bid', 'Ask');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('Market', 'Limit');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "type" "OrderType" NOT NULL,
    "qty" BIGINT NOT NULL,
    "price" BIGINT NOT NULL,
    "filledQty" BIGINT NOT NULL,
    "symbol" TEXT NOT NULL,
    "margin" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fills" (
    "id" TEXT NOT NULL,
    "makerId" TEXT NOT NULL,
    "takerId" TEXT NOT NULL,
    "filledqty" BIGINT NOT NULL,
    "makerOrderId" TEXT NOT NULL,
    "takerOrderId" TEXT NOT NULL,
    "price" TEXT NOT NULL,

    CONSTRAINT "Fills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Positions" (
    "id" TEXT NOT NULL,
    "entryPrice" BIGINT NOT NULL,
    "exitPrice" BIGINT NOT NULL,
    "pnl" BIGINT NOT NULL,
    "userId" TEXT NOT NULL,
    "initialMargin" TEXT NOT NULL,
    "fundingRate" TEXT NOT NULL,

    CONSTRAINT "Positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orders_userId_key" ON "Orders"("userId");

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_makerOrderId_fkey" FOREIGN KEY ("makerOrderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_takerOrderId_fkey" FOREIGN KEY ("takerOrderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fills" ADD CONSTRAINT "Fills_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
