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
    const slugMap: Record<string, string> = {
      'Saúde e Fitness': 'saude-fitness',
      'Criatividade e Expressão': 'criatividade-expressao',
      'Aprendizado e Desenvolvimento Pessoal': 'aprendizado-desenvolvimento',
      'Sustentabilidade e Lifestyle': 'sustentabilidade-lifestyle',
      'Estudos Acadêmicos e Desenvolvimento Profissional': 'estudos-academicos-profissional',
      'Condicionamento Físico': 'condicionamento-fisico',
      'Artes Marciais': 'artes-marciais',
      'Autoconhecimento e Mindset': 'autoconhecimento-mindset',
      'Organização e Produtividade': 'organizacao-produtividade',
      'Saúde e Bem-estar': 'saude-bem-estar',
      'Relações e Impacto Social': 'relacoes-impacto-social'
    };

    const slugs = interests.map(interest => {
      // Primeiro tentar encontrar no mapa predefinido
      const predefinedSlug = slugMap[interest.name];
      if (predefinedSlug) {
        return predefinedSlug;
      }
      
      // Se não encontrar, gerar slug automaticamente
      return interest.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres não alfanuméricos por hífen
        .replace(/-+$/, '')              // Remove hífens no final
        .replace(/^-+/, '');             // Remove hífens no início
    });
    
    console.log('Interesses convertidos para slugs:', 
      interests.map(i => i.name).map((name, i) => `${name} -> ${slugs[i]}`));
    
    return slugs;
  }
} 