import { Battle, User, BattleParticipant, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Interface para as recompensas de batalha
 */
export interface BattleRewards {
  experience: number;
  levelUp?: boolean;
  attributePointsGained?: number;
}

/**
 * Repositório para operações de recompensas de batalha
 */
export class BattleRewardsRepository extends BaseRepository<Battle> {
  constructor() {
    super('battle');
  }

  /**
   * Busca uma batalha específica com todos os participantes
   * @param battleId ID da batalha
   * @returns Batalha com participantes ou null se não encontrada
   */
  async findBattleWithParticipants(battleId: string): Promise<Battle | null> {
    return this.prisma.battle.findUnique({
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
  }

  /**
   * Verifica se o usuário participou da batalha
   * @param battleId ID da batalha
   * @param userId ID do usuário
   * @returns Participante encontrado ou null
   */
  async findUserParticipation(battleId: string, userId: string): Promise<BattleParticipant | null> {
    return this.prisma.battleParticipant.findFirst({
      where: {
        battleId,
        userId
      }
    });
  }

  /**
   * Calcula a quantidade de experiência necessária para avançar para o próximo nível
   * @param currentLevel Nível atual do usuário
   * @returns Experiência necessária
   */
  calculateExperienceForNextLevel(currentLevel: number): number {
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  }

  /**
   * Calcula a experiência ganha após vencer uma batalha
   * @param enemyLevels Níveis dos inimigos
   * @param difficulty Dificuldade da batalha
   * @returns Experiência ganha
   */
  calculateBattleExperience(enemyLevels: number[], difficulty: string): number {
    const averageEnemyLevel = enemyLevels.reduce((sum, level) => sum + level, 0) / enemyLevels.length;
    
    const difficultyMultiplier = difficulty === 'easy' ? 1 : 
                                difficulty === 'normal' ? 1.25 : 
                                difficulty === 'hard' ? 1.5 : 1;
    
    return Math.floor(20 * averageEnemyLevel * difficultyMultiplier);
  }

  /**
   * Busca o usuário com dados de experiência
   * @param userId ID do usuário
   * @returns Dados do usuário
   */
  async findUserWithExperience(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId }
    });
  }

  /**
   * Verifica se o usuário subiu de nível e calcula novos pontos de atributo
   * @param currentLevel Nível atual
   * @param currentExp Experiência atual
   * @param expGained Experiência ganha
   * @returns Informações de ganho de nível
   */
  checkLevelUp(
    currentLevel: number, 
    currentExp: number, 
    expGained: number
  ): { newLevel: number, leveledUp: boolean, newAttributePoints: number, newExp: number } {
    let newLevel = currentLevel;
    let leveledUp = false;
    let newAttributePoints = 0;
    let totalExp = currentExp + expGained;
    
    while (totalExp >= this.calculateExperienceForNextLevel(newLevel)) {
      totalExp -= this.calculateExperienceForNextLevel(newLevel);
      newLevel++;
      leveledUp = true;
      newAttributePoints += 3; // 3 pontos de atributo por nível
    }
    
    return { newLevel, leveledUp, newAttributePoints, newExp: totalExp };
  }

  /**
   * Atualiza o usuário com a experiência ganha e novo nível, se aplicável
   * @param userId ID do usuário
   * @param level Novo nível do usuário
   * @param experience Nova experiência do usuário
   * @param attributePointsToAdd Pontos de atributo a adicionar
   * @returns Usuário atualizado
   */
  async updateUserExperience(
    userId: string,
    level: number,
    experience: number,
    attributePointsToAdd: number
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        level,
        experience,
        attributePointsToDistribute: {
          increment: attributePointsToAdd
        }
      }
    });
  }

  /**
   * Verifica se o usuário já recebeu recompensa por uma batalha específica
   * @param userId ID do usuário
   * @param battleId ID da batalha
   * @returns Verdadeiro se o usuário já recebeu recompensa
   */
  async hasReceivedReward(userId: string, battleId: string): Promise<boolean> {
    const reward = await this.prisma.battleReward.findUnique({
      where: {
        userId_battleId: {
          userId,
          battleId
        }
      }
    });
    
    return !!reward;
  }

  /**
   * Registra que o usuário recebeu recompensa por uma batalha
   * @param userId ID do usuário
   * @param battleId ID da batalha
   * @param experienceGained Experiência ganha
   * @param leveledUp Indica se o usuário subiu de nível
   * @param attributePointsGained Pontos de atributo ganhos
   * @returns Registro de recompensa criado
   */
  async registerRewardReceived(
    userId: string,
    battleId: string,
    experienceGained: number,
    leveledUp: boolean,
    attributePointsGained: number
  ): Promise<any> {
    return this.prisma.battleReward.create({
      data: {
        userId,
        battleId,
        experienceGained,
        leveledUp,
        attributePointsGained
      }
    });
  }
} 