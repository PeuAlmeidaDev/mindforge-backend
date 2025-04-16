import { prisma } from '../database/prisma';
import { Interest } from '@prisma/client';
import { NotFoundError, InternalServerError } from '../utils/error';
import { InterestRepository } from '../repositories/interest.repository';

// Instância do repositório de interesses
const interestRepository = new InterestRepository();

/**
 * Serviço para gerenciar interesses
 */
export class InterestService {
  /**
   * Busca todos os interesses disponíveis
   * @returns Lista de interesses
   */
  static async findAll(): Promise<Interest[]> {
    try {
      // Usando o método findAll do repositório e extraindo apenas os dados
      const result = await interestRepository.findAll();
      return result.data;
    } catch (error) {
      console.error('Erro ao listar interesses:', error);
      throw new InternalServerError('Erro ao buscar interesses');
    }
  }

  /**
   * Busca um interesse pelo ID
   * @param id ID do interesse
   * @returns Interesse encontrado
   */
  static async findById(id: string): Promise<Interest> {
    try {
      const interest = await interestRepository.findById(id);

      if (!interest) {
        throw new NotFoundError('Interesse');
      }

      return interest;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`Erro ao buscar interesse ${id}:`, error);
      throw new InternalServerError('Erro ao buscar interesse');
    }
  }

  /**
   * Verifica se todos os interesses de uma lista existem
   * @param interestIds Array de IDs de interesses
   * @returns Verdadeiro se todos existirem
   */
  static async validateInterests(interestIds: string[]): Promise<boolean> {
    try {
      // Como não temos findByIds, vamos verificar um por um
      const existingInterests = await Promise.all(
        interestIds.map(async (id) => {
          try {
            const interest = await interestRepository.findById(id);
            return interest ? true : false;
          } catch {
            return false;
          }
        })
      );
      
      // Verificar se todos existem
      return existingInterests.every(exists => exists);
    } catch (error) {
      console.error('Erro ao validar interesses:', error);
      throw new InternalServerError('Erro ao validar interesses');
    }
  }

  /**
   * Busca interesses por IDs
   * @param interestIds Array de IDs de interesses
   * @returns Lista de interesses encontrados
   */
  static async findByIds(interestIds: string[]): Promise<Interest[]> {
    try {
      // Como não temos findByIds no repositório, buscamos um por um
      const interests = await Promise.all(
        interestIds.map(async (id) => {
          try {
            return await interestRepository.findById(id);
          } catch {
            // Retornar null para interesses não encontrados
            return null;
          }
        })
      );
      
      // Filtrar os nulos (interesses não encontrados)
      return interests.filter((interest): interest is Interest => interest !== null);
    } catch (error) {
      console.error('Erro ao buscar interesses por IDs:', error);
      throw new InternalServerError('Erro ao buscar interesses');
    }
  }
} 