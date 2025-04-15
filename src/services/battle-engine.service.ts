import { BattleParticipant, Battle, Skill } from '@prisma/client';
import { prisma } from '../index';

// Tipos para cálculos internos
type BattleAction = {
  actorId: string;
  targetId: string;
  skillId: string;
};

type BattleActionResult = {
  damage: number;
  isCritical: boolean;
  accuracy: boolean;
  statusEffects: {
    type: string;
    chance: number;
    duration: number;
    value: number;
    applied: boolean;
  }[];
  buffs: {
    attribute: string;
    value: number;
    duration: number;
    applied: boolean;
  }[];
  debuffs: {
    attribute: string;
    value: number;
    duration: number;
    applied: boolean;
  }[];
  messages?: string[]; // Mensagens adicionais sobre a ação
};

/**
 * Ordena os participantes da batalha por velocidade
 */
export const orderParticipantsBySpeed = (participants: BattleParticipant[]): BattleParticipant[] => {
  return [...participants].sort((a, b) => b.currentSpeed - a.currentSpeed);
};

/**
 * Calcula a tabela de vantagens/desvantagens elementais
 * @returns multiplicador de dano (0.5 para desvantagem, 1 para neutro, 1.5 para vantagem)
 */
export const calculateElementalAdvantage = (
  attackerType: string,
  defenderType: string
): number => {
  const advantageTable: Record<string, string[]> = {
    fire: ['nature', 'ice', 'steel'],
    water: ['fire', 'earth', 'rock'],
    earth: ['electric', 'poison', 'fire'],
    air: ['earth', 'fighting', 'bug'],
    light: ['dark', 'ghost', 'psychic'],
    dark: ['light', 'psychic', 'ghost'],
    nature: ['water', 'earth', 'rock'],
    electric: ['water', 'air', 'steel'],
    ice: ['nature', 'air', 'dragon'],
    psychic: ['fighting', 'poison', 'ghost'],
    ghost: ['psychic', 'ghost', 'dark'],
    steel: ['ice', 'rock', 'fairy'],
    poison: ['nature', 'fairy', 'fighting'],
    flying: ['fighting', 'bug', 'nature'],
    rock: ['fire', 'ice', 'flying']
  };

  const disadvantageTable: Record<string, string[]> = {
    fire: ['water', 'earth', 'rock'],
    water: ['nature', 'electric'],
    earth: ['water', 'ice', 'nature'],
    air: ['electric', 'ice', 'rock'],
    light: ['dark'],
    dark: ['light', 'fighting'],
    nature: ['fire', 'ice', 'poison', 'flying'],
    electric: ['earth', 'nature'],
    ice: ['fire', 'fighting', 'rock', 'steel'],
    psychic: ['dark', 'ghost', 'bug'],
    ghost: ['dark'],
    steel: ['fire', 'fighting', 'earth'],
    poison: ['steel', 'earth', 'psychic'],
    flying: ['electric', 'ice', 'rock'],
    rock: ['water', 'nature', 'fighting', 'earth', 'steel']
  };

  // Verifica vantagem
  if (advantageTable[attackerType]?.includes(defenderType)) {
    return 1.5;
  }
  
  // Verifica desvantagem
  if (disadvantageTable[attackerType]?.includes(defenderType)) {
    return 0.5;
  }
  
  // Neutro
  return 1.0;
};

/**
 * Calcula o dano de um ataque
 */
export const calculateDamage = (
  attacker: BattleParticipant,
  defender: BattleParticipant,
  skill: Skill
): BattleActionResult => {
  // Resultado inicial
  const result: BattleActionResult = {
    damage: 0,
    isCritical: false,
    accuracy: true,
    statusEffects: [],
    buffs: [],
    debuffs: []
  };

  // Verifica acurácia
  if (Math.random() * 100 > skill.accuracy) {
    result.accuracy = false;
    return result;
  }

  // Determina se é ataque físico ou especial baseado no campo attackType
  const isPhysical = skill.attackType === 'physical';
  
  // Pega o ataque e defesa relevantes
  const attack = isPhysical ? attacker.currentPhysicalAttack : attacker.currentSpecialAttack;
  const defense = isPhysical ? defender.currentPhysicalDefense : defender.currentSpecialDefense;

  // Obtém os tipos elementais
  // Como não podemos consultar o banco dentro da função, isso será tratado no método executeBattleTurn
  // Valores padrão para cálculos básicos
  const attackerType = 'fire';
  const defenderType = 'fire';

  // Calcular bônus de mesmo tipo (STAB - Same Type Attack Bonus)
  const stabBonus = skill.elementalType === attackerType ? 1.5 : 1.0;

  // Calcular vantagem/desvantagem elemental
  const typeAdvantage = calculateElementalAdvantage(skill.elementalType, defenderType);

  // Chance de crítico (5%)
  const isCritical = Math.random() < 0.05;
  const criticalMultiplier = isCritical ? 1.5 : 1.0;

  // Variação aleatória (85% a 100%)
  const randomFactor = 0.85 + (Math.random() * 0.15);

  // Fórmula de cálculo de dano
  // (((2 * Nível / 5 + 2) * Poder * Ataque / Defesa) / 50 + 2) * Modificadores
  // Simplificando para nosso caso:
  const baseDamage = ((attack / defense) * skill.baseDamage);
  const damage = Math.floor(
    baseDamage * stabBonus * typeAdvantage * criticalMultiplier * randomFactor
  );

  result.damage = Math.max(1, damage); // No mínimo 1 de dano
  result.isCritical = isCritical;

  // Processar efeitos de status
  if (skill.statusEffect && skill.statusEffectChance && skill.statusEffectDuration) {
    const statusApplied = Math.random() * 100 <= skill.statusEffectChance;
    
    // Define valores específicos para cada tipo de efeito
    let effectValue = Math.floor(result.damage * 0.066); // 6,6% do dano para burn
    
    // Para outros efeitos, mantemos os valores anteriores
    if (skill.statusEffect === 'poison') {
      effectValue = Math.max(4, Math.floor(result.damage * 0.12)); // 12% do dano ou no mínimo 4
    } else if (skill.statusEffect === 'bleed') {
      effectValue = Math.max(7, Math.floor(result.damage * 0.18)); // 18% do dano ou no mínimo 7
    }
    
    // Sorteia a duração do efeito entre 1 e o valor máximo definido na habilidade
    const randomDuration = Math.floor(Math.random() * skill.statusEffectDuration) + 1;
    
    result.statusEffects.push({
      type: skill.statusEffect,
      chance: skill.statusEffectChance,
      duration: randomDuration, // Usa a duração sorteada ao invés do valor fixo
      value: effectValue,
      applied: statusApplied
    });
  }

  // Processar buffs
  if (skill.buffType && skill.buffValue) {
    result.buffs.push({
      attribute: skill.buffType,
      value: skill.buffValue,
      duration: 3, // 3 turnos padrão
      applied: true
    });
  }

  // Processar debuffs
  if (skill.debuffType && skill.debuffValue) {
    result.debuffs.push({
      attribute: skill.debuffType,
      value: skill.debuffValue,
      duration: 3, // 3 turnos padrão
      applied: true
    });
  }

  return result;
};

/**
 * Executa um turno da batalha, processando todas as ações
 */
export const executeBattleTurn = async (
  battleId: string, 
  actions: BattleAction[]
): Promise<{ 
  battle: Battle, 
  participants: BattleParticipant[], 
  actionResults: Record<string, BattleActionResult>,
  isFinished: boolean,
  winnerTeam: string | null
}> => {
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

    // Ordena os participantes por velocidade
    const orderedParticipants = orderParticipantsBySpeed(battle.participants);

    // Processa cada ação na ordem de velocidade dos participantes
    for (const participant of orderedParticipants) {
      // Verifica se este participante tem uma ação para executar
      const action = actions.find(action => action.actorId === participant.id);
      
      if (!action) continue;

      // Verifica se o alvo existe
      const target = battle.participants.find(p => p.id === action.targetId);
      if (!target) continue;

      // Verifica se o participante está impedido de agir por algum efeito de status (stun, freeze)
      const hasStunEffect = await prisma.battleStatusEffect.findFirst({
        where: {
          battleParticipantId: participant.id,
          type: { in: ['stun', 'freeze'] },
          remainingTurns: { gt: 0 }
        }
      });

      if (hasStunEffect) {
        // Participante está impedido de agir
        actionResults[participant.id] = {
          damage: 0,
          isCritical: false,
          accuracy: false,
          statusEffects: [],
          buffs: [],
          debuffs: []
        };
        continue;
      }

      // Busca a skill utilizada
      const skill = await prisma.skill.findUnique({
        where: { id: action.skillId }
      });

      if (!skill) continue;

      // Obtém os tipos elementais
      let attackerType = '';
      let defenderType = '';

      // Determinar os tipos elementais com base no tipo de participante
      if (participant.participantType === 'user' && participant.userId) {
        const user = await prisma.user.findUnique({
          where: { id: participant.userId },
          select: { primaryElementalType: true }
        });
        
        attackerType = user?.primaryElementalType || 'fire';
      } else if (participant.participantType === 'enemy' && participant.enemyId) {
        const enemy = await prisma.enemy.findUnique({
          where: { id: participant.enemyId },
          select: { elementalType: true }
        });
        
        attackerType = enemy?.elementalType || 'fire';
      }

      if (target.participantType === 'user' && target.userId) {
        const user = await prisma.user.findUnique({
          where: { id: target.userId },
          select: { primaryElementalType: true }
        });
        
        defenderType = user?.primaryElementalType || 'fire';
      } else if (target.participantType === 'enemy' && target.enemyId) {
        const enemy = await prisma.enemy.findUnique({
          where: { id: target.enemyId },
          select: { elementalType: true }
        });
        
        defenderType = enemy?.elementalType || 'fire';
      }

      // Calcula o resultado da ação
      const result = calculateDamage(participant, target, skill);
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

        // Aplica efeitos de status
        for (const effect of result.statusEffects) {
          if (effect.applied) {
            // Verifica se já existe algum efeito de status ativo
            const existingEffects = await prisma.battleStatusEffect.findMany({
              where: {
                battleParticipantId: target.id,
                remainingTurns: { gt: 0 }
              }
            });
            
            // Se já existir algum efeito ativo, não aplica o novo
            if (existingEffects.length > 0) {
              // Adiciona uma mensagem ao resultado
              if (!result.messages) {
                result.messages = [];
              }
              result.messages.push(
                `${target.participantType === 'user' ? 'Usuário' : 'Inimigo'} já possui o efeito ${existingEffects[0].type} ativo. Não é possível aplicar ${effect.type}.`
              );
              continue;
            }
            
            await prisma.battleStatusEffect.create({
              data: {
                battleParticipantId: target.id,
                type: effect.type,
                remainingTurns: effect.duration,
                value: effect.value
              }
            });
            
            // Aplica efeitos específicos adicionais
            if (effect.type === 'burn') {
              // Reduz o ataque físico em 30% quando aplicar o efeito burn
              const physicalAttackReduction = Math.floor(target.currentPhysicalAttack * 0.3);
              await prisma.battleParticipant.update({
                where: { id: target.id },
                data: {
                  currentPhysicalAttack: {
                    decrement: physicalAttackReduction
                  }
                }
              });
            }
          }
        }

        // Aplica buffs ao atacante
        for (const buff of result.buffs) {
          if (buff.applied) {
            await prisma.battleBuff.create({
              data: {
                battleParticipantId: participant.id,
                attribute: buff.attribute,
                value: buff.value,
                remainingTurns: buff.duration,
                stackCount: 1
              }
            });

            // Aplica o efeito do buff aos atributos do participante
            const updateData: any = {};
            switch (buff.attribute) {
              case 'physicalAttack':
                updateData.currentPhysicalAttack = { increment: buff.value };
                break;
              case 'specialAttack':
                updateData.currentSpecialAttack = { increment: buff.value };
                break;
              case 'physicalDefense':
                updateData.currentPhysicalDefense = { increment: buff.value };
                break;
              case 'specialDefense':
                updateData.currentSpecialDefense = { increment: buff.value };
                break;
              case 'speed':
                updateData.currentSpeed = { increment: buff.value };
                break;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.battleParticipant.update({
                where: { id: participant.id },
                data: updateData
              });
            }
          }
        }

        // Aplica debuffs ao alvo
        for (const debuff of result.debuffs) {
          if (debuff.applied) {
            await prisma.battleDebuff.create({
              data: {
                battleParticipantId: target.id,
                attribute: debuff.attribute,
                value: debuff.value,
                remainingTurns: debuff.duration,
                stackCount: 1
              }
            });

            // Aplica o efeito do debuff aos atributos do alvo
            const updateData: any = {};
            switch (debuff.attribute) {
              case 'physicalAttack':
                updateData.currentPhysicalAttack = { decrement: debuff.value };
                break;
              case 'specialAttack':
                updateData.currentSpecialAttack = { decrement: debuff.value };
                break;
              case 'physicalDefense':
                updateData.currentPhysicalDefense = { decrement: debuff.value };
                break;
              case 'specialDefense':
                updateData.currentSpecialDefense = { decrement: debuff.value };
                break;
              case 'speed':
                updateData.currentSpeed = { decrement: debuff.value };
                break;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.battleParticipant.update({
                where: { id: target.id },
                data: updateData
              });
            }
          }
        }
      }
    }

    // Processa efeitos contínuos (dano ao longo do tempo)
    for (const participant of battle.participants) {
      // Busca efeitos de status ativos
      const statusEffects = await prisma.battleStatusEffect.findMany({
        where: {
          battleParticipantId: participant.id,
          remainingTurns: { gt: 0 }
        }
      });

      // Aplica dano de efeitos como burn, poison, bleed
      if (statusEffects.length > 0) {
        for (const effect of statusEffects) {
          if (['burn', 'poison', 'bleed'].includes(effect.type)) {
            await prisma.battleParticipant.update({
              where: { id: participant.id },
              data: {
                currentHealth: {
                  decrement: effect.value
                }
              }
            });
          }

          // Reduz a duração dos efeitos
          await prisma.battleStatusEffect.update({
            where: { id: effect.id },
            data: { remainingTurns: { decrement: 1 } }
          });
        }
      }

      // Reduz a duração dos buffs
      await prisma.battleBuff.updateMany({
        where: { 
          battleParticipantId: participant.id,
          remainingTurns: { gt: 0 }
        },
        data: { remainingTurns: { decrement: 1 } }
      });

      // Reduz a duração dos debuffs
      await prisma.battleDebuff.updateMany({
        where: { 
          battleParticipantId: participant.id,
          remainingTurns: { gt: 0 }
        },
        data: { remainingTurns: { decrement: 1 } }
      });
    }

    // Verifica condições de fim de batalha
    const updatedParticipants = await prisma.battleParticipant.findMany({
      where: { battleId: battleId }
    });

    // Verifica se algum time foi totalmente derrotado
    const playerTeamAlive = updatedParticipants.some(p => 
      p.teamId === 'player' && p.currentHealth > 0
    );
    
    const enemyTeamAlive = updatedParticipants.some(p => 
      p.teamId === 'enemy' && p.currentHealth > 0
    );

    let isFinished = false;
    let winnerTeam: string | null = null;
    let winnerId: string | null = null;

    if (!playerTeamAlive) {
      isFinished = true;
      winnerTeam = 'enemy';

      // Encontra o primeiro inimigo vivo para definir como vencedor
      const winnerParticipant = updatedParticipants.find(p => 
        p.teamId === 'enemy' && p.currentHealth > 0
      );
      
      if (winnerParticipant && winnerParticipant.enemyId) {
        winnerId = winnerParticipant.enemyId;
      }
    } else if (!enemyTeamAlive) {
      isFinished = true;
      winnerTeam = 'player';
      
      // Encontra o jogador para definir como vencedor
      const winnerParticipant = updatedParticipants.find(p => 
        p.teamId === 'player' && p.userId
      );
      
      if (winnerParticipant && winnerParticipant.userId) {
        winnerId = winnerParticipant.userId;
      }
    }

    // Atualiza a batalha para o próximo turno ou finaliza
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        currentTurn: { increment: 1 },
        isFinished: isFinished,
        winnerId: winnerId,
        endedAt: isFinished ? new Date() : undefined
      },
      include: {
        participants: {
          include: {
            statusEffects: true,
            buffs: true,
            debuffs: true
          }
        }
      }
    });

    return {
      battle: updatedBattle,
      participants: updatedBattle.participants,
      actionResults,
      isFinished,
      winnerTeam
    };
  } catch (error) {
    console.error('Erro ao executar turno da batalha:', error);
    throw error;
  }
}; 