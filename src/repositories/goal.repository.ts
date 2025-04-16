import { Goal, UserDailyGoal, Prisma, GoalInterest } from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Interface para meta com seus relacionamentos
 */
export interface GoalWithRelations extends Goal {
  userDailyGoals?: UserDailyGoal[];
  goalInterests?: (GoalInterest & {
    interest?: any;
  })[];
}

/**
 * Repositório para operações com metas
 */
export class GoalRepository extends BaseRepository<Goal> {
  constructor() {
    super('goal');
  }

  /**
   * Busca uma meta com todos os detalhes
   * @param goalId ID da meta
   * @returns Meta com detalhes
   */
  async findGoalWithDetails(goalId: string): Promise<GoalWithRelations | null> {
    return this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        goalInterests: {
          include: {
            interest: true
          }
        },
        userDailyGoals: true
      }
    });
  }

  /**
   * Busca metas por interesse
   * @param interestId ID do interesse
   * @returns Lista de metas
   */
  async findByInterest(interestId: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: {
        goalInterests: {
          some: {
            interestId
          }
        }
      }
    });
  }

  /**
   * Cria uma meta com interesses relacionados
   * @param goalData Dados da meta
   * @param interestIds IDs dos interesses relacionados
   * @returns Meta criada
   */
  async createWithInterests(
    goalData: Omit<Goal, 'id'>,
    interestIds: string[]
  ): Promise<Goal> {
    return this.transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          ...goalData,
          goalInterests: {
            create: interestIds.map(interestId => ({
              interest: {
                connect: {
                  id: interestId
                }
              }
            }))
          }
        },
        include: {
          goalInterests: {
            include: {
              interest: true
            }
          }
        }
      });

      return goal;
    });
  }

  /**
   * Busca metas diárias de um usuário
   * @param userId ID do usuário
   * @param date Data das metas (opcional)
   * @returns Lista de metas diárias
   */
  async findUserDailyGoals(
    userId: string,
    date?: Date
  ): Promise<UserDailyGoal[]> {
    const today = date || new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.userDailyGoal.findMany({
      where: {
        userId,
        dateAssigned: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        goal: true
      }
    });
  }

  /**
   * Cria ou atualiza uma meta diária para um usuário
   * @param userId ID do usuário
   * @param goalId ID da meta
   * @param completed Status de conclusão
   * @param date Data da meta
   * @returns Meta diária criada ou atualizada
   */
  async upsertDailyGoal(
    userId: string,
    goalId: string,
    completed: boolean,
    date?: Date
  ): Promise<UserDailyGoal> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Primeiro tentamos encontrar a meta diária existente
    const existingGoal = await this.prisma.userDailyGoal.findFirst({
      where: {
        userId,
        goalId,
        dateAssigned: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existingGoal) {
      // Atualizar a meta existente
      return this.prisma.userDailyGoal.update({
        where: { id: existingGoal.id },
        data: { completed }
      });
    } else {
      // Criar uma nova meta diária
      return this.prisma.userDailyGoal.create({
        data: {
          userId,
          goalId,
          dateAssigned: targetDate,
          completed
        }
      });
    }
  }

  /**
   * Busca estatísticas de conclusão de metas de um usuário
   * @param userId ID do usuário
   * @param startDate Data de início
   * @param endDate Data de fim
   * @returns Estatísticas de conclusão
   */
  async getCompletionStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ total: number; completed: number; completion_rate: number }> {
    const goals = await this.prisma.userDailyGoal.findMany({
      where: {
        userId,
        dateAssigned: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const total = goals.length;
    const completed = goals.filter(goal => goal.completed).length;
    const completion_rate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, completion_rate };
  }
} 