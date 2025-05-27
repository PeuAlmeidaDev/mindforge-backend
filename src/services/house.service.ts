import { prisma } from '../lib/prisma';
import { House } from '@prisma/client';
import { NotFoundError, InternalServerError } from '../utils/error';

/**
 * Serviço para gerenciar casas
 */
export class HouseService {
  /**
   * Busca todas as casas disponíveis
   * @returns Lista de casas
   */
  static async findAll(): Promise<Partial<House>[]> {
    try {
      return await prisma.house.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          visualTheme: true
        }
      });
    } catch (error) {
      console.error('Erro ao listar casas:', error);
      throw new InternalServerError('Erro ao buscar casas');
    }
  }

  /**
   * Busca uma casa pelo ID
   * @param id ID da casa
   * @returns Casa encontrada
   */
  static async findById(id: string): Promise<House> {
    try {
      const house = await prisma.house.findUnique({
        where: { id }
      });

      if (!house) {
        throw new NotFoundError('Casa');
      }

      return house;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Erro ao buscar casa ${id}:`, error);
      throw new InternalServerError('Erro ao buscar casa');
    }
  }

  /**
   * Busca os usuários de uma casa específica
   * @param houseId ID da casa
   * @returns Usuários da casa
   */
  static async findUsers(houseId: string): Promise<any[]> {
    try {
      // Verificar se a casa existe
      await this.findById(houseId);

      return await prisma.user.findMany({
        where: { houseId },
        select: {
          id: true,
          username: true,
          level: true,
          experience: true,
          primaryElementalType: true,
          attributes: true
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Erro ao buscar usuários da casa ${houseId}:`, error);
      throw new InternalServerError('Erro ao buscar usuários da casa');
    }
  }

  /**
   * Calcula estatísticas globais da casa
   * @param houseId ID da casa
   * @returns Estatísticas da casa
   */
  static async getHouseStats(houseId: string): Promise<any> {
    try {
      // Verificar se a casa existe
      const house = await this.findById(houseId);

      // Buscar usuários da casa
      const users = await this.findUsers(houseId);

      // Calcular estatísticas
      const totalUsers = users.length;
      const avgLevel = totalUsers > 0 
        ? users.reduce((sum, user) => sum + user.level, 0) / totalUsers 
        : 0;
      const completedGoals = await prisma.userDailyGoal.count({
        where: {
          user: {
            houseId
          },
          completed: true
        }
      });

      // Retornar estatísticas
      return {
        id: house.id,
        name: house.name,
        totalUsers,
        avgLevel: Math.round(avgLevel * 10) / 10, // Arredondar para 1 casa decimal
        completedGoals
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Erro ao buscar estatísticas da casa ${houseId}:`, error);
      throw new InternalServerError('Erro ao buscar estatísticas da casa');
    }
  }
} 