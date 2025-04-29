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
        id: string;
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
    
    // Buscar o participante do usuário
    const playerParticipant = battleWithParticipants.participants.find(p => p.userId === userId);
    
    // Se não encontrar o participante diretamente, verificar se é o único jogador humano
    if (!playerParticipant) {
      const humanParticipants = battleWithParticipants.participants.filter(p => p.participantType === 'user');
      console.log(`Participantes humanos na batalha: ${humanParticipants.length}`);
      
      // Se não houver exatamente um jogador humano, o usuário não faz parte desta batalha
      if (humanParticipants.length !== 1) {
        console.error(`Usuário ${userId} não encontrado entre os participantes da batalha`);
        throw new Error('Usuário não participou desta batalha');
      }
      
      console.log(`Assumindo que o único jogador humano é o usuário atual ${userId}`);
    }
    
    // Determinar o time do jogador
    const playerTeam = playerParticipant?.teamId || 
                      battleWithParticipants.participants.find(p => p.participantType === 'user')?.teamId;
    
    if (!playerTeam) {
      throw new Error('Não foi possível determinar o time do jogador');
    }
    
    // Verificar se o time do jogador venceu a batalha
    let playerTeamWon = false;
    
    // Primeiro, verificar usando o winnerId (mais confiável)
    if (battle.winnerId) {
      // Encontrar o participante vencedor
      const winnerParticipant = battleWithParticipants.participants.find(p => p.id === battle.winnerId);
      
      if (!winnerParticipant) {
        console.error(`Participante vencedor (ID: ${battle.winnerId}) não encontrado na batalha`);
        throw new Error('Dados de batalha inconsistentes: vencedor não encontrado');
      }
      
      // Verificar se o time vencedor é o mesmo do jogador
      playerTeamWon = winnerParticipant.teamId === playerTeam;
      console.log(`Verificação por winnerId: Time do jogador: ${playerTeam}, Time do vencedor: ${winnerParticipant.teamId}`);
    } else {
      // Método alternativo: verificar se todos os inimigos foram derrotados
      console.log('Aviso: battle.winnerId não está definido, usando verificação alternativa de vitória');
      playerTeamWon = battleWithParticipants.participants.every(p => 
        p.teamId === playerTeam || p.currentHealth <= 0
      );
      console.log(`Verificação alternativa de vitória: ${playerTeamWon ? 'Jogador venceu' : 'Jogador perdeu'}`);
    }
    
    // Se o jogador não venceu, não dar recompensa
    if (!playerTeamWon) {
      throw new Error('Você não pode receber recompensas por uma batalha que não venceu');
    }
    
    // Buscar o usuário e suas informações atuais
    const user = await battleRewardsRepository.findUserWithExperience(userId);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    
    // Calcular níveis dos inimigos
    const enemyLevels = battleWithParticipants.participants
      .filter(p => p.teamId !== playerTeam && p.enemy)
      .map(p => Math.max(1, Math.floor((
        p.enemy!.physicalAttack + 
        p.enemy!.specialAttack + 
        p.enemy!.physicalDefense + 
        p.enemy!.specialDefense + 
        p.enemy!.speed) / 20)));
    
    // Definir dificuldade com base no número de inimigos
    const difficulty = enemyLevels.length <= 1 ? 'easy' : 
                      enemyLevels.length <= 2 ? 'normal' : 'hard';
    
    // Calcular experiência ganha
    const experienceGained = battleRewardsRepository.calculateBattleExperience(enemyLevels, difficulty);
    
    // Verificar se o usuário subiu de nível
    const { newLevel, leveledUp, newAttributePoints, newExp } = battleRewardsRepository.checkLevelUp(
      user.level,
      user.experience,
      experienceGained
    );
    
    // Atualizar o usuário com a experiência ganha e possível novo nível
    await battleRewardsRepository.updateUserExperience(
      userId,
      newLevel,
      newExp,
      newAttributePoints
    );
    
    // Registrar que o usuário recebeu recompensas por esta batalha
    await battleRewardsRepository.registerRewardReceived(
      userId,
      battleId,
      experienceGained,
      leveledUp,
      newAttributePoints
    );
    
    // Retornar as recompensas processadas
    return {
      experience: experienceGained,
      levelUp: leveledUp,
      attributePointsGained: newAttributePoints
    };
  } catch (error) {
    console.error('Erro ao processar recompensas:', error);
    throw error;
  }
}; 