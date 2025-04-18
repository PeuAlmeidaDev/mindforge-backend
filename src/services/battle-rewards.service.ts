import { PrismaClient, Battle } from '@prisma/client';
import { BattleRewardsRepository } from '../repositories/battle-rewards.repository';

// Definição local da interface de recompensas
export interface BattleRewards {
  experience: number;
  levelUp?: boolean;
  attributePointsGained?: number;
}

// Instância do repositório de recompensas
const battleRewardsRepository = new BattleRewardsRepository();

/**
 * Calcula a quantidade de experiência necessária para avançar para o próximo nível
 */
export const calculateExperienceForNextLevel = (currentLevel: number): number => {
  return battleRewardsRepository.calculateExperienceForNextLevel(currentLevel);
};

/**
 * Calcula a experiência ganha após vencer uma batalha
 */
export const calculateBattleExperience = (enemyLevels: number[], difficulty: string): number => {
  return battleRewardsRepository.calculateBattleExperience(enemyLevels, difficulty);
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
  const result = battleRewardsRepository.checkLevelUp(currentLevel, currentExp, expGained);
  return {
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
    newAttributePoints: result.newAttributePoints
  };
};

/**
 * Processa recompensas após uma batalha vitoriosa
 */
export const processBattleRewards = async (
  userId: string,
  battleId: string
): Promise<BattleRewards> => {
  try {
    // Validar os parâmetros de entrada
    if (!userId || !battleId) {
      console.error(`Parâmetros inválidos: userId=${userId}, battleId=${battleId}`);
      throw new Error('Parâmetros inválidos');
    }
    
    console.log(`Processando recompensas para: userId=${userId}, battleId=${battleId}`);
    
    // Verificar se o usuário já recebeu recompensas por esta batalha
    const alreadyRewarded = await battleRewardsRepository.hasReceivedReward(userId, battleId);
    if (alreadyRewarded) {
      console.log(`Usuário ${userId} já recebeu recompensas pela batalha ${battleId}`);
      throw new Error('Você já recebeu recompensas por esta batalha');
    }
    
    // Busca informações da batalha usando o repositório
    const battle = await battleRewardsRepository.findBattleWithParticipants(battleId);

    console.log(`Resultado da busca da batalha:`, battle ? 'Batalha encontrada' : 'Batalha não encontrada');

    if (!battle) {
      console.error(`Batalha com ID ${battleId} não encontrada no banco de dados`);
      throw new Error(`Batalha com ID ${battleId} não encontrada`);
    }
    
    // Asserção de tipo para garantir que o TypeScript reconheça as propriedades adicionais
    const battleWithParticipants = battle as Battle & { 
      participants: Array<{
        userId?: string;
        teamId: string;
        currentHealth: number;
        participantType: string;
        enemy?: any;
      }> 
    };
    
    console.log(`Participantes na batalha: ${battleWithParticipants.participants.length}`);
    
    // Verificar se a batalha foi concluída
    if (!battle.isFinished) {
      throw new Error('Batalha não finalizada');
    }

    // Verificar se o usuário participou da batalha - modificando para ser mais flexível
    // Primeiro verificamos se tem um participante exato com userId
    const userParticipant = battleWithParticipants.participants.find(p => p.userId === userId);
    
    // Se não encontrou como participante direto, verificamos se o usuário é do tipo 'user' e se é o único jogador humano
    if (!userParticipant) {
      const humanParticipants = battleWithParticipants.participants.filter(p => p.participantType === 'user');
      console.log(`Participantes humanos na batalha: ${humanParticipants.length}`);
      
      // Se há apenas um jogador humano, consideramos que este jogador é o usuário atual
      if (humanParticipants.length === 1) {
        console.log(`Assumindo que o único jogador humano é o usuário atual ${userId}`);
        // Usamos o primeiro (e único) participante humano como o participante do usuário
        const playerTeam = humanParticipants[0].teamId;
        
        // Verifica se todos os inimigos foram derrotados (vida <= 0)
        const playerTeamWon = battleWithParticipants.participants.every(p => 
          p.teamId === playerTeam || p.currentHealth <= 0
        );
        
        // Se o jogador não venceu, não dá recompensa
        if (!playerTeamWon) {
          throw new Error('Você não pode receber recompensas por uma batalha que não venceu');
        }
        
        // Busca o usuário e suas informações atuais
        const user = await battleRewardsRepository.findUserWithExperience(userId);

        if (!user) {
          throw new Error('Usuário não encontrado');
        }

        // Extrai níveis dos inimigos (assumindo que eles possuem um nível baseado em seus atributos)
        const enemyLevels = battleWithParticipants.participants
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
        const experienceGained = battleRewardsRepository.calculateBattleExperience(enemyLevels, difficulty);
        
        // Verifica se o usuário subiu de nível
        const { newLevel, leveledUp, newAttributePoints, newExp } = battleRewardsRepository.checkLevelUp(
          user.level,
          user.experience,
          experienceGained
        );
        
        // Atualiza o usuário com a experiência ganha e possível novo nível
        await battleRewardsRepository.updateUserExperience(
          userId,
          newLevel,
          newExp,
          newAttributePoints
        );
        
        // Registra que o usuário recebeu recompensas por esta batalha
        await battleRewardsRepository.registerRewardReceived(
          userId,
          battleId,
          experienceGained,
          leveledUp,
          newAttributePoints
        );
        
        // Retorna as recompensas processadas
        return {
          experience: experienceGained,
          levelUp: leveledUp,
          attributePointsGained: newAttributePoints
        };
      } else {
        console.error(`Usuário ${userId} não encontrado entre os participantes da batalha`);
        throw new Error('Usuário não participou desta batalha');
      }
    }

    // Verifica se o time do jogador foi o vencedor
    // Identifica o time do jogador
    const playerTeam = userParticipant.teamId;
    
    // Verifica se todos os inimigos foram derrotados (vida <= 0)
    const enemyTeam = battleWithParticipants.participants.find(p => p.userId !== userId && p.teamId !== playerTeam)?.teamId;
    const playerTeamWon = battleWithParticipants.participants.every(p => 
      p.teamId === playerTeam || p.currentHealth <= 0
    );
    
    // Se o jogador não venceu, não dá recompensa
    if (!playerTeamWon) {
      throw new Error('Você não pode receber recompensas por uma batalha que não venceu');
    }

    // Busca o usuário e suas informações atuais
    const user = await battleRewardsRepository.findUserWithExperience(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Extrai níveis dos inimigos (assumindo que eles possuem um nível baseado em seus atributos)
    const enemyLevels = battleWithParticipants.participants
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
    const experienceGained = battleRewardsRepository.calculateBattleExperience(enemyLevels, difficulty);
    
    // Verifica se o usuário subiu de nível
    const { newLevel, leveledUp, newAttributePoints, newExp } = battleRewardsRepository.checkLevelUp(
      user.level,
      user.experience,
      experienceGained
    );
    
    // Atualiza o usuário com a experiência ganha e possível novo nível
    await battleRewardsRepository.updateUserExperience(
      userId,
      newLevel,
      newExp,
      newAttributePoints
    );
    
    // Registra que o usuário recebeu recompensas por esta batalha
    await battleRewardsRepository.registerRewardReceived(
      userId,
      battleId,
      experienceGained,
      leveledUp,
      newAttributePoints
    );
    
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