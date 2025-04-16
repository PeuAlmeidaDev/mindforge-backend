import { Battle, BattleParticipant, BattleStatusEffect, BattleBuff, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { ExtendedBattleParticipant } from '../types/battle';

/**
 * Interface para batalha com seus relacionamentos
 */
export interface BattleWithRelations extends Battle {
  participants?: (BattleParticipant & {
    user?: any;
    enemy?: any;
    statusEffects?: BattleStatusEffect[];
    buffs?: BattleBuff[];
  })[];
}

/**
 * Repositório para operações de batalha
 */
export class BattleRepository extends BaseRepository<Battle> {
  constructor() {
    super('battle');
  }

  /**
   * Busca uma batalha pelo ID com todos os detalhes
   * @param battleId ID da batalha
   * @returns Batalha com todos os detalhes
   */
  async findBattleWithDetails(battleId: string): Promise<BattleWithRelations | null> {
    return this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                attributes: true,
                primaryElementalType: true,
                secondaryElementalType: true,
                level: true
              }
            },
            enemy: true,
            statusEffects: true,
            buffs: true
          }
        }
      }
    });
  }

  /**
   * Busca batalhas ativas de um usuário
   * @param userId ID do usuário
   * @returns Lista de batalhas ativas
   */
  async findActiveUserBattles(userId: string): Promise<Battle[]> {
    return this.prisma.battle.findMany({
      where: {
        isFinished: false,
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            },
            enemy: true
          }
        }
      }
    });
  }

  /**
   * Cria uma nova batalha com participantes
   * @param battleData Dados da batalha
   * @param participants Participantes da batalha
   * @returns Batalha criada com participantes
   */
  async createBattleWithParticipants(
    battleData: Omit<Battle, 'id' | 'startedAt' | 'endedAt'>,
    participants: Omit<BattleParticipant, 'id' | 'battleId'>[]
  ): Promise<Battle> {
    return this.transaction(async (tx) => {
      // Criar a batalha
      const battle = await tx.battle.create({
        data: {
          ...battleData,
          participants: {
            create: participants
          }
        },
        include: {
          participants: true
        }
      });

      return battle;
    });
  }

  /**
   * Atualiza o estado de um participante da batalha
   * @param participantId ID do participante
   * @param data Dados para atualização
   * @returns Participante atualizado
   */
  async updateParticipant(
    participantId: string, 
    data: Partial<BattleParticipant>
  ): Promise<BattleParticipant> {
    return this.prisma.battleParticipant.update({
      where: { id: participantId },
      data
    });
  }

  /**
   * Adiciona um efeito de status a um participante
   * @param participantId ID do participante
   * @param effectData Dados do efeito
   * @returns Efeito criado
   */
  async addStatusEffect(
    participantId: string,
    effectData: Omit<BattleStatusEffect, 'id' | 'battleParticipantId'>
  ): Promise<BattleStatusEffect> {
    return this.prisma.battleStatusEffect.create({
      data: {
        ...effectData,
        battleParticipantId: participantId
      }
    });
  }

  /**
   * Adiciona um buff a um participante
   * @param participantId ID do participante
   * @param buffData Dados do buff
   * @returns Buff criado
   */
  async addBuff(
    participantId: string,
    buffData: Omit<BattleBuff, 'id' | 'battleParticipantId'>
  ): Promise<BattleBuff> {
    return this.prisma.battleBuff.create({
      data: {
        ...buffData,
        battleParticipantId: participantId
      }
    });
  }

  /**
   * Finaliza uma batalha
   * @param battleId ID da batalha
   * @param winnerParticipantId ID do participante vencedor
   * @returns Batalha atualizada
   */
  async finalizeBattle(battleId: string, winnerParticipantId: string): Promise<Battle> {
    return this.transaction(async (tx) => {
      // Atualizar o status da batalha
      const battle = await tx.battle.update({
        where: { id: battleId },
        data: {
          isFinished: true,
          winnerId: winnerParticipantId,
          endedAt: new Date()
        }
      });

      return battle;
    });
  }
} 