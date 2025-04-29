import { Battle, BattleParticipant, Skill } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BattleAction, BattleActionResult, BattleTurnResult } from '../../types/battle';
import * as damageService from './damage.service';
import * as effectsService from './effects.service';
import * as enemyAiService from './enemy-ai.service';

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
        participants: {
          include: {
            user: {
              include: {
                attributes: true
              }
            },
            enemy: true
          }
        }
      }
    });

    if (!battle) {
      throw new Error('Batalha não encontrada');
    }

    // Logs para debug
    console.log(`Batalha ID: ${battleId}, Ações recebidas:`, JSON.stringify(actions));
    console.log(`Participantes da batalha:`, battle.participants.map(p => ({
      id: p.id,
      type: p.participantType,
      teamId: p.teamId,
      userId: p.userId,
      enemyId: p.enemyId
    })));
    
    // Verifica se há participantes inválidos nas ações
    const validatedActions = actions.map(action => {
      // Verificar se o actorId existe como participante
      const actor = battle.participants.find(p => p.id === action.actorId);
      
      if (!actor) {
        // Se o ID do ator não for encontrado diretamente, tenta encontrar pelo userId ou enemyId
        const userActor = battle.participants.find(p => p.userId === action.actorId);
        const enemyActor = battle.participants.find(p => p.enemyId === action.actorId);
        
        if (userActor) {
          console.log(`Corrigindo actorId de ${action.actorId} para ${userActor.id} (participante do usuário)`);
          action.actorId = userActor.id;
        } else if (enemyActor) {
          console.log(`Corrigindo actorId de ${action.actorId} para ${enemyActor.id} (participante do inimigo)`);
          action.actorId = enemyActor.id;
        } else {
          console.log(`Ator não encontrado: ${action.actorId}`);
        }
      }
      
      // Verificar se o targetId existe como participante
      const target = battle.participants.find(p => p.id === action.targetId);
      
      if (!target) {
        // Se o ID do alvo não for encontrado diretamente, tenta encontrar pelo userId ou enemyId
        const userTarget = battle.participants.find(p => p.userId === action.targetId);
        const enemyTarget = battle.participants.find(p => p.enemyId === action.targetId);
        
        if (userTarget) {
          console.log(`Corrigindo targetId de ${action.targetId} para ${userTarget.id} (participante do usuário)`);
          action.targetId = userTarget.id;
        } else if (enemyTarget) {
          console.log(`Corrigindo targetId de ${action.targetId} para ${enemyTarget.id} (participante do inimigo)`);
          action.targetId = enemyTarget.id;
        } else {
          console.log(`Alvo não encontrado: ${action.targetId}`);
        }
      }
      
      return action;
    });
    
    console.log(`Ações validadas:`, JSON.stringify(validatedActions));

    // Objeto para armazenar os resultados das ações
    const actionResults: Record<string, BattleActionResult> = {};

    // Fase 1: Processar efeitos de status e buffs do turno anterior
    const statusEffectResults = await effectsService.processStatusEffects(battle.participants);
    const buffResults = await effectsService.processBuffs(battle.participants);

    // Gerar ações para inimigos automaticamente, se não estiverem nas ações fornecidas
    const completeActions = await completeEnemyActions(battleId, battle.participants, validatedActions);

    // Ordena os participantes por velocidade
    const orderedParticipants = orderParticipantsBySpeed(battle.participants);

    // Fase 2: Processa cada ação na ordem de velocidade dos participantes
    for (const participant of orderedParticipants) {
      // Verifica se o participante ainda está ativo
      if (participant.currentHealth <= 0) {
        continue; // Participante já está derrotado, não pode agir
      }

      // Verifica se este participante tem uma ação para executar
      const action = completeActions.find(action => action.actorId === participant.id);
      
      if (!action) continue;

      // Verifica se o alvo existe
      const target = battle.participants.find(p => p.id === action.targetId);
      if (!target) continue;

      // Verifica se o alvo já foi derrotado
      if (target.currentHealth <= 0) {
        actionResults[participant.id] = {
          damage: 0,
          isCritical: false,
          accuracy: false,
          statusEffects: [],
          buffs: [],
          debuffs: [],
          messages: [`${effectsService.getParticipantName(target)} já foi derrotado`]
        };
        continue;
      }

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

      // NOVA VALIDAÇÃO: Verifica se a skill está equipada (apenas para participantes do tipo 'user')
      if (participant.participantType === 'user' && participant.userId) {
        // Verifica se a skill está equipada pelo usuário
        const userSkill = await prisma.userSkill.findFirst({
          where: {
            userId: participant.userId,
            skillId: skill.id,
            equipped: true
          }
        });

        if (!userSkill) {
          // A skill não está equipada, não pode ser usada
          actionResults[participant.id] = {
            damage: 0,
            isCritical: false,
            accuracy: false,
            statusEffects: [],
            buffs: [],
            debuffs: [],
            messages: ['Esta habilidade não está equipada e não pode ser usada']
          };
          continue;
        }
      }

      // Obtém os tipos elementais
      const attackerType = await getParticipantElementalType(participant);
      const defenderType = await getParticipantElementalType(target);

      // Log para debug dos tipos elementais
      console.log(`Batalha: ${battleId} - Atacante: ${participant.id} (${attackerType}) - Defensor: ${target.id} (${defenderType}) - Skill: ${skill.id} (${skill.elementalType})`);

      // Calcula o resultado da ação
      const result = damageService.calculateDamage(
        participant, 
        target, 
        skill,
        attackerType,
        defenderType
      );
      
      // Log para debug do resultado
      console.log(`Resultado - Dano: ${result.damage}, Crítico: ${result.isCritical}, Mensagens: ${result.messages.join(', ')}`);
      
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

        // Busca o participante atualizado após aplicar o dano
        const updatedTarget = await prisma.battleParticipant.findUnique({
          where: { id: target.id }
        });

        // Verifica se o dano foi crítico ou teve vantagem de tipo para mostrar na mensagem
        if (result.messages.length === 0) {
          result.messages.push(`${effectsService.getParticipantName(participant)} causou ${result.damage} de dano a ${effectsService.getParticipantName(target)}`);
        } else {
          // A mensagem de dano será adicionada no final das mensagens existentes (vantagens de tipo, crítico, etc)
          result.messages.push(`${effectsService.getParticipantName(participant)} causou ${result.damage} de dano a ${effectsService.getParticipantName(target)}`);
        }

        // Verifica se o alvo foi derrotado pelo ataque
        if (updatedTarget && updatedTarget.currentHealth <= 0) {
          result.messages.push(`${effectsService.getParticipantName(target)} foi derrotado!`);
          
          // Verifica imediatamente se a batalha foi encerrada
          const currentParticipants = await prisma.battleParticipant.findMany({
            where: { battleId }
          });
          
          // Verifica o time do alvo derrotado
          const defeatedTeam = target.teamId;
          
          // Se o time do alvo derrotado for 'enemy', verificamos se todos os inimigos foram derrotados
          if (defeatedTeam === 'enemy') {
            const allEnemiesDefeated = currentParticipants
              .filter(p => p.teamId === 'enemy')
              .every(p => p.currentHealth <= 0);
              
            if (allEnemiesDefeated) {
              // Finaliza a batalha com vitória do jogador
              await prisma.battle.update({
                where: { id: battleId },
                data: {
                  isFinished: true,
                  currentTurn: {
                    increment: 1
                  },
                  winnerId: getWinnerTeamRepresentativeId(currentParticipants, 'player')
                }
              });
              
              // Busca a batalha atualizada
              const finalBattle = await prisma.battle.findUnique({
                where: { id: battleId },
                include: {
                  participants: true
                }
              });
              
              if (!finalBattle) {
                throw new Error('Erro ao atualizar batalha');
              }
              
              // Retorna o resultado do turno imediatamente
              return {
                battle: finalBattle,
                participants: finalBattle.participants,
                turnNumber: finalBattle.currentTurn,
                playerActions: separateActionsByTeam(actionResults, finalBattle.participants, 'player'),
                enemyActions: separateActionsByTeam(actionResults, finalBattle.participants, 'enemy'),
                actionResults,
                isFinished: true,
                winnerTeam: 'player'
              };
            }
          } else if (defeatedTeam === 'player') {
            const allPlayersDefeated = currentParticipants
              .filter(p => p.teamId === 'player')
              .every(p => p.currentHealth <= 0);
              
            if (allPlayersDefeated) {
              // Finaliza a batalha com vitória do inimigo
              await prisma.battle.update({
                where: { id: battleId },
                data: {
                  isFinished: true,
                  currentTurn: {
                    increment: 1
                  },
                  winnerId: getWinnerTeamRepresentativeId(currentParticipants, 'enemy')
                }
              });
              
              // Busca a batalha atualizada
              const finalBattle = await prisma.battle.findUnique({
                where: { id: battleId },
                include: {
                  participants: true
                }
              });
              
              if (!finalBattle) {
                throw new Error('Erro ao atualizar batalha');
              }
              
              // Retorna o resultado do turno imediatamente
              return {
                battle: finalBattle,
                participants: finalBattle.participants,
                turnNumber: finalBattle.currentTurn,
                playerActions: separateActionsByTeam(actionResults, finalBattle.participants, 'player'),
                enemyActions: separateActionsByTeam(actionResults, finalBattle.participants, 'enemy'),
                actionResults,
                isFinished: true,
                winnerTeam: 'enemy'
              };
            }
          }
        }

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
        if (result.messages.length === 0) {
          result.messages.push(`${effectsService.getParticipantName(participant)} errou o ataque`);
        }
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
      
      // Obtém o ID de um representante do time vencedor
      const winnerId = getWinnerTeamRepresentativeId(updatedParticipants, winnerTeam);
      
      // Atualiza o status da batalha
      await prisma.battle.update({
        where: { id: battleId },
        data: {
          isFinished: true,
          winnerId: winnerId // Define o winnerId como o ID do representante do time vencedor
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
      throw new Error('Erro ao atualizar batalha');
    }

    // Retorna o resultado do turno
    return {
      battle: updatedBattle,
      participants: updatedBattle.participants,
      turnNumber: updatedBattle.currentTurn,
      playerActions: separateActionsByTeam(actionResults, updatedBattle.participants, 'player'),
      enemyActions: separateActionsByTeam(actionResults, updatedBattle.participants, 'enemy'),
      actionResults,
      isFinished,
      winnerTeam
    };
  } catch (error) {
    console.error('Erro ao executar turno de batalha:', error);
    throw error;
  }
};

/**
 * Completa as ações da batalha com ações automáticas para inimigos
 */
const completeEnemyActions = async (
  battleId: string,
  participants: BattleParticipant[],
  playerActions: BattleAction[]
): Promise<BattleAction[]> => {
  // Copiar as ações do jogador
  const completeActions = [...playerActions];
  
  // Identificar os inimigos que estão na batalha e estão vivos
  const enemies = participants.filter(
    p => p.teamId === 'enemy' && p.currentHealth > 0 && p.participantType === 'enemy'
  );
  
  // Verificar quais inimigos já têm ações definidas
  const enemiesWithActions = new Set(playerActions
    .filter(action => {
      const actor = participants.find(p => p.id === action.actorId);
      return actor && actor.participantType === 'enemy';
    })
    .map(action => action.actorId)
  );
  
  // Para cada inimigo sem ação definida, gerar uma ação usando a IA
  for (const enemy of enemies) {
    if (!enemiesWithActions.has(enemy.id)) {
      try {
        // Determinar o nível de dificuldade para este inimigo
        let difficultyLevel = 3; // Padrão
        
        if (enemy.userId) {
          difficultyLevel = await enemyAiService.determineDifficultyLevel(
            enemy.enemyId!, 
            enemy.userId
          );
        }
        
        // Gerar ação para o inimigo usando a IA
        const enemyAction = await enemyAiService.generateEnemyAction(
          battleId,
          enemy,
          difficultyLevel
        );
        
        // Adicionar a ação à lista completa
        completeActions.push(enemyAction);
      } catch (error) {
        console.error(`Erro ao gerar ação para inimigo ${enemy.id}:`, error);
      }
    }
  }
  
  return completeActions;
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
  try {
    let elementalType = 'normal'; // Tipo padrão

    if (participant.participantType === 'user' && participant.userId) {
      const user = await prisma.user.findUnique({
        where: { id: participant.userId }
      });
      if (user?.primaryElementalType) {
        elementalType = user.primaryElementalType;
      }
    } else if (participant.participantType === 'enemy' && participant.enemyId) {
      const enemy = await prisma.enemy.findUnique({
        where: { id: participant.enemyId }
      });
      if (enemy?.elementalType) {
        elementalType = enemy.elementalType;
      }
    }
    
    // Garantir que o tipo é sempre minúsculo para evitar inconsistências
    return elementalType.toLowerCase();
  } catch (error) {
    console.error(`Erro ao obter tipo elemental: ${error}`);
    return 'normal';
  }
};

/**
 * Separa os resultados das ações por time
 */
const separateActionsByTeam = (
  actionResults: Record<string, BattleActionResult>,
  participants: BattleParticipant[],
  teamId: string
): Record<string, BattleActionResult> => {
  const teamResults: Record<string, BattleActionResult> = {};
  
  // Obter os IDs dos participantes do time especificado
  const teamParticipantIds = participants
    .filter(p => p.teamId === teamId)
    .map(p => p.id);
  
  // Filtrar apenas as ações realizadas pelos participantes do time
  for (const [participantId, result] of Object.entries(actionResults)) {
    if (teamParticipantIds.includes(participantId)) {
      teamResults[participantId] = result;
    }
  }
  
  return teamResults;
};

/**
 * Obtém o ID de um representante do time vencedor
 */
const getWinnerTeamRepresentativeId = (participants: BattleParticipant[], winnerTeam: string): string | null => {
  // Filtrar os participantes do time vencedor que ainda estão vivos
  const teamParticipants = participants.filter(
    p => p.teamId === winnerTeam && p.currentHealth > 0
  );
  
  // Se encontrar algum participante, retorna o ID do primeiro
  if (teamParticipants.length > 0) {
    return teamParticipants[0].id;
  }
  
  // Caso não encontre nenhum participante vivo (situação rara), 
  // retorna o ID do primeiro participante do time independente do estado
  const anyTeamParticipant = participants.find(p => p.teamId === winnerTeam);
  return anyTeamParticipant?.id || null;
};

/**
 * Obtém dados detalhados dos participantes de uma batalha
 */
export const getDetailedParticipants = async (battleId: string): Promise<BattleParticipant[]> => {
  return await prisma.battleParticipant.findMany({
    where: { battleId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profileImageUrl: true,
          primaryElementalType: true,
          secondaryElementalType: true,
          level: true,
          attributes: true
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
  });
}; 