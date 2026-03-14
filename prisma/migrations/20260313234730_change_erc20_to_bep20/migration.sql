/*
  Warnings:

  - The values [ERC20] on the enum `CryptoNetwork` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `SuccessStory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cardBrand,cardCountry,cardType]` on the table `CardRate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "CryptoExchange" ADD VALUE 'NOONES';

-- AlterEnum
BEGIN;
CREATE TYPE "CryptoNetwork_new" AS ENUM ('TRC20', 'BEP20', 'BTC_MAINNET');
ALTER TABLE "Trade" ALTER COLUMN "cryptoNetwork" TYPE "CryptoNetwork_new" USING ("cryptoNetwork"::text::"CryptoNetwork_new");
ALTER TYPE "CryptoNetwork" RENAME TO "CryptoNetwork_old";
ALTER TYPE "CryptoNetwork_new" RENAME TO "CryptoNetwork";
DROP TYPE "CryptoNetwork_old";
COMMIT;

-- DropIndex
DROP INDEX "CardRate_cardBrand_cardCountry_key";

-- AlterTable
ALTER TABLE "CardRate" ADD COLUMN     "cardType" TEXT NOT NULL DEFAULT 'Physical';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "cryptoServiceFee" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "usdtExchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 15.0;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "payoutAccountName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light';

-- DropTable
DROP TABLE "SuccessStory";

-- CreateTable
CREATE TABLE "StatusUpdate" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT,
    "message" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardRate_cardBrand_cardCountry_cardType_key" ON "CardRate"("cardBrand", "cardCountry", "cardType");
