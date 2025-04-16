import { prisma } from '../database/prisma';
import { Goal, UserDailyGoal } from '@prisma/client';
import { ValidationError, NotFoundError, InternalServerError, ConflictError } from '../utils/error';
import { ExtendedDailyGoal, ExtendedGoal, GoalRewardResult } from '../types/goal';
import { GoalRepository } from '../repositories/goal.repository';

// Instância do repositório de metas
const goalRepository = new GoalRepository();

/**
 * Serviço para gerenciar metas
 */
export class GoalService {
  /**
   * Busca as metas diárias do usuário para hoje
   * @param userId ID do usuário
   * @returns Metas diárias do usuário
   */
  static async getDailyGoals(userId: string): Promise<ExtendedDailyGoal[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar as metas do usuário para hoje usando o repositório
      const dailyGoals = await goalRepository.findUserDailyGoals(userId, today);

      // Buscar mais detalhes de cada meta para obter os interesses
      const detailedGoals = await Promise.all(
        dailyGoals.map(async (dailyGoal) => {
          const goalDetails = await goalRepository.findGoalWithDetails(dailyGoal.goalId);
          return {
            ...dailyGoal,
            goal: goalDetails
          };
        })
      );

      // Transformar os dados para manter compatibilidade com o frontend
      return detailedGoals.map(dailyGoal => ({
        ...dailyGoal,
        goal: {
          ...dailyGoal.goal!,
          interests: dailyGoal.goal?.goalInterests 
            ? dailyGoal.goal.goalInterests.map(gi => (gi as any).interest)
            : []
        }
      })) as ExtendedDailyGoal[];
    } catch (error) {
      console.error('Erro ao obter metas diárias:', error);
      throw new InternalServerError('Erro ao obter metas diárias');
    }
  }

  /**
   * Gera novas metas diárias para o usuário
   * @param userId ID do usuário
   * @returns Metas diárias geradas
   */
  static async generateDailyGoals(userId: string): Promise<ExtendedDailyGoal[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Verificar se o usuário já tem metas para hoje
      const existingGoals = await goalRepository.findUserDailyGoals(userId, today);

      if (existingGoals.length > 0) {
        throw new ConflictError('As metas diárias já foram geradas para hoje');
      }

      // Buscar os interesses do usuário
      const userInterests = await prisma.userInterest.findMany({
        where: {
          userId
        },
        include: {
          interest: true
        }
      });

      if (userInterests.length === 0) {
        throw new ValidationError('Usuário não tem interesses cadastrados');
      }

      // Buscar todas as metas disponíveis para os interesses do usuário
      const interestIds = userInterests.map(ui => ui.interestId);
      const availableGoals = await prisma.goal.findMany({
        where: {
          goalInterests: {
            some: {
              interestId: {
                in: interestIds
              }
            }
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

      if (availableGoals.length === 0) {
        throw new ValidationError('Não há metas disponíveis para os interesses do usuário');
      }

      // Função para escolher aleatoriamente entre valores
      const getRandomItem = <T>(items: T[]): T => {
        return items[Math.floor(Math.random() * items.length)];
      };

      // Embaralhar as metas disponíveis
      const shuffledGoals = [...availableGoals].sort(() => Math.random() - 0.5);

      // Selecionar 5 metas obrigatórias e 1 opcional, garantindo que não haja duplicatas
      const selectedGoals = shuffledGoals.slice(0, 6);
      if (selectedGoals.length < 6) {
        // Se não tiver metas suficientes, repetir algumas
        while (selectedGoals.length < 6) {
          selectedGoals.push(getRandomItem(availableGoals));
        }
      }

      // Criar as metas diárias no banco de dados um por um com os parâmetros corretos
      const userDailyGoals = await Promise.all(
        selectedGoals.map(async (goal, index) => {
          // Criar a meta diária
          const dailyGoal = await prisma.userDailyGoal.create({
            data: {
              userId,
              goalId: goal.id,
              isOptional: index === 5, // A última meta é opcional
              completed: false,
              dateAssigned: today
            }
          });
          
          // Retornar com os detalhes da meta
          return {
            ...dailyGoal,
            goal
          };
        })
      );

      // Transformar os dados para manter compatibilidade com o frontend
      return userDailyGoals.map(dailyGoal => ({
        ...dailyGoal,
        goal: {
          ...dailyGoal.goal,
          interests: dailyGoal.goal.goalInterests 
            ? dailyGoal.goal.goalInterests.map((gi: any) => gi.interest)
            : []
        }
      })) as ExtendedDailyGoal[];
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      console.error('Erro ao gerar metas diárias:', error);
      throw new InternalServerError('Erro ao gerar metas diárias');
    }
  }

  /**
   * Marca uma meta como concluída e calcula recompensas
   * @param userId ID do usuário
   * @param goalData Dados da meta a ser concluída
   * @returns Resultado da conclusão da meta
   */
  static async completeGoal(
    userId: string,
    goalData: { dailyGoalId: string }
  ): Promise<GoalRewardResult> {
    try {
      const { dailyGoalId } = goalData;

      // Verificar se a meta existe e pertence ao usuário
      const dailyGoal = await prisma.userDailyGoal.findUnique({
        where: {
          id: dailyGoalId,
          userId
        },
        include: {
          goal: true
        }
      });

      if (!dailyGoal) {
        throw new NotFoundError('Meta diária');
      }

      // Verificar se a meta já foi concluída
      if (dailyGoal.completed) {
        throw new ConflictError('Meta já foi concluída');
      }

      // Buscar informações do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          attributes: true
        }
      });

      if (!user) {
        throw new NotFoundError('Usuário');
      }

      // Verificar se o usuário tem atributos
      if (!user.attributes) {
        throw new NotFoundError('Atributos do usuário');
      }

      // Obter as recompensas da meta
      const rewards = {
        health: dailyGoal.goal.rewardHealth,
        physicalAttack: dailyGoal.goal.rewardPhysicalAttack,
        specialAttack: dailyGoal.goal.rewardSpecialAttack,
        physicalDefense: dailyGoal.goal.rewardPhysicalDefense,
        specialDefense: dailyGoal.goal.rewardSpecialDefense,
        speed: dailyGoal.goal.rewardSpeed
      };

      // Calcular novos valores de atributos
      const newAttributes = {
        health: user.attributes.health + rewards.health,
        physicalAttack: user.attributes.physicalAttack + rewards.physicalAttack,
        specialAttack: user.attributes.specialAttack + rewards.specialAttack,
        physicalDefense: user.attributes.physicalDefense + rewards.physicalDefense,
        specialDefense: user.attributes.specialDefense + rewards.specialDefense,
        speed: user.attributes.speed + rewards.speed
      };

      // Verificar se a meta possui chance de desbloquear habilidade
      let unlockedSkill = null;
      let skillUnlocked = false;

      if (dailyGoal.goal.hasSkillChance && dailyGoal.goal.skillUnlockChance > 0) {
        // Gerar número aleatório entre 1 e 100
        const randomChance = Math.floor(Math.random() * 100) + 1;
        
        // Se o número for menor ou igual à chance de desbloquear, desbloquear uma habilidade
        if (randomChance <= dailyGoal.goal.skillUnlockChance) {
          // Buscar habilidades que o usuário ainda não possui
          const userSkills = await prisma.userSkill.findMany({
            where: { userId },
            select: { skillId: true }
          });
          
          const userSkillIds = userSkills.map(us => us.skillId);
          
          // Buscar habilidades disponíveis (que o usuário ainda não possui)
          const availableSkills = await prisma.skill.findMany({
            where: {
              id: {
                notIn: userSkillIds
              }
            }
          });
          
          if (availableSkills.length > 0) {
            // Selecionar uma habilidade aleatória para desbloquear
            const randomIndex = Math.floor(Math.random() * availableSkills.length);
            unlockedSkill = availableSkills[randomIndex];
            skillUnlocked = true;
          }
        }
      }

      // Atualizar usuário com as recompensas em uma transação
      const updatedData = await prisma.$transaction(async (prisma) => {
        // Atualizar meta como concluída
        const updatedGoal = await prisma.userDailyGoal.update({
          where: { id: dailyGoalId },
          data: {
            completed: true
          },
          include: {
            goal: true
          }
        });

        // Atualizar atributos do usuário com as recompensas
        const updatedAttributes = await prisma.userAttributes.update({
          where: { userId },
          data: {
            health: newAttributes.health,
            physicalAttack: newAttributes.physicalAttack,
            specialAttack: newAttributes.specialAttack,
            physicalDefense: newAttributes.physicalDefense,
            specialDefense: newAttributes.specialDefense,
            speed: newAttributes.speed
          }
        });
        
        // Se uma habilidade foi desbloqueada, adicionar ao usuário
        if (skillUnlocked && unlockedSkill) {
          await prisma.userSkill.create({
            data: {
              userId,
              skillId: unlockedSkill.id,
              equipped: false
            }
          });
        }

        // Obter o usuário atualizado com seus atributos
        const updatedUser = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            attributes: true
          }
        });

        if (!updatedUser) {
          throw new NotFoundError('Usuário');
        }

        return {
          dailyGoal: updatedGoal,
          user: updatedUser,
          attributes: updatedAttributes,
          unlockedSkill: unlockedSkill
        };
      });

      // Retornar resultado da conclusão
      return {
        goal: updatedData.dailyGoal,
        rewards: {
          health: rewards.health,
          physicalAttack: rewards.physicalAttack,
          specialAttack: rewards.specialAttack,
          physicalDefense: rewards.physicalDefense,
          specialDefense: rewards.specialDefense,
          speed: rewards.speed
        },
        user: {
          id: updatedData.user.id,
          attributes: updatedData.attributes
        },
        unlockedSkill: updatedData.unlockedSkill
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      console.error('Erro ao completar meta:', error);
      throw new InternalServerError('Erro ao completar meta');
    }
  }

  /**
   * Busca todas as metas disponíveis
   * @returns Lista de metas
   */
  static async findAll(): Promise<ExtendedGoal[]> {
    try {
      const goals = await prisma.goal.findMany({
        include: {
          goalInterests: {
            include: {
              interest: true
            }
          }
        }
      });

      return goals.map(goal => ({
        ...goal,
        interests: goal.goalInterests.map(gi => gi.interest)
      })) as ExtendedGoal[];
    } catch (error) {
      console.error('Erro ao listar metas:', error);
      throw new InternalServerError('Erro ao listar metas');
    }
  }

  /**
   * Busca uma meta pelo ID
   * @param id ID da meta
   * @returns Meta encontrada
   */
  static async findById(id: string): Promise<ExtendedGoal> {
    try {
      const goal = await prisma.goal.findUnique({
        where: { id },
        include: {
          goalInterests: {
            include: {
              interest: true
            }
          }
        }
      });

      if (!goal) {
        throw new NotFoundError('Meta');
      }

      return {
        ...goal,
        interests: goal.goalInterests.map(gi => gi.interest)
      } as ExtendedGoal;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Erro ao buscar meta ${id}:`, error);
      throw new InternalServerError('Erro ao buscar meta');
    }
  }
} 