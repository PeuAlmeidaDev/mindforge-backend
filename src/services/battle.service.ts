import { PrismaClient, Battle, BattleParticipant } from '@prisma/client';
import { BattleRepository } from '../repositories/battle.repository';
import { UserRepository } from '../repositories/user.repository';
import { prisma } from '../database/prisma';

// Instâncias dos repositórios
const battleRepository = new BattleRepository();
const userRepository = new UserRepository();

/**
 * Busca todas as batalhas de um usuário
 */
export const findUserBattles = async (userId: string) => {
  // Usando o prisma diretamente pois os repositórios podem não ter exatamente os métodos necessários
  return await prisma.battle.findMany({
    where: {
      participants: {
        some: {
          participantType: 'user',
          userId: userId
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profileImageUrl: true,
              primaryElementalType: true,
              secondaryElementalType: true,
              level: true
            }
          },
          enemy: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              elementalType: true,
              rarity: true,
              isBoss: true,
              health: true,
              physicalAttack: true,
              specialAttack: true,
              physicalDefense: true,
              specialDefense: true,
              speed: true
            }
          },
          statusEffects: true,
          buffs: true,
          debuffs: true
        }
      }
    },
    orderBy: {
      startedAt: 'desc'
    }
  });
};

/**
 * Busca uma batalha específica pelo ID
 */
export const findBattleById = async (battleId: string, userId: string) => {
  return await battleRepository.findBattleWithDetails(battleId);
};

/**
 * Cria uma nova batalha aleatória
 */
export const createRandomBattle = async (
  userId: string, 
  difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  aiDifficulty?: number
) => {
  // Carrega o usuário com seus atributos e skills equipadas
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      attributes: true,
      userSkills: {
        where: { equipped: true },
        include: { skill: true }
      }
    }
  });

  if (!user || !user.attributes) {
    throw new Error('Usuário ou atributos não encontrados');
  }

  // Determina quantos inimigos com base na dificuldade
  const enemyCount = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3;
  
  // Busca inimigos aleatórios com base no nível do usuário e dificuldade
  const enemyLevel = Math.max(1, user.level - 2 + (difficulty === 'easy' ? 0 : difficulty === 'normal' ? 1 : 2));
  
  // Define a raridade dos inimigos com base na dificuldade
  let rarityFilter: string[] = ['common'];
  if (difficulty === 'normal') {
    rarityFilter = ['common', 'uncommon'];
  } else if (difficulty === 'hard') {
    rarityFilter = ['common', 'uncommon', 'rare'];
  }

  // Armazena a dificuldade da IA nos metadados da batalha
  const metadata = {
    aiDifficulty: aiDifficulty || (difficulty === 'easy' ? 1 : difficulty === 'normal' ? 3 : 5)
  };

  // Busca inimigos aleatórios usando o Prisma diretamente
  let randomEnemies = await prisma.enemy.findMany({
    where: {
      rarity: { in: rarityFilter },
      isBoss: false
    },
    include: {
      enemySkills: {
        include: {
          skill: true
        }
      }
    },
    take: enemyCount,
    orderBy: {
      // Aqui usamos uma função aleatória para obter inimigos diferentes
      id: 'asc' // Na implementação real, deve-se usar uma forma de ordenar aleatoriamente
    }
  });

  // Se não encontrar inimigos com os filtros iniciais, buscar qualquer inimigo não-boss
  if (randomEnemies.length === 0) {
    console.log('Não encontrou inimigos com o filtro de raridade padrão. Buscando qualquer inimigo disponível.');
    randomEnemies = await prisma.enemy.findMany({
      where: {
        isBoss: false
      },
      include: {
        enemySkills: {
          include: {
            skill: true
          }
        }
      },
      take: enemyCount,
      orderBy: {
        id: 'asc'
      }
    });
  }

  if (randomEnemies.length === 0) {
    throw new Error('Não foi possível encontrar inimigos para a batalha');
  }

  // Prepara os dados da batalha
  const battleData = {
    currentTurn: 0,
    isFinished: false,
    winnerId: null,
    metadata: JSON.stringify(metadata) // Armazena metadados como JSON
  };

  // Prepara os participantes da batalha
  const participants: any[] = [];

  // Adiciona o usuário como participante
  const attributes = user.attributes!;
  participants.push({
    participantType: 'user',
    userId: user.id,
    enemyId: null,
    teamId: 'player',
    position: 1,
    currentHealth: attributes.health,
    currentPhysicalAttack: attributes.physicalAttack,
    currentSpecialAttack: attributes.specialAttack,
    currentPhysicalDefense: attributes.physicalDefense,
    currentSpecialDefense: attributes.specialDefense,
    currentSpeed: attributes.speed
  });

  // Adiciona os inimigos como participantes
  randomEnemies.forEach((enemy, index) => {
    participants.push({
      participantType: 'enemy',
      userId: null,
      enemyId: enemy.id,
      teamId: 'enemy',
      position: index + 1,
      currentHealth: enemy.health,
      currentPhysicalAttack: enemy.physicalAttack,
      currentSpecialAttack: enemy.specialAttack,
      currentPhysicalDefense: enemy.physicalDefense,
      currentSpecialDefense: enemy.specialDefense,
      currentSpeed: enemy.speed
    });
  });

  // Cria a batalha com os participantes usando o repositório
  const battle = await battleRepository.createBattleWithParticipants(
    battleData,
    participants
  );

  // Retorna a batalha criada
  return findBattleById(battle.id, userId);
}; 