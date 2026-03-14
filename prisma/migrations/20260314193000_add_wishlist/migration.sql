-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "typeLine" TEXT NOT NULL,
    "colorIdentity" TEXT[] NOT NULL,
    "imageUrl" TEXT,
    "scryfallUri" TEXT,
    "cmc" DOUBLE PRECISION,
    "usd" TEXT,
    "usdFoil" TEXT,
    "eur" TEXT,
    "tix" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_cardId_key" ON "WishlistItem"("userId", "cardId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_addedAt_idx" ON "WishlistItem"("userId", "addedAt");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
