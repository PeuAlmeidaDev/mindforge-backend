import { Interest, UserInterest, GoalInterest, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Interface para interesse com relacionamentos
 */
export interface InterestWithRelations extends Interest {
  userInterests?: UserInterest[];
  goalInterests?: GoalInterest[];
}

/**
 * Repositório para operações com interesses
 */
export class InterestRepository extends BaseRepository<Interest> {
  constructor() {
    super('interest');
  }

  /**
   * Busca um interesse com todos os relacionamentos
   * @param interestId ID do interesse
   * @returns Interesse com relacionamentos
   */
  async findInterestWithRelations(interestId: string): Promise<InterestWithRelations | null> {
    return this.prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        userInterests: true,
        goalInterests: true
      }
    });
  }

  /**
   * Busca interesses de um usuário
   * @param userId ID do usuário
   * @returns Lista de interesses do usuário
   */
  async findUserInterests(userId: string): Promise<Interest[]> {
    const userInterests = await this.prisma.userInterest.findMany({
      where: { userId },
      include: {
        interest: true
      }
    });

    return userInterests.map(ui => ui.interest);
  }

  /**
   * Busca interesses de uma meta
   * @param goalId ID da meta
   * @returns Lista de interesses da meta
   */
  async findGoalInterests(goalId: string): Promise<Interest[]> {
    const goalInterests = await this.prisma.goalInterest.findMany({
      where: { goalId },
      include: {
        interest: true
      }
    });

    return goalInterests.map(gi => gi.interest);
  }

  /**
   * Adiciona interesses a um usuário
   * @param userId ID do usuário
   * @param interestIds IDs dos interesses
   * @returns Lista atualizada de interesses do usuário
   */
  async addUserInterests(userId: string, interestIds: string[]): Promise<Interest[]> {
    // Verificar quais interesses o usuário já possui
    const existingInterests = await this.prisma.userInterest.findMany({
      where: {
        userId,
        interestId: {
          in: interestIds
        }
      },
      select: {
        interestId: true
      }
    });

    const existingInterestIds = existingInterests.map(ei => ei.interestId);
    const newInterestIds = interestIds.filter(id => !existingInterestIds.includes(id));

    // Adicionar apenas os novos interesses
    if (newInterestIds.length > 0) {
      await this.prisma.userInterest.createMany({
        data: newInterestIds.map(interestId => ({
          userId,
          interestId
        })),
        skipDuplicates: true
      });
    }

    // Retornar a lista atualizada de interesses
    return this.findUserInterests(userId);
  }

  /**
   * Remove interesses de um usuário
   * @param userId ID do usuário
   * @param interestIds IDs dos interesses a remover
   * @returns Lista atualizada de interesses do usuário
   */
  async removeUserInterests(userId: string, interestIds: string[]): Promise<Interest[]> {
    await this.prisma.userInterest.deleteMany({
      where: {
        userId,
        interestId: {
          in: interestIds
        }
      }
    });

    // Retornar a lista atualizada de interesses
    return this.findUserInterests(userId);
  }

  /**
   * Busca interesses populares por contagem de usuários
   * @param limit Limite de interesses a retornar
   * @returns Lista de interesses populares com contagem
   */
  async findPopularInterests(limit: number = 10): Promise<{ interest: Interest; count: number }[]> {
    const popularInterests = await this.prisma.userInterest.groupBy({
      by: ['interestId'],
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: limit
    });

    const result = await Promise.all(
      popularInterests.map(async (item) => {
        const interest = await this.prisma.interest.findUnique({
          where: { id: item.interestId }
        });
        return {
          interest: interest!,
          count: item._count.userId
        };
      })
    );

    return result;
  }
} 