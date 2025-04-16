import { User, UserAttributes } from '@prisma/client';
import { NotFoundError, ValidationError, InternalServerError, ConflictError } from '../utils/error';
import { UserRepository } from '../repositories/user.repository';
import { prisma } from '../database/prisma';

/**
 * Serviço para gerenciar usuários
 */
export class UserService {
  private static repository = new UserRepository();

  /**
   * Busca um usuário pelo ID com detalhes
   * @param userId ID do usuário
   * @returns Usuário com detalhes
   */
  static async getProfile(userId: string): Promise<any> {
    try {
      const user = await this.repository.findUserProfile(userId);

      if (!user) {
        throw new NotFoundError('Usuário');
      }

      // Remover a senha da resposta
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Erro ao buscar perfil do usuário:', error);
      throw new InternalServerError('Erro ao buscar perfil do usuário');
    }
  }

  /**
   * Atualiza os atributos do usuário
   * @param userId ID do usuário
   * @param attributeUpdates Atualizações nos atributos
   * @returns Atributos atualizados e pontos restantes
   */
  static async updateAttributes(
    userId: string, 
    attributeUpdates: Partial<UserAttributes>
  ): Promise<{ attributes: UserAttributes; attributePointsToDistribute: number }> {
    try {
      // Validar valores - não podem ser negativos
      for (const [key, value] of Object.entries(attributeUpdates)) {
        if (value && (typeof value !== 'number' || value < 0 || !Number.isInteger(value))) {
          throw new ValidationError(`Valor inválido para o atributo ${key}. Deve ser um número inteiro positivo.`);
        }
      }

      const { health, physicalAttack, specialAttack, physicalDefense, specialDefense, speed } = attributeUpdates;

      // Calcular o total de pontos a distribuir
      const totalPoints = (
        (health || 0) + 
        (physicalAttack || 0) + 
        (specialAttack || 0) + 
        (physicalDefense || 0) + 
        (specialDefense || 0) + 
        (speed || 0)
      );

      if (totalPoints <= 0) {
        throw new ValidationError('É necessário distribuir pelo menos 1 ponto de atributo');
      }

      // Buscar o usuário para verificar os pontos disponíveis
      const user = await this.repository.findById(userId);

      if (!user) {
        throw new NotFoundError('Usuário');
      }

      if (totalPoints > user.attributePointsToDistribute) {
        throw new ValidationError(
          `Pontos insuficientes para distribuir. Você tem ${user.attributePointsToDistribute} pontos disponíveis.`
        );
      }

      // Atualizar atributos usando o repositório
      const result = await this.repository.updateAttributes(userId, attributeUpdates, totalPoints);

      return {
        attributes: result.attributes,
        attributePointsToDistribute: result.user.attributePointsToDistribute
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Erro ao atualizar atributos:', error);
      throw new InternalServerError('Erro ao atualizar atributos');
    }
  }

  /**
   * Gerencia as habilidades equipadas do usuário
   * @param userId ID do usuário
   * @param equippedSkills IDs das habilidades para equipar
   * @returns Habilidades equipadas
   */
  static async manageEquippedSkills(userId: string, equippedSkills: string[]): Promise<any[]> {
    try {
      // Verificar parâmetros básicos
      if (!Array.isArray(equippedSkills)) {
        throw new ValidationError('É necessário fornecer um array de IDs de habilidades');
      }

      // Verificar se o usuário não está tentando equipar mais de 4 habilidades
      if (equippedSkills.length > 4) {
        throw new ValidationError('Você só pode equipar até 4 habilidades');
      }

      // Verificar se todas as habilidades pertencem ao usuário usando o prisma diretamente
      const userSkills = await prisma.userSkill.findMany({
        where: {
          userId,
          skillId: {
            in: equippedSkills
          }
        }
      });

      if (userSkills.length !== equippedSkills.length) {
        throw new ValidationError('Uma ou mais habilidades não pertencem ao usuário');
      }

      // Gerenciar habilidades equipadas usando o repositório
      return await this.repository.manageEquippedSkills(userId, equippedSkills);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Erro ao gerenciar habilidades equipadas:', error);
      throw new InternalServerError('Erro ao gerenciar habilidades equipadas');
    }
  }

  /**
   * Busca todos os usuários (com paginação)
   * @param page Página
   * @param limit Limite por página
   * @returns Lista paginada de usuários
   */
  static async findAll(page: number = 1, limit: number = 10): Promise<{ users: Partial<User>[]; total: number }> {
    try {
      const include = {
        house: {
          select: {
            id: true,
            name: true
          }
        }
      };
      
      const where = {};
      
      const orderBy = {
        level: 'desc'
      };

      const result = await this.repository.findAll(page, limit, where, orderBy, include);
      
      // Remover senhas da resposta
      const users = result.data.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return { users, total: result.total };
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw new InternalServerError('Erro ao buscar usuários');
    }
  }

  /**
   * Busca um usuário pelo ID
   * @param id ID do usuário
   * @returns Usuário encontrado
   */
  static async findById(id: string): Promise<User> {
    try {
      const user = await this.repository.findById(id);
      
      if (!user) {
        throw new NotFoundError('Usuário');
      }
      
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Erro ao buscar usuário:', error);
      throw new InternalServerError('Erro ao buscar usuário');
    }
  }

  /**
   * Adiciona experiência ao usuário
   * @param userId ID do usuário
   * @param expAmount Quantidade de experiência
   * @returns Usuário atualizado
   */
  static async addExperience(userId: string, expAmount: number): Promise<User> {
    try {
      if (expAmount <= 0) {
        throw new ValidationError('A quantidade de experiência deve ser positiva');
      }

      return await this.repository.addExperience(userId, expAmount);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('Erro ao adicionar experiência:', error);
      throw new InternalServerError('Erro ao adicionar experiência');
    }
  }
} 