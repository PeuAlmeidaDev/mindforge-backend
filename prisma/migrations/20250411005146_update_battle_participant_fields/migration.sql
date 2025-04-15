/*
  Warnings:

  - You are about to drop the column `participantId` on the `BattleParticipant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[battleId,participantType,position]` on the table `BattleParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BattleParticipant" DROP CONSTRAINT "BattleParticipant_enemyId_fkey";

-- DropForeignKey
ALTER TABLE "BattleParticipant" DROP CONSTRAINT "BattleParticipant_userId_fkey";

-- DropIndex
DROP INDEX "BattleParticipant_battleId_participantType_participantId_key";

-- AlterTable
ALTER TABLE "BattleParticipant" DROP COLUMN "participantId",
ADD COLUMN     "enemyId" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_participantType_position_key" ON "BattleParticipant"("battleId", "participantType", "position");

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "Enemy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
