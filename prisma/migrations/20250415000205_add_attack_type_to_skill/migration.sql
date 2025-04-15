/*
  Warnings:

  - Added the required column `attackType` to the `Skill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Adiciona a coluna attackType como nullable inicialmente
ALTER TABLE "Skill" ADD COLUMN "attackType" TEXT;

-- Atualiza as skills existentes com valores adequados
-- Terremoto (physical)
UPDATE "Skill" SET "attackType" = 'physical' WHERE id = 'b3d47b21-2dc1-40b7-8ba8-ac1ded288df0';

-- Jato d'Água (magical)
UPDATE "Skill" SET "attackType" = 'magical' WHERE id = 'cfab25e6-ec72-464b-b750-6064b598cc9e';

-- Investida (physical)
UPDATE "Skill" SET "attackType" = 'physical' WHERE id = 'a62615e0-bf52-4721-8b74-254402f1b421';

-- Bola de Fogo (magical)
UPDATE "Skill" SET "attackType" = 'magical' WHERE id = '3c594dbb-abe8-48fe-beb6-6b95c370aa99';

-- Torna a coluna attackType não nullable após os dados serem atualizados
ALTER TABLE "Skill" ALTER COLUMN "attackType" SET NOT NULL;
