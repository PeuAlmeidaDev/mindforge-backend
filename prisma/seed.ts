import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar as casas
  const houses = await Promise.all([
    prisma.house.create({
      data: {
        name: 'Drakonos',
        visualTheme: 'dark-red',
        description: 'Casa dos guerreiros e estrategistas, focada em força e determinação.'
      }
    }),
    prisma.house.create({
      data: {
        name: 'Luminos',
        visualTheme: 'light-blue',
        description: 'Casa dos estudiosos e sábios, focada em conhecimento e iluminação.'
      }
    }),
    prisma.house.create({
      data: {
        name: 'Naturos',
        visualTheme: 'earth-green',
        description: 'Casa dos harmonizadores e curandeiros, focada em equilíbrio e crescimento.'
      }
    }),
    prisma.house.create({
      data: {
        name: 'Technos',
        visualTheme: 'cyber-purple',
        description: 'Casa dos inovadores e inventores, focada em progresso e tecnologia.'
      }
    })
  ]);

  // Criar os interesses básicos
  const interests = await Promise.all([
    prisma.interest.create({
      data: {
        name: 'Estudos',
        description: 'Atividades relacionadas ao desenvolvimento intelectual e acadêmico'
      }
    }),
    prisma.interest.create({
      data: {
        name: 'Exercícios',
        description: 'Atividades físicas e práticas esportivas'
      }
    }),
    prisma.interest.create({
      data: {
        name: 'Meditação',
        description: 'Práticas de mindfulness e desenvolvimento pessoal'
      }
    }),
    prisma.interest.create({
      data: {
        name: 'Leitura',
        description: 'Hábitos de leitura e compreensão textual'
      }
    }),
    prisma.interest.create({
      data: {
        name: 'Artes',
        description: 'Expressão artística e criatividade'
      }
    }),
    prisma.interest.create({
      data: {
        name: 'Música',
        description: 'Prática e apreciação musical'
      }
    })
  ]);

  // Criar algumas metas básicas para cada interesse
  for (const interest of interests) {
    switch (interest.name) {
      case 'Estudos':
        await Promise.all([
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Estudar por 25 minutos',
              rewardSpecialAttack: 2,
              rewardSpecialDefense: 1,
              hasSkillChance: true,
              skillUnlockChance: 20
            }
          }),
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Fazer resumo do conteúdo',
              rewardSpecialAttack: 1,
              rewardHealth: 5,
              hasSkillChance: true,
              skillUnlockChance: 15
            }
          })
        ]);
        break;

      case 'Exercícios':
        await Promise.all([
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Fazer 15 minutos de exercício',
              rewardPhysicalAttack: 2,
              rewardSpeed: 1,
              hasSkillChance: true,
              skillUnlockChance: 20
            }
          }),
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Alongar por 10 minutos',
              rewardHealth: 5,
              rewardPhysicalDefense: 1,
              hasSkillChance: false
            }
          })
        ]);
        break;

      case 'Meditação':
        await Promise.all([
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Meditar por 10 minutos',
              rewardSpecialDefense: 2,
              rewardHealth: 3,
              hasSkillChance: true,
              skillUnlockChance: 20
            }
          }),
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Praticar respiração consciente',
              rewardHealth: 5,
              rewardSpecialDefense: 1,
              hasSkillChance: false
            }
          })
        ]);
        break;

      case 'Leitura':
        await Promise.all([
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Ler por 20 minutos',
              rewardSpecialAttack: 1,
              rewardSpecialDefense: 1,
              hasSkillChance: true,
              skillUnlockChance: 20
            }
          }),
          prisma.goal.create({
            data: {
              interestId: interest.id,
              description: 'Completar um capítulo',
              rewardHealth: 5,
              rewardSpecialAttack: 1,
              hasSkillChance: true,
              skillUnlockChance: 15
            }
          })
        ]);
        break;
    }
  }

  // Criar algumas habilidades básicas
  const skills = await Promise.all([
    // Habilidades de Fogo
    prisma.skill.create({
      data: {
        name: 'Bola de Fogo',
        description: 'Lança uma poderosa bola de fogo no inimigo',
        elementalType: 'fire',
        baseDamage: 50,
        accuracy: 90,
        isAoe: false,
        targetType: 'single',
        statusEffect: 'burn',
        statusEffectChance: 30,
        statusEffectDuration: 3
      }
    }),
    // Habilidades de Água
    prisma.skill.create({
      data: {
        name: 'Jato d\'Água',
        description: 'Dispara um poderoso jato de água pressurizada',
        elementalType: 'water',
        baseDamage: 45,
        accuracy: 95,
        isAoe: false,
        targetType: 'single'
      }
    }),
    // Habilidades de Terra
    prisma.skill.create({
      data: {
        name: 'Terremoto',
        description: 'Causa um terremoto que atinge todos os inimigos',
        elementalType: 'earth',
        baseDamage: 40,
        accuracy: 85,
        isAoe: true,
        targetType: 'all_enemies'
      }
    })
  ]);

  console.log('Seed executado com sucesso!');
  console.log(`Criadas ${houses.length} casas`);
  console.log(`Criados ${interests.length} interesses`);
  console.log(`Criadas ${skills.length} habilidades`);
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 