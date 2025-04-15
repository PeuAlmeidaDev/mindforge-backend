import { prisma } from '../index';

// Mapeamento de interesses para casas
const interestToHouseMapping = {
  // Formato: 'ID do interesse': ['ID da Casa 1', 'ID da Casa 2', ...]
  'saude-fitness': ['casa1', 'casa4'],
  'criatividade-expressao': ['casa2', 'casa3', 'casa5'],
  'aprendizado-desenvolvimento': ['casa3', 'casa5', 'casa2'],
  'sustentabilidade-lifestyle': ['casa2', 'casa5'],
  'estudos-academicos-profissional': ['casa3', 'casa1'],
  'condicionamento-fisico': ['casa1', 'casa4'],
  'artes-marciais': ['casa1', 'casa4'],
  'autoconhecimento-mindset': ['casa3', 'casa5'],
  'organizacao-produtividade': ['casa1', 'casa3'],
  'saude-bem-estar': ['casa4', 'casa5'],
  'relacoes-impacto-social': ['casa2', 'casa5']
};

/**
 * Determina a casa mais apropriada para um usuário com base em seus interesses
 * @param interestIds Array de IDs dos interesses do usuário
 * @returns ID da casa recomendada
 */
export const determineUserHouse = async (interestIds: string[]): Promise<string> => {
  try {
    // Primeiro, buscar todos os interesses do usuário para obter seus nomes (slugs)
    const interests = await prisma.interest.findMany({
      where: {
        id: {
          in: interestIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Contagem de "votos" para cada casa
    const houseVotes: Record<string, number> = {};

    // Inicializar contagem para todas as casas
    const houses = await prisma.house.findMany({
      select: { id: true }
    });
    
    houses.forEach(house => {
      houseVotes[house.id] = 0;
    });

    // Para cada interesse do usuário, adicionar votos para as casas correspondentes
    interests.forEach(interest => {
      // Converter o nome do interesse para um formato de slug
      const interestSlug = interest.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-');     // Substitui caracteres não alfanuméricos por hífen
      
      // Obter as casas associadas a este interesse
      const associatedHouses = interestToHouseMapping[interestSlug] || [];
      
      // Adicionar um voto para cada casa associada
      associatedHouses.forEach(houseId => {
        if (houseVotes[houseId] !== undefined) {
          houseVotes[houseId] += 1;
        }
      });
    });

    // Encontrar a casa com mais votos
    let recommendedHouseId = houses[0]?.id;
    let maxVotes = 0;

    Object.entries(houseVotes).forEach(([houseId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        recommendedHouseId = houseId;
      }
    });

    // Se houver empate ou nenhum voto, escolher aleatoriamente entre as casas com mais votos
    if (maxVotes === 0 || Object.values(houseVotes).filter(v => v === maxVotes).length > 1) {
      const topHouses = Object.entries(houseVotes)
        .filter(([_, votes]) => votes === maxVotes)
        .map(([houseId, _]) => houseId);
      
      // Escolher aleatoriamente entre as casas empatadas
      recommendedHouseId = topHouses[Math.floor(Math.random() * topHouses.length)];
    }

    return recommendedHouseId;
  } catch (error) {
    console.error('Erro ao determinar casa do usuário:', error);
    // Se houver erro, retornar a primeira casa como fallback
    const firstHouse = await prisma.house.findFirst();
    return firstHouse?.id || 'casa1';
  }
};

/**
 * Popula o mapeamento entre interesses e casas a partir do banco de dados
 */
export const setupHouseMapping = async (): Promise<void> => {
  try {
    // Obter todas as casas
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        name: true
      }
    });

    // Criar mapeamento de nome das casas para IDs
    const houseNameToIdMap: Record<string, string> = {};
    houses.forEach(house => {
      const houseName = house.name.toLowerCase().includes('kazoku') ? 'Casa do Lobo' :
                       house.name.toLowerCase().includes('água') ? 'Águas Flamejantes' :
                       house.name.toLowerCase().includes('três') ? 'Três Faces' :
                       house.name.toLowerCase().includes('rugido') ? 'Chamas do Rugido' :
                       house.name.toLowerCase().includes('dourado') ? 'Espírito Dourado' :
                       house.name;
      
      houseNameToIdMap[houseName] = house.id;
    });

    // Atualizar o mapeamento com os IDs reais
    const newMapping: Record<string, string[]> = {};
    
    // Para cada entrada do mapeamento original
    Object.entries(interestToHouseMapping).forEach(([interestSlug, houseNames]) => {
      newMapping[interestSlug] = houseNames.map(houseName => {
        const houseKey = houseName === 'casa1' ? 'Casa do Lobo' :
                        houseName === 'casa2' ? 'Águas Flamejantes' :
                        houseName === 'casa3' ? 'Três Faces' :
                        houseName === 'casa4' ? 'Chamas do Rugido' :
                        houseName === 'casa5' ? 'Espírito Dourado' :
                        houseName;
        
        return houseNameToIdMap[houseKey] || houseName;
      });
    });

    // Substituir o mapeamento original pelo novo com IDs reais
    Object.assign(interestToHouseMapping, newMapping);
    
  } catch (error) {
    console.error('Erro ao configurar mapeamento de casas:', error);
  }
}; 