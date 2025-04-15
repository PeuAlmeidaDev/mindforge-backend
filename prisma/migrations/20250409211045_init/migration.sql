-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "bannerUrl" TEXT,
    "houseId" TEXT NOT NULL,
    "primaryElementalType" TEXT NOT NULL,
    "secondaryElementalType" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "attributePointsToDistribute" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAttributes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "health" INTEGER NOT NULL DEFAULT 100,
    "physicalAttack" INTEGER NOT NULL DEFAULT 10,
    "specialAttack" INTEGER NOT NULL DEFAULT 10,
    "physicalDefense" INTEGER NOT NULL DEFAULT 10,
    "specialDefense" INTEGER NOT NULL DEFAULT 10,
    "speed" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "UserAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "userId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("userId","interestId")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "elementalType" TEXT NOT NULL,
    "baseDamage" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "isAoe" BOOLEAN NOT NULL DEFAULT false,
    "targetType" TEXT NOT NULL,
    "buffType" TEXT,
    "debuffType" TEXT,
    "statusEffect" TEXT,
    "statusEffectChance" INTEGER,
    "statusEffectDuration" INTEGER,
    "buffValue" INTEGER,
    "debuffValue" INTEGER,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardHealth" INTEGER NOT NULL DEFAULT 0,
    "rewardPhysicalAttack" INTEGER NOT NULL DEFAULT 0,
    "rewardSpecialAttack" INTEGER NOT NULL DEFAULT 0,
    "rewardPhysicalDefense" INTEGER NOT NULL DEFAULT 0,
    "rewardSpecialDefense" INTEGER NOT NULL DEFAULT 0,
    "rewardSpeed" INTEGER NOT NULL DEFAULT 0,
    "hasSkillChance" BOOLEAN NOT NULL DEFAULT false,
    "skillUnlockChance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dateAssigned" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDailyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visualTheme" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "elementalType" TEXT NOT NULL,
    "health" INTEGER NOT NULL,
    "physicalAttack" INTEGER NOT NULL,
    "specialAttack" INTEGER NOT NULL,
    "physicalDefense" INTEGER NOT NULL,
    "specialDefense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,

    CONSTRAINT "Enemy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnemySkill" (
    "enemyId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "EnemySkill_pkey" PRIMARY KEY ("enemyId","skillId")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "participantType" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "currentHealth" INTEGER NOT NULL,
    "currentPhysicalAttack" INTEGER NOT NULL,
    "currentSpecialAttack" INTEGER NOT NULL,
    "currentPhysicalDefense" INTEGER NOT NULL,
    "currentSpecialDefense" INTEGER NOT NULL,
    "currentSpeed" INTEGER NOT NULL,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleStatusEffect" (
    "id" TEXT NOT NULL,
    "battleParticipantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "remainingTurns" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "BattleStatusEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleBuff" (
    "id" TEXT NOT NULL,
    "battleParticipantId" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "remainingTurns" INTEGER NOT NULL,
    "stackCount" INTEGER NOT NULL,

    CONSTRAINT "BattleBuff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleDebuff" (
    "id" TEXT NOT NULL,
    "battleParticipantId" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "remainingTurns" INTEGER NOT NULL,
    "stackCount" INTEGER NOT NULL,

    CONSTRAINT "BattleDebuff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAttributes_userId_key" ON "UserAttributes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_name_key" ON "Interest"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "House_name_key" ON "House"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAttributes" ADD CONSTRAINT "UserAttributes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyGoal" ADD CONSTRAINT "UserDailyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyGoal" ADD CONSTRAINT "UserDailyGoal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnemySkill" ADD CONSTRAINT "EnemySkill_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "Enemy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnemySkill" ADD CONSTRAINT "EnemySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_enemyId_fkey" FOREIGN KEY ("participantId") REFERENCES "Enemy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleStatusEffect" ADD CONSTRAINT "BattleStatusEffect_battleParticipantId_fkey" FOREIGN KEY ("battleParticipantId") REFERENCES "BattleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleBuff" ADD CONSTRAINT "BattleBuff_battleParticipantId_fkey" FOREIGN KEY ("battleParticipantId") REFERENCES "BattleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleDebuff" ADD CONSTRAINT "BattleDebuff_battleParticipantId_fkey" FOREIGN KEY ("battleParticipantId") REFERENCES "BattleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
