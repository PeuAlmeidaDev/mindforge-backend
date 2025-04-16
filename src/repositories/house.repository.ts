import { House, User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Tipo parcial para usuário com campos específicos
 */
type UserPartial = Pick<User, 'id' | 'username' | 'profileImageUrl' | 'level' | 'experience' | 'primaryElementalType' | 'secondaryElementalType'>;

/**
 * Interface para casa com relacionamentos
 */
export interface HouseWithRelations extends House {
  users?: Partial<User>[];
}

/**
 * Repositório para operações com casas
 */
export class HouseRepository extends BaseRepository<House> {
  constructor() {
    super('house');
  }

  /**
   * Busca uma casa com todos os usuários
   * @param houseId ID da casa
   * @returns Casa com usuários
   */
  async findHouseWithUsers(houseId: string): Promise<HouseWithRelations | null> {
    return this.prisma.house.findUnique({
      where: { id: houseId },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            profileImageUrl: true,
            level: true,
            experience: true,
            primaryElementalType: true,
            secondaryElementalType: true
          }
        }
      }
    }) as Promise<HouseWithRelations | null>;
  }

  /**
   * Busca os usuários de uma casa
   * @param houseId ID da casa
   * @param page Número da página
   * @param limit Limite por página
   * @returns Lista paginada de usuários
   */
  async findUsersInHouse(
    houseId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ users: Partial<User>[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { houseId },
        select: {
          id: true,
          username: true,
          profileImageUrl: true,
          level: true,
          experience: true,
          primaryElementalType: true,
          secondaryElementalType: true,
          attributePointsToDistribute: true
        },
        skip,
        take: limit,
        orderBy: {
          level: 'desc'
        }
      }),
      this.prisma.user.count({
        where: { houseId }
      })
    ]);
    
    return { users, total };
  }

  /**
   * Atribui um usuário a uma casa
   * @param userId ID do usuário
   * @param houseId ID da casa
   * @returns Usuário atualizado
   */
  async assignUserToHouse(userId: string, houseId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { houseId },
      include: {
        house: true
      }
    });
  }

  /**
   * Busca estatísticas da casa
   * @param houseId ID da casa
   * @returns Estatísticas da casa
   */
  async getHouseStats(houseId: string): Promise<{
    memberCount: number;
    averageLevel: number;
    topMembers: Partial<User>[];
  }> {
    const users = await this.prisma.user.findMany({
      where: { houseId },
      select: {
        id: true,
        username: true,
        level: true,
        experience: true
      }
    });
    
    const memberCount = users.length;
    const averageLevel = memberCount > 0 
      ? users.reduce((sum, user) => sum + user.level, 0) / memberCount 
      : 0;
    
    // Top 5 membros por nível
    const topMembers = [...users]
      .sort((a, b) => {
        if (a.level !== b.level) {
          return b.level - a.level;
        }
        return b.experience - a.experience;
      })
      .slice(0, 5);
    
    return {
      memberCount,
      averageLevel,
      topMembers
    };
  }

  /**
   * Busca distribuição de tipos elementais na casa
   * @param houseId ID da casa
   * @returns Distribuição de tipos elementais
   */
  async getElementalDistribution(houseId: string): Promise<Record<string, number>> {
    const users = await this.prisma.user.findMany({
      where: { houseId },
      select: {
        primaryElementalType: true
      }
    });
    
    const distribution: Record<string, number> = {};
    
    users.forEach(user => {
      const type = user.primaryElementalType;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }
} 