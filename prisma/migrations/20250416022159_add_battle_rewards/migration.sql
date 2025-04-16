-- CreateTable
CREATE TABLE "BattleReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "experienceGained" INTEGER NOT NULL,
    "leveledUp" BOOLEAN NOT NULL DEFAULT false,
    "attributePointsGained" INTEGER NOT NULL DEFAULT 0,
    "rewardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleReward_userId_battleId_key" ON "BattleReward"("userId", "battleId");
