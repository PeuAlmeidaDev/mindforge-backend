import { Request, Response } from 'express';
import { prisma } from '../index';

/**
 * Obtém o perfil do usuário autenticado
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        attributes: true,
        house: true,
        userInterests: {
          include: {
            interest: true
          }
        },
        userSkills: {
          include: {
            skill: true
          },
          where: {
            equipped: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Remover a senha da resposta
    const { password, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

/**
 * Atualiza os atributos do usuário
 */
export const updateAttributes = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { health, physicalAttack, specialAttack, physicalDefense, specialDefense, speed } = req.body;

    // Buscar o usuário para verificar os pontos disponíveis
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        attributePointsToDistribute: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se o usuário tem pontos suficientes
    const totalPoints = (
      (health || 0) + 
      (physicalAttack || 0) + 
      (specialAttack || 0) + 
      (physicalDefense || 0) + 
      (specialDefense || 0) + 
      (speed || 0)
    );

    if (totalPoints > user.attributePointsToDistribute) {
      return res.status(400).json({
        success: false,
        message: 'Pontos insuficientes para distribuir'
      });
    }

    // Atualizar os atributos
    const attributes = await prisma.userAttributes.update({
      where: { userId },
      data: {
        health: { increment: health || 0 },
        physicalAttack: { increment: physicalAttack || 0 },
        specialAttack: { increment: specialAttack || 0 },
        physicalDefense: { increment: physicalDefense || 0 },
        specialDefense: { increment: specialDefense || 0 },
        speed: { increment: speed || 0 }
      }
    });

    // Atualizar os pontos disponíveis
    await prisma.user.update({
      where: { id: userId },
      data: {
        attributePointsToDistribute: {
          decrement: totalPoints
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Atributos atualizados com sucesso',
      data: attributes
    });
  } catch (error) {
    console.error('Erro ao atualizar atributos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
};

/**
 * Gerencia as habilidades equipadas do usuário
 */
export const manageEquippedSkills = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { skillIds } = req.body;

    // Verificar se foram enviados os IDs das habilidades
    if (!skillIds || !Array.isArray(skillIds)) {
      return res.status(400).json({
        success: false,
        message: 'É necessário fornecer um array de IDs de habilidades'
      });
    }

    // Verificar se o usuário não está tentando equipar mais de 4 habilidades
    if (skillIds.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Você só pode equipar até 4 habilidades'
      });
    }

    // Verificar se todas as habilidades pertencem ao usuário
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        skillId: {
          in: skillIds
        }
      }
    });

    if (userSkills.length !== skillIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Uma ou mais habilidades não pertencem ao usuário'
      });
    }

    // Primeiro, desequipar todas as habilidades
    await prisma.userSkill.updateMany({
      where: {
        userId
      },
      data: {
        equipped: false
      }
    });

    // Equipar as habilidades selecionadas
    await prisma.userSkill.updateMany({
      where: {
        userId,
        skillId: {
          in: skillIds
        }
      },
      data: {
        equipped: true
      }
    });

    // Buscar as habilidades equipadas atualizadas
    const equippedSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        equipped: true
      },
      include: {
        skill: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Habilidades equipadas com sucesso',
      data: equippedSkills
    });
  } catch (error) {
    console.error('Erro ao gerenciar habilidades equipadas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
}; 