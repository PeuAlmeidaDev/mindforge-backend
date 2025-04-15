/*
  Warnings:

  - A unique constraint covering the columns `[battleId,participantType,participantId]` on the table `BattleParticipant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BattleParticipant" DROP CONSTRAINT "BattleParticipant_enemyId_fkey";

-- DropForeignKey
ALTER TABLE "BattleParticipant" DROP CONSTRAINT "BattleParticipant_userId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_participantType_participantId_key" ON "BattleParticipant"("battleId", "participantType", "participantId");

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_enemyId_fkey" FOREIGN KEY ("participantId") REFERENCES "Enemy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
