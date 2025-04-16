import { Battle, BattleParticipant, Skill } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BattleAction, BattleActionResult, BattleTurnResult } from '../../types/battle';
import * as damageService from './damage.service';
import * as effectsService from './effects.service';

/**
 * Ordena os participantes da batalha por velocidade
 */
export const orderParticipantsBySpeed = (participants: BattleParticipant[]): BattleParticipant[] => {
  return [...participants].sort((a, b) => b.currentSpeed - a.currentSpeed);
};

/**
 * Executa um turno da batalha, processando todas as ações
 */
export const executeBattleTurn = async (
  battleId: string, 
  actions: BattleAction[]
): Promise<BattleTurnResult> => {
  try {
    // Obtém a batalha e seus participantes
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true
      }
    });

    if (!battle) {
      throw new Error('Batalha não encontrada');
    }

    // Objeto para armazenar os resultados das ações
    const actionResults: Record<string, BattleActionResult> = {};

    // Fase 1: Processar efeitos de status e buffs do turno anterior
    const statusEffectResults = await effectsService.processStatusEffects(battle.participants);
    const buffResults = await effectsService.processBuffs(battle.participants);

    // Ordena os participantes por velocidade
    const orderedParticipants = orderParticipantsBySpeed(battle.participants);

    // Fase 2: Processa cada ação na ordem de velocidade dos participantes
    for (const participant of orderedParticipants) {
      // Verifica se este participante tem uma ação para executar
      const action = actions.find(action => action.actorId === participant.id);
      
      if (!action) continue;

      // Verifica se o alvo existe
      const target = battle.participants.find(p => p.id === action.targetId);
      if (!target) continue;

      // Verifica se o participante está impedido de agir por algum efeito de status
      const isStunned = statusEffectResults[participant.id]?.stunned;

      if (isStunned) {
        // Participante está impedido de agir
        actionResults[participant.id] = {
          damage: 0,
          isCritical: false,
          accuracy: false,
          statusEffects: [],
          buffs: [],
          debuffs: [],
          messages: ['Não pode agir devido a efeito de status']
        };
        continue;
      }

      // Busca a skill utilizada
      const skill = await prisma.skill.findUnique({
        where: { id: action.skillId }
      });

      if (!skill) {
        actionResults[participant.id] = {
          damage: 0,
          isCritical: false,
          accuracy: false,
          statusEffects: [],
          buffs: [],
          debuffs: [],
          messages: ['Habilidade não encontrada']
        };
        continue;
      }

      // Obtém os tipos elementais
      const attackerType = await getParticipantElementalType(participant);
      const defenderType = await getParticipantElementalType(target);

      // Calcula o resultado da ação
      const result = damageService.calculateDamage(
        participant, 
        target, 
        skill,
        attackerType,
        defenderType
      );
      
      actionResults[participant.id] = result;

      // Se o ataque acertou, aplica os efeitos
      if (result.accuracy) {
        // Aplica o dano
        await prisma.battleParticipant.update({
          where: { id: target.id },
          data: {
            currentHealth: {
              decrement: result.damage
            }
          }
        });

        // Adiciona uma mensagem de resultado
        if (!result.messages) result.messages = [];
        result.messages.push(`${effectsService.getParticipantName(participant)} causou ${result.damage} de dano${result.isCritical ? ' crítico' : ''} a ${effectsService.getParticipantName(target)}`);

        // Aplica efeitos de status
        for (const effect of result.statusEffects) {
          const applied = await effectsService.applyStatusEffect(target.id, effect);
          
          if (applied) {
            result.messages.push(`${effectsService.getStatusEffectName(effect.type)} aplicado em ${effectsService.getParticipantName(target)}`);
          }
        }

        // Aplica buffs ao atacante
        for (const buff of result.buffs) {
          const applied = await effectsService.applyBuff(participant.id, buff);
          
          if (applied) {
            result.messages.push(`${effectsService.getAttributeName(buff.attribute)} aumentado em ${buff.value}`);
          }
        }

        // Aplica debuffs ao alvo
        for (const debuff of result.debuffs) {
          const applied = await effectsService.applyBuff(target.id, {
            ...debuff,
            value: -debuff.value // Valor negativo para debuff
          });
          
          if (applied) {
            result.messages.push(`${effectsService.getAttributeName(debuff.attribute)} reduzido em ${debuff.value}`);
          }
        }
      } else {
        // Adiciona mensagem de erro
        if (!result.messages) result.messages = [];
        result.messages.push(`${effectsService.getParticipantName(participant)} errou o ataque`);
      }
    }

    // Atualiza o turno da batalha
    await prisma.battle.update({
      where: { id: battleId },
      data: {
        currentTurn: {
          increment: 1
        }
      }
    });

    // Verifica se a batalha foi finalizada
    const updatedParticipants = await prisma.battleParticipant.findMany({
      where: {
        battleId
      }
    });

    // Verifica se todos os participantes de algum time foram derrotados
    const teamStatus = checkTeamStatus(updatedParticipants);
    
    // Se algum time foi derrotado, finaliza a batalha
    let isFinished = false;
    let winnerTeam: string | null = null;
    
    if (teamStatus.playerDefeated || teamStatus.enemyDefeated) {
      isFinished = true;
      winnerTeam = teamStatus.playerDefeated ? 'enemy' : 'player';
      
      // Atualiza o status da batalha
      await prisma.battle.update({
        where: { id: battleId },
        data: {
          isFinished: true,
          // Usamos winnerId conforme o schema do Prisma
          // Como não temos o ID específico do vencedor, podemos deixar null ou
          // usar algum identificador para o time
        }
      });
    }

    // Busca a batalha atualizada
    const updatedBattle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true
      }
    });

    if (!updatedBattle) {
      throw new Error('Não foi possível obter a batalha atualizada após processamento do turno');
    }

    return {
      battle: updatedBattle,
      participants: updatedParticipants,
      actionResults,
      isFinished,
      winnerTeam
    };
  } catch (error) {
    console.error('Erro ao executar turno da batalha:', error);
    throw new Error(`Erro ao executar turno da batalha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Verifica o status dos times (se algum foi derrotado)
 */
export const checkTeamStatus = (participants: BattleParticipant[]): { 
  playerDefeated: boolean, 
  enemyDefeated: boolean 
} => {
  // Divide por time
  const playerTeam = participants.filter(p => p.teamId === 'player');
  const enemyTeam = participants.filter(p => p.teamId === 'enemy');
  
  // Verifica se todos os participantes do time foram derrotados
  const playerDefeated = playerTeam.every(p => p.currentHealth <= 0);
  const enemyDefeated = enemyTeam.every(p => p.currentHealth <= 0);
  
  return {
    playerDefeated,
    enemyDefeated
  };
};

/**
 * Obtém o tipo elemental de um participante
 */
export const getParticipantElementalType = async (
  participant: BattleParticipant
): Promise<string> => {
  if (participant.participantType === 'user' && participant.userId) {
    const user = await prisma.user.findUnique({
      where: { id: participant.userId },
      select: { primaryElementalType: true }
    });
    
    return user?.primaryElementalType || 'fire';
  } 
  
  if (participant.participantType === 'enemy' && participant.enemyId) {
    const enemy = await prisma.enemy.findUnique({
      where: { id: participant.enemyId },
      select: { elementalType: true }
    });
    
    return enemy?.elementalType || 'fire';
  }
  
  return 'fire'; // Tipo padrão
}; 