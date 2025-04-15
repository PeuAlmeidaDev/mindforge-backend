/*
  Warnings:

  - You are about to drop the column `interestId` on the `Goal` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_interestId_fkey";

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "interestId";

-- CreateTable
CREATE TABLE "GoalInterest" (
    "goalId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalInterest_pkey" PRIMARY KEY ("goalId","interestId")
);

-- AddForeignKey
ALTER TABLE "GoalInterest" ADD CONSTRAINT "GoalInterest_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalInterest" ADD CONSTRAINT "GoalInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
