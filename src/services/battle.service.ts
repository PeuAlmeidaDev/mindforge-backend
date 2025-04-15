import { PrismaClient } from '@prisma/client';
import { prisma } from '../index';

/**
 * Busca todas as batalhas de um usuário
 */
export const findUserBattles = async (userId: string) => {
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
              isBoss: true
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
  return await prisma.battle.findFirst({
    where: {
      id: battleId,
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
              isBoss: true
            }
          },
          statusEffects: true,
          buffs: true,
          debuffs: true
        }
      }
    }
  });
};

/**
 * Cria uma nova batalha aleatória
 */
export const createRandomBattle = async (userId: string, difficulty: 'easy' | 'normal' | 'hard' = 'normal') => {
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

  // Busca inimigos aleatórios
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

  // Cria uma nova batalha e adiciona os participantes em uma transação
  const battle = await prisma.$transaction(async (tx) => {
    // Cria a batalha
    const newBattle = await tx.battle.create({
      data: {
        currentTurn: 0,
        isFinished: false
      }
    });

    // Garantindo que user.attributes existe (já verificado acima)
    const attributes = user.attributes!;

    // Adiciona o usuário como participante
    await tx.battleParticipant.create({
      data: {
        battleId: newBattle.id,
        participantType: 'user',
        userId: user.id,
        teamId: 'player',
        position: 1,
        currentHealth: attributes.health,
        currentPhysicalAttack: attributes.physicalAttack,
        currentSpecialAttack: attributes.specialAttack,
        currentPhysicalDefense: attributes.physicalDefense,
        currentSpecialDefense: attributes.specialDefense,
        currentSpeed: attributes.speed
      }
    });

    // Adiciona os inimigos como participantes
    for (let i = 0; i < randomEnemies.length; i++) {
      const enemy = randomEnemies[i];
      await tx.battleParticipant.create({
        data: {
          battleId: newBattle.id,
          participantType: 'enemy',
          enemyId: enemy.id,
          teamId: 'enemy',
          position: i + 1,
          currentHealth: enemy.health,
          currentPhysicalAttack: enemy.physicalAttack,
          currentSpecialAttack: enemy.specialAttack,
          currentPhysicalDefense: enemy.physicalDefense,
          currentSpecialDefense: enemy.specialDefense,
          currentSpeed: enemy.speed
        }
      });
    }

    return newBattle;
  });

  // Carrega a batalha completa com todos os participantes
  return await prisma.battle.findUnique({
    where: { id: battle.id },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profileImageUrl: true,
              primaryElementalType: true,
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
              isBoss: true
            }
          },
          statusEffects: true,
          buffs: true,
          debuffs: true
        }
      }
    }
  });
}; 