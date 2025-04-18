-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "metadata" TEXT,
ALTER COLUMN "currentTurn" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
