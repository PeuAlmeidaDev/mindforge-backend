import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

/**
 * Interface para as recompensas de batalha
 */
interface BattleRewards {
  experience: number;
  levelUp?: boolean;
  attributePointsGained?: number;
}

/**
 * Calcula a quantidade de experiência necessária para avançar para o próximo nível
 */
export const calculateExperienceForNextLevel = (currentLevel: number): number => {
  // Fórmula para calcular experiência necessária para o próximo nível
  // Aqui usamos uma fórmula simples, mas pode ser ajustada conforme necessário
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
};

/**
 * Calcula a experiência ganha após vencer uma batalha
 */
export const calculateBattleExperience = (enemyLevels: number[], difficulty: string): number => {
  // Calcula a média do nível dos inimigos
  const averageEnemyLevel = enemyLevels.reduce((sum, level) => sum + level, 0) / enemyLevels.length;
  
  // Bônus de experiência baseado na dificuldade
  const difficultyMultiplier = difficulty === 'easy' ? 1 : 
                              difficulty === 'normal' ? 1.25 : 
                              difficulty === 'hard' ? 1.5 : 1;
  
  // Experiência base + modificador de nível e dificuldade
  return Math.floor(20 * averageEnemyLevel * difficultyMultiplier);
};

/**
 * Verifica se o usuário subiu de nível com a experiência ganha
 */
export const checkLevelUp = async (
  userId: string, 
  currentExp: number, 
  currentLevel: number, 
  expGained: number
): Promise<{newLevel: number, leveledUp: boolean, newAttributePoints: number}> => {
  let newLevel = currentLevel;
  let leveledUp = false;
  let newAttributePoints = 0;
  let totalExp = currentExp + expGained;
  
  // Verifica se o usuário ganhou algum nível
  while (totalExp >= calculateExperienceForNextLevel(newLevel)) {
    totalExp -= calculateExperienceForNextLevel(newLevel);
    newLevel++;
    leveledUp = true;
    newAttributePoints += 3; // 3 pontos de atributo por nível
  }
  
  return { newLevel, leveledUp, newAttributePoints };
};

/**
 * Processa recompensas após uma batalha vitoriosa
 */
export const processBattleRewards = async (
  userId: string,
  battleId: string
): Promise<BattleRewards> => {
  try {
    // Busca informações da batalha
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: {
            enemy: true,
            user: true
          }
        }
      }
    });

    // Verifica se a batalha existe e se foi concluída
    if (!battle || !battle.isFinished) {
      throw new Error('Batalha não finalizada ou não encontrada');
    }

    // Verifica se o usuário participou da batalha
    const userParticipant = battle.participants.find(p => p.userId === userId);
    if (!userParticipant) {
      throw new Error('Usuário não participou desta batalha');
    }

    // Verifica se o time do jogador foi o vencedor
    // Identifica o time do jogador
    const playerTeam = userParticipant.teamId;
    
    // Verifica se todos os inimigos foram derrotados (vida <= 0)
    const enemyTeam = battle.participants.find(p => p.userId !== userId && p.teamId !== playerTeam)?.teamId;
    const playerTeamWon = battle.participants.every(p => 
      p.teamId === playerTeam || p.currentHealth <= 0
    );
    
    // Se o jogador não venceu, não dá recompensa
    if (!playerTeamWon) {
      return { experience: 0 }; // Não ganha recompensa se não venceu
    }

    // Busca o usuário e suas informações atuais
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Extrai níveis dos inimigos (assumindo que eles possuem um nível baseado em seus atributos)
    const enemyLevels = battle.participants
      .filter(p => p.teamId !== playerTeam && p.enemy)
      .map(p => Math.max(1, Math.floor((
        p.enemy!.physicalAttack + 
        p.enemy!.specialAttack + 
        p.enemy!.physicalDefense + 
        p.enemy!.specialDefense + 
        p.enemy!.speed) / 20))); // Uma estimativa de nível baseada nos atributos
    
    // Define a dificuldade com base no número de inimigos
    const difficulty = enemyLevels.length <= 1 ? 'easy' : 
                      enemyLevels.length <= 2 ? 'normal' : 'hard';
                      
    // Calcula a experiência ganha
    const experienceGained = calculateBattleExperience(enemyLevels, difficulty);
    
    // Verifica se o usuário subiu de nível
    const { newLevel, leveledUp, newAttributePoints } = await checkLevelUp(
      userId,
      user.experience,
      user.level,
      experienceGained
    );
    
    // Atualiza o usuário com a experiência ganha e possível novo nível
    await prisma.user.update({
      where: { id: userId },
      data: {
        experience: user.experience + experienceGained - (leveledUp ? 
          calculateExperienceForNextLevel(user.level) : 0),
        level: newLevel,
        attributePointsToDistribute: {
          increment: newAttributePoints
        }
      }
    });
    
    // Retorna as recompensas processadas
    return {
      experience: experienceGained,
      levelUp: leveledUp,
      attributePointsGained: newAttributePoints
    };
  } catch (error) {
    console.error('Erro ao processar recompensas de batalha:', error);
    throw error;
  }
}; 