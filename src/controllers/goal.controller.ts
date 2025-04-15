import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * Obtém as metas diárias do usuário
 */
export const getDailyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar as metas do usuário para hoje
    const dailyGoals = await prisma.userDailyGoal.findMany({
      where: {
        userId,
        dateAssigned: {
          gte: today
        }
      },
      include: {
        goal: {
          include: {
            goalInterests: {
              include: {
                interest: true
              }
            }
          }
        }
      },
      orderBy: {
        isOptional: 'asc'
      }
    });

    // Transformar os dados para manter compatibilidade com o frontend
    const formattedDailyGoals = dailyGoals.map(dailyGoal => ({
      ...dailyGoal,
      goal: {
        ...dailyGoal.goal,
        interests: dailyGoal.goal.goalInterests.map(gi => gi.interest)
      }
    }));

    return res.status(200).json({
      success: true,
      data: formattedDailyGoals
    });
  } catch (error) {
    console.error('Erro ao obter metas diárias:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

/**
 * Gera novas metas diárias para o usuário
 */
export const generateDailyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar se o usuário já tem metas para hoje
    const existingGoals = await prisma.userDailyGoal.findMany({
      where: {
        userId,
        dateAssigned: {
          gte: today
        }
      }
    });

    if (existingGoals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'As metas diárias já foram geradas para hoje'
      });
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
      return res.status(400).json({
        success: false,
        message: 'Usuário não tem interesses cadastrados'
      });
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
      return res.status(400).json({
        success: false,
        message: 'Não há metas disponíveis para os interesses do usuário'
      });
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

    // Criar as metas diárias no banco de dados
    const userDailyGoals = await Promise.all(
      selectedGoals.map((goal, index) =>
        prisma.userDailyGoal.create({
          data: {
            userId,
            goalId: goal.id,
            isOptional: index === 5, // A última meta é opcional
            completed: false,
            dateAssigned: today
          },
          include: {
            goal: {
              include: {
                goalInterests: {
                  include: {
                    interest: true
                  }
                }
              }
            }
          }
        })
      )
    );

    // Transformar os dados para manter compatibilidade com o frontend
    const formattedDailyGoals = userDailyGoals.map(dailyGoal => ({
      ...dailyGoal,
      goal: {
        ...dailyGoal.goal,
        interests: dailyGoal.goal.goalInterests.map(gi => gi.interest)
      }
    }));

    return res.status(201).json({
      success: true,
      message: 'Metas diárias geradas com sucesso',
      data: formattedDailyGoals
    });
  } catch (error) {
    console.error('Erro ao gerar metas diárias:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

/**
 * Marca uma meta como concluída
 */
export const completeGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { goalId } = req.params;

    // Verificar se a meta existe e pertence ao usuário
    const userDailyGoal = await prisma.userDailyGoal.findFirst({
      where: {
        id: goalId,
        userId
      },
      include: {
        goal: {
          include: {
            goalInterests: {
              include: {
                interest: true
              }
            }
          }
        }
      }
    });

    if (!userDailyGoal) {
      return res.status(404).json({
        success: false,
        message: 'Meta não encontrada'
      });
    }

    if (userDailyGoal.completed) {
      return res.status(400).json({
        success: false,
        message: 'Meta já foi concluída'
      });
    }

    // Atualizar a meta como concluída
    const updatedGoal = await prisma.userDailyGoal.update({
      where: {
        id: goalId
      },
      data: {
        completed: true
      },
      include: {
        goal: {
          include: {
            goalInterests: {
              include: {
                interest: true
              }
            }
          }
        }
      }
    });

    // Atualizar os atributos do usuário com as recompensas da meta
    await prisma.userAttributes.update({
      where: {
        userId
      },
      data: {
        health: { increment: userDailyGoal.goal.rewardHealth },
        physicalAttack: { increment: userDailyGoal.goal.rewardPhysicalAttack },
        specialAttack: { increment: userDailyGoal.goal.rewardSpecialAttack },
        physicalDefense: { increment: userDailyGoal.goal.rewardPhysicalDefense },
        specialDefense: { increment: userDailyGoal.goal.rewardSpecialDefense },
        speed: { increment: userDailyGoal.goal.rewardSpeed }
      }
    });

    // Verificar se a meta tem chance de desbloquear uma habilidade
    let unlockedSkill = null;
    if (userDailyGoal.goal.hasSkillChance) {
      const chance = userDailyGoal.goal.skillUnlockChance || 100; // Padrão de 20% de chance
      const roll = Math.random() * 100;
      
      if (roll <= chance) {
        // Buscar todas as habilidades disponíveis que o usuário ainda não tem
        const userSkills = await prisma.userSkill.findMany({
          where: {
            userId
          },
          select: {
            skillId: true
          }
        });
        
        const userSkillIds = userSkills.map(us => us.skillId);
        
        const availableSkills = await prisma.skill.findMany({
          where: {
            id: {
              notIn: userSkillIds
            }
          }
        });
        
        if (availableSkills.length > 0) {
          // Selecionar uma habilidade aleatória
          const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
          
          // Adicionar a habilidade ao usuário
          await prisma.userSkill.create({
            data: {
              userId,
              skillId: randomSkill.id,
              equipped: false
            }
          });
          
          unlockedSkill = randomSkill;
        }
      }
    }

    // Transformar os dados para manter compatibilidade com o frontend
    const formattedGoal = {
      ...updatedGoal,
      goal: {
        ...updatedGoal.goal,
        interests: updatedGoal.goal.goalInterests.map(gi => gi.interest)
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Meta concluída com sucesso',
      data: {
        goal: formattedGoal,
        unlockedSkill
      }
    });
  } catch (error) {
    console.error('Erro ao concluir meta:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
}; 