import { HouseAssignmentRepository, InterestToHouseMap } from '../repositories/house-assignment.repository';

// Repositório para operações relacionadas às casas
const repository = new HouseAssignmentRepository();

// Mapeamento de interesses para casas
const interestToHouseMapping: InterestToHouseMap = {
  // Formato: 'ID do interesse': ['ID da Casa 1', 'ID da Casa 2', ...]
  // Casa 1 (Kazoku No Okami) - Disciplina, físico, organização
  'saude-fitness': ['casa1', 'casa4'],
  'condicionamento-fisico': ['casa1'],
  'artes-marciais': ['casa1'],
  'estudos-academicos-profissional': ['casa1'],
  
  // Casa 2 (Águas Flamejantes) - Criatividade, expressão, fluidez
  'organizacao-produtividade': ['casa2'],
  'relacoes-impacto-social': ['casa2'],
  
  // Casa 3 (Três Faces) - Conhecimento, adaptabilidade, estratégia
  'aprendizado-desenvolvimento': ['casa3'],
  'criatividade-expressao': ['casa3'],
  
  // Casa 4 (Chamas do Rugido) - Força, coragem, proteção
  'saude-bem-estar': ['casa4'],
  
  // Casa 5 (Espírito Dourado) - Sabedoria, crescimento interno, equilíbrio
  'autoconhecimento-mindset': ['casa5'],
  'sustentabilidade-lifestyle': ['casa5']
};

/**
 * Determina a casa mais apropriada para um usuário com base em seus interesses
 * @param interestIds Array de IDs dos interesses do usuário
 * @returns ID da casa recomendada
 */
export const determineUserHouse = async (interestIds: string[]): Promise<string> => {
  try {
    // Buscar todos os interesses do usuário para obter seus nomes (slugs)
    const interests = await repository.findInterests(interestIds);

    // Verificação para debug
    console.log("Interesses encontrados:", interests);

    // Contagem de "votos" para cada casa
    const houseVotes: Record<string, number> = {};

    // Inicializar contagem para todas as casas
    const houses = await repository.findAllHouses();
    
    houses.forEach(house => {
      houseVotes[house.id] = 0;
    });

    // Converter interesses para slugs
    const interestSlugs = repository.convertInterestsToSlugs(interests);

    // Para cada interesse do usuário, adicionar votos para as casas correspondentes
    interestSlugs.forEach(interestSlug => {      
      // Obter as casas associadas a este interesse
      const associatedHouses = interestToHouseMapping[interestSlug as keyof typeof interestToHouseMapping] || [];
      
      // Adicionar um voto para cada casa associada
      associatedHouses.forEach((houseId: string) => {
        if (houseVotes[houseId] !== undefined) {
          houseVotes[houseId] += 1;
        }
      });
    });

    // Encontrar a casa com mais votos
    let recommendedHouseId = houses[0]?.id || '';
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
      
      console.log("Empate ou sem votos, sorteando entre as casas:", topHouses);
      
      // Se não houver casas com votos, sortear entre todas
      if (topHouses.length === 0) {
        topHouses.push(...houses.map(h => h.id));
      }
      
      // Escolher aleatoriamente entre as casas empatadas
      recommendedHouseId = topHouses[Math.floor(Math.random() * topHouses.length)];
    }

    console.log("Casa recomendada:", recommendedHouseId, "com", maxVotes, "votos");
    return recommendedHouseId;
  } catch (error) {
    console.error('Erro ao determinar casa do usuário:', error);
    // Se houver erro, retornar a primeira casa como fallback
    const firstHouse = await repository.findFirstHouse();
    return firstHouse?.id || 'casa1';
  }
};

/**
 * Popula o mapeamento entre interesses e casas a partir do banco de dados
 */
export const setupHouseMapping = async (): Promise<void> => {
  try {
    // Obter todas as casas
    const houses = await repository.findAllHouses();

    if (!houses || houses.length === 0) {
      console.error('Nenhuma casa encontrada no banco de dados');
      return;
    }

    // Criar mapeamento de nome das casas para IDs
    const houseNameToIdMap: Record<string, string> = {};
    houses.forEach(house => {
      if (!house || !house.name) {
        console.warn('Casa sem nome encontrada:', house);
        return;
      }

      const houseName = house.name.toLowerCase().includes('kazoku') ? 'Casa do Lobo' :
                      house.name.toLowerCase().includes('água') ? 'Águas Flamejantes' :
                      house.name.toLowerCase().includes('três') ? 'Três Faces' :
                      house.name.toLowerCase().includes('rugido') ? 'Chamas do Rugido' :
                      house.name.toLowerCase().includes('dourado') ? 'Espírito Dourado' :
                      house.name;
      
      houseNameToIdMap[houseName] = house.id;
    });

    // Adicionar log para debug
    console.log('Mapeamento de casas: ', houseNameToIdMap);

    // Atualizar o mapeamento com os IDs reais
    const newMapping: InterestToHouseMap = {};
    
    // Para cada entrada do mapeamento original
    Object.entries(interestToHouseMapping).forEach(([interestSlug, houseNames]) => {
      newMapping[interestSlug] = houseNames.map(houseName => {
        const houseKey = houseName === 'casa1' ? 'Casa do Lobo' :
                        houseName === 'casa2' ? 'Águas Flamejantes' :
                        houseName === 'casa3' ? 'Três Faces' :
                        houseName === 'casa4' ? 'Chamas do Rugido' :
                        houseName === 'casa5' ? 'Espírito Dourado' :
                        houseName;
        
        const mappedId = houseNameToIdMap[houseKey];
        if (!mappedId) {
          console.warn(`Casa não encontrada para o nome: ${houseKey}`);
        }
        return mappedId || houseName;
      });
    });

    // Log do novo mapeamento para debug
    console.log('Novo mapeamento de interesses para casas:', newMapping);

    // Substituir o mapeamento original pelo novo com IDs reais
    Object.assign(interestToHouseMapping, newMapping);
    
    console.log('Mapeamento de casas configurado com sucesso');
  } catch (error) {
    console.error('Erro ao configurar mapeamento de casas:', error);
  }
}; 