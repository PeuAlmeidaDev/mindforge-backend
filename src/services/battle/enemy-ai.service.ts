import { BattleParticipant, Skill } from '@prisma/client';
import { BattleAction } from '../../types/battle';
import { prisma } from '../../database/prisma';
import * as damageService from './damage.service';
import * as effectsService from './effects.service';
import * as turnService from './turn.service';

/**
 * Interface para armazenar informações sobre a situação atual da batalha
 */
interface BattleContext {
  enemyParticipant: BattleParticipant;
  playerParticipants: BattleParticipant[];
  enemyTeamHealth: number;
  playerTeamHealth: number;
  currentTurn: number;
  difficultyLevel: number; // 1-5, onde 5 é o mais difícil
}

/**
 * Interface para representar a avaliação de uma skill
 */
interface SkillEvaluation {
  skill: Skill;
  targetId: string;
  score: number;
  reason: string;
}

/**
 * Gera uma ação para um inimigo com base na situação atual da batalha
 */
export const generateEnemyAction = async (
  battleId: string,
  enemyParticipant: BattleParticipant,
  difficultyLevel: number = 3
): Promise<BattleAction> => {
  try {
    // Busca todos os participantes da batalha
    const allParticipants = await prisma.battleParticipant.findMany({
      where: { battleId }
    });

    // Separa os participantes por time
    const playerParticipants = allParticipants.filter(
      p => p.teamId === 'player' && p.currentHealth > 0
    );

    // Verifica se há participantes vivos do time do jogador
    if (playerParticipants.length === 0) {
      throw new Error('Não há alvos válidos para o inimigo atacar');
    }

    // Busca a batalha para obter o turno atual
    const battle = await prisma.battle.findUnique({
      where: { id: battleId }
    });

    if (!battle) {
      throw new Error('Batalha não encontrada');
    }

    // Calcula a saúde total de cada time para análise estratégica
    const enemyTeamHealth = allParticipants
      .filter(p => p.teamId === 'enemy' && p.currentHealth > 0)
      .reduce((sum, p) => sum + p.currentHealth, 0);

    const playerTeamHealth = playerParticipants
      .reduce((sum, p) => sum + p.currentHealth, 0);

    // Cria o contexto da batalha para análise
    const context: BattleContext = {
      enemyParticipant,
      playerParticipants,
      enemyTeamHealth,
      playerTeamHealth,
      currentTurn: battle.currentTurn,
      difficultyLevel
    };

    // Busca as skills do inimigo
    const enemySkills = await prisma.skill.findMany({
      where: {
        enemySkills: {
          some: {
            enemyId: enemyParticipant.enemyId!
          }
        }
      }
    });

    if (enemySkills.length === 0) {
      throw new Error('Inimigo não possui skills disponíveis');
    }

    // Escolhe a melhor skill com base na estratégia
    const bestAction = await chooseBestSkill(context, enemySkills);

    return {
      actorId: enemyParticipant.id,
      targetId: bestAction.targetId,
      skillId: bestAction.skill.id
    };
  } catch (error) {
    console.error('Erro ao gerar ação do inimigo:', error);
    
    // Fallback: escolhe uma skill aleatória e um alvo aleatório caso ocorra algum erro
    const allParticipants = await prisma.battleParticipant.findMany({
      where: { 
        battleId,
        teamId: 'player',
        currentHealth: { gt: 0 }
      }
    });
    
    const randomTargetIndex = Math.floor(Math.random() * allParticipants.length);
    const randomTarget = allParticipants[randomTargetIndex];
    
    const enemySkills = await prisma.skill.findMany({
      where: {
        enemySkills: {
          some: {
            enemyId: enemyParticipant.enemyId!
          }
        }
      },
      take: 1
    });
    
    return {
      actorId: enemyParticipant.id,
      targetId: randomTarget.id,
      skillId: enemySkills[0]?.id || ''
    };
  }
};

/**
 * Avalia e escolhe a melhor skill para o inimigo usar com base no contexto atual da batalha
 */
const chooseBestSkill = async (
  context: BattleContext,
  availableSkills: Skill[]
): Promise<SkillEvaluation> => {
  const { enemyParticipant, playerParticipants, difficultyLevel } = context;
  
  // Array para armazenar a avaliação de cada skill
  const evaluations: SkillEvaluation[] = [];
  
  // Obtém o tipo elemental do inimigo
  const enemyType = await turnService.getParticipantElementalType(enemyParticipant);
  
  // Analisa cada skill e cada alvo possível
  for (const skill of availableSkills) {
    for (const target of playerParticipants) {
      // Obtém o tipo elemental do alvo
      const targetType = await turnService.getParticipantElementalType(target);
      
      // Inicializa a pontuação base da skill
      let score = 50; // Pontuação base
      let reason = "Avaliação base";
      
      // 1. Avalia vantagem elemental (até +30 pontos)
      const elementalAdvantage = damageService.calculateElementalAdvantage(skill.elementalType, targetType);
      if (elementalAdvantage > 1) {
        score += 30;
        reason = "Vantagem elemental significativa";
      } else if (elementalAdvantage < 1) {
        score -= 20;
      }
      
      // 2. Considera o dano base da skill (até +25 pontos)
      score += Math.min(25, skill.baseDamage / 4);
      
      // 3. Valoriza precisão da skill (até +15 pontos)
      score += skill.accuracy / 10;
      
      // 4. Valoriza skills de área quando há múltiplos jogadores (até +20 pontos)
      if (skill.targetType === 'all_enemies' && playerParticipants.length > 1) {
        score += 20;
        reason = "Ataque em área contra múltiplos alvos";
      }
      
      // 5. Prioriza skills com efeitos de status quando o inimigo está em vantagem (até +25 pontos)
      if (skill.statusEffect && context.enemyTeamHealth > context.playerTeamHealth) {
        score += 25;
        reason = `Aplicando ${skill.statusEffect} em situação vantajosa`;
      }
      
      // 6. Considerar a saúde atual do alvo para priorizar alvos mais fracos
      const maxPossibleHealth = Math.max(target.currentHealth, 100);
      const healthPercentage = (target.currentHealth / maxPossibleHealth) * 100;
      if (healthPercentage < 30) {
        score += 35;
        reason = "Alvo com pouca vida, prioridade de eliminação";
      } else if (healthPercentage < 50) {
        score += 20;
      }
      
      // 7. Analisa status effects existentes no alvo
      const hasParalyzingEffect = await hasStatusEffect(target.id, ['stun', 'freeze']);
      if (hasParalyzingEffect) {
        // Se o alvo já está paralisado, não vale a pena usar outro efeito paralisante
        if (skill.statusEffect === 'stun' || skill.statusEffect === 'freeze') {
          score -= 30;
        } else {
          // Mas vale a pena atacar alvos já paralisados com dano direto
          score += 15;
          reason = "Atacando alvo já paralisado";
        }
      }
      
      // 8. Introduz alguma aleatoriedade para não ser 100% previsível
      // Quanto maior a dificuldade, menor a aleatoriedade
      const randomFactor = Math.floor(Math.random() * (20 - difficultyLevel * 3));
      score += randomFactor;
      
      // 9. Em dificuldade mais alta, às vezes foca no personagem principal (posição 1)
      if (difficultyLevel >= 4 && target.position === 1 && Math.random() > 0.5) {
        score += 25;
        reason = "Focando no personagem principal";
      }
      
      // 10. Em dificuldades mais baixas, às vezes toma decisões sub-ótimas
      if (difficultyLevel <= 2 && Math.random() > 0.7) {
        score -= 30;
      }
      
      // Armazena a avaliação
      evaluations.push({
        skill,
        targetId: target.id,
        score,
        reason
      });
    }
  }
  
  // Ordena as avaliações pela pontuação em ordem decrescente
  evaluations.sort((a, b) => b.score - a.score);
  
  // Retorna a melhor avaliação
  return evaluations[0];
};

/**
 * Verifica se um participante possui um determinado efeito de status
 */
const hasStatusEffect = async (participantId: string, effectTypes: string[]): Promise<boolean> => {
  const statusEffects = await prisma.battleStatusEffect.findMany({
    where: {
      battleParticipantId: participantId,
      type: {
        in: effectTypes
      },
      remainingTurns: { gt: 0 }
    }
  });
  
  return statusEffects.length > 0;
};

/**
 * Determina o nível de dificuldade baseado na raridade do inimigo e no nível do jogador
 */
export const determineDifficultyLevel = async (
  enemyId: string,
  playerId: string
): Promise<number> => {
  try {
    // Busca informações do inimigo
    const enemy = await prisma.enemy.findUnique({
      where: { id: enemyId }
    });
    
    // Busca informações do jogador
    const player = await prisma.user.findUnique({
      where: { id: playerId }
    });
    
    if (!enemy || !player) {
      return 3; // Dificuldade padrão
    }
    
    // Base da dificuldade conforme raridade
    const rarityDifficulty: Record<string, number> = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 4,
      'legendary': 5
    };
    
    // Dificuldade base pela raridade
    let difficultyLevel = rarityDifficulty[enemy.rarity] || 3;
    
    // Ajuste pela diferença de nível
    const levelDifference = player.level - Math.floor(enemy.health / 50); // Estimativa de nível do inimigo
    if (levelDifference > 5) {
      difficultyLevel += 1; // Aumenta dificuldade se jogador tiver muito mais nível
    } else if (levelDifference < -5) {
      difficultyLevel -= 1; // Diminui dificuldade se inimigo for muito superior
    }
    
    // Boss sempre tem dificuldade mínima 4
    if (enemy.isBoss && difficultyLevel < 4) {
      difficultyLevel = 4;
    }
    
    // Limite a dificuldade entre 1 e 5
    return Math.max(1, Math.min(5, difficultyLevel));
  } catch (error) {
    console.error('Erro ao determinar nível de dificuldade:', error);
    return 3; // Dificuldade padrão em caso de erro
  }
}; 