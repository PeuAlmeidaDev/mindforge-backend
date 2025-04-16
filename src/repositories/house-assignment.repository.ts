import { House, Interest, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { prisma } from '../database/prisma';

/**
 * Tipo para o mapeamento de interesses para casas
 */
export type InterestToHouseMap = Record<string, string[]>;

/**
 * Tipo para interesse com campos selecionados
 */
type InterestWithName = {
  id: string;
  name: string;
  description: string | null;
};

/**
 * Repositório para operações relacionadas à atribuição de casas
 */
export class HouseAssignmentRepository extends BaseRepository<Interest> {
  constructor() {
    super('interest');
  }
  
  /**
   * Busca todos os interesses de um usuário pelo ID dos interesses
   * @param interestIds IDs dos interesses
   * @returns Lista de interesses
   */
  async findInterests(interestIds: string[]): Promise<InterestWithName[]> {
    return this.prisma.interest.findMany({
      where: {
        id: {
          in: interestIds
        }
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    });
  }
  
  /**
   * Busca todas as casas
   * @returns Lista de casas
   */
  async findAllHouses(): Promise<House[]> {
    return this.prisma.house.findMany();
  }
  
  /**
   * Atribui um usuário a uma casa
   * @param userId ID do usuário
   * @param houseId ID da casa
   * @returns Verdadeiro se a atribuição foi bem-sucedida
   */
  async assignUserToHouse(userId: string, houseId: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { houseId }
      });
      return true;
    } catch (error) {
      console.error('Erro ao atribuir usuário à casa:', error);
      return false;
    }
  }
  
  /**
   * Busca a primeira casa (como fallback)
   * @returns Primeira casa encontrada ou null
   */
  async findFirstHouse(): Promise<House | null> {
    return this.prisma.house.findFirst();
  }
  
  /**
   * Converte interesses para o formato de slug para mapeamento
   * @param interests Lista de interesses
   * @returns Mapa de slugs de interesses
   */
  convertInterestsToSlugs(interests: InterestWithName[]): string[] {
    return interests.map(interest => 
      interest.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres não alfanuméricos por hífen
    );
  }
} 