import { User, UserAttributes, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Interface para usuário com relacionamentos opcionais
 */
export interface UserWithRelations extends User {
  attributes?: UserAttributes | null;
  house?: any;
  userInterests?: any[];
  userSkills?: any[];
}

/**
 * Repositório para operações com usuários
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('user');
  }

  /**
   * Busca um usuário pelo ID com todos os relacionamentos
   * @param userId ID do usuário
   * @returns Usuário com todos os relacionamentos
   */
  async findUserProfile(userId: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
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
          }
        }
      }
    });
  }

  /**
   * Busca um usuário pelo email
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Busca um usuário pelo nome de usuário
   * @param username Nome de usuário
   * @returns Usuário encontrado ou null
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username }
    });
  }

  /**
   * Atualiza os atributos do usuário e decrementa pontos de atributo
   * @param userId ID do usuário
   * @param attributeUpdates Atualizações nos atributos
   * @param pointsToDecrement Pontos a decrementar
   * @returns Atributos atualizados e usuário atualizado
   */
  async updateAttributes(
    userId: string,
    attributeUpdates: Partial<UserAttributes>,
    pointsToDecrement: number
  ): Promise<{ attributes: UserAttributes; user: Pick<User, 'attributePointsToDistribute'> }> {
    return this.transaction(async (tx) => {
      const updatedAttributes = await tx.userAttributes.update({
        where: { userId },
        data: {
          health: attributeUpdates.health 
            ? { increment: attributeUpdates.health } 
            : undefined,
          physicalAttack: attributeUpdates.physicalAttack 
            ? { increment: attributeUpdates.physicalAttack } 
            : undefined,
          specialAttack: attributeUpdates.specialAttack 
            ? { increment: attributeUpdates.specialAttack } 
            : undefined,
          physicalDefense: attributeUpdates.physicalDefense 
            ? { increment: attributeUpdates.physicalDefense } 
            : undefined,
          specialDefense: attributeUpdates.specialDefense 
            ? { increment: attributeUpdates.specialDefense } 
            : undefined,
          speed: attributeUpdates.speed 
            ? { increment: attributeUpdates.speed } 
            : undefined
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          attributePointsToDistribute: {
            decrement: pointsToDecrement
          }
        },
        select: {
          attributePointsToDistribute: true
        }
      });

      return { attributes: updatedAttributes, user: updatedUser };
    });
  }

  /**
   * Gerencia as habilidades equipadas do usuário
   * @param userId ID do usuário
   * @param equippedSkills IDs das habilidades para equipar
   * @returns Habilidades equipadas
   */
  async manageEquippedSkills(userId: string, equippedSkills: string[]): Promise<any[]> {
    return this.transaction(async (tx) => {
      // Primeiro desativar todas as habilidades
      await tx.userSkill.updateMany({
        where: { userId },
        data: { equipped: false }
      });

      // Depois ativar apenas as selecionadas
      await tx.userSkill.updateMany({
        where: {
          userId,
          skillId: {
            in: equippedSkills
          }
        },
        data: { equipped: true }
      });

      // Retornar as habilidades equipadas atualizadas
      return tx.userSkill.findMany({
        where: {
          userId,
          equipped: true
        },
        include: {
          skill: true
        }
      });
    });
  }

  /**
   * Adiciona experiência ao usuário e verifica se ele subiu de nível
   * @param userId ID do usuário
   * @param expAmount Quantidade de experiência a adicionar
   * @returns Usuário atualizado
   */
  async addExperience(userId: string, expAmount: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Cálculo de experiência necessária para o próximo nível (exemplo)
    const nextLevelExp = Math.floor(100 * Math.pow(user.level, 1.5));
    
    // Nova experiência total
    let newExp = user.experience + expAmount;
    let newLevel = user.level;
    let newAttributePoints = user.attributePointsToDistribute;
    
    // Verificar se subiu de nível
    if (newExp >= nextLevelExp) {
      newLevel += 1;
      newExp = newExp - nextLevelExp;
      newAttributePoints += 5; // 5 pontos de atributo por nível
    }

    return this.update(userId, {
      experience: newExp,
      level: newLevel,
      attributePointsToDistribute: newAttributePoints
    });
  }
} 