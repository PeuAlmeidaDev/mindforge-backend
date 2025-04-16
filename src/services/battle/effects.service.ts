import { prisma } from '../../database/prisma';
import { BattleParticipant, BattleStatusEffect, BattleBuff } from '@prisma/client';
import { StatusEffectData, BuffData } from '../../types/battle';

/**
 * Aplica efeitos de status a um participante da batalha
 */
export const applyStatusEffect = async (
  participantId: string,
  effect: StatusEffectData
): Promise<boolean> => {
  try {
    if (!effect.applied) return false;

    // Verifica se já existe algum efeito de status ativo
    const existingEffects = await prisma.battleStatusEffect.findMany({
      where: {
        battleParticipantId: participantId,
        remainingTurns: { gt: 0 }
      }
    });
    
    // Se já existir algum efeito ativo, não aplica o novo
    if (existingEffects.length > 0) {
      return false;
    }
    
    // Cria o efeito de status
    const newEffect = await prisma.battleStatusEffect.create({
      data: {
        battleParticipantId: participantId,
        type: effect.type,
        remainingTurns: effect.duration,
        value: effect.value
      }
    });

    // Aplica efeitos específicos adicionais
    if (effect.type === 'burn') {
      // Busca o participante para obter o ataque físico atual
      const participant = await prisma.battleParticipant.findUnique({
        where: { id: participantId }
      });

      if (participant) {
        // Reduz o ataque físico em 30% quando aplicar o efeito burn
        const physicalAttackReduction = Math.floor(participant.currentPhysicalAttack * 0.3);
        await prisma.battleParticipant.update({
          where: { id: participantId },
          data: {
            currentPhysicalAttack: {
              decrement: physicalAttackReduction
            }
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Erro ao aplicar efeito de status:', error);
    return false;
  }
};

/**
 * Aplica buffs a um participante da batalha
 */
export const applyBuff = async (
  participantId: string,
  buff: BuffData
): Promise<boolean> => {
  try {
    if (!buff.applied) return false;

    // Cria o buff
    const newBuff = await prisma.battleBuff.create({
      data: {
        battleParticipantId: participantId,
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
        where: { id: participantId },
        data: updateData
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao aplicar buff:', error);
    return false;
  }
};

/**
 * Processa os efeitos de status ativos no início de um turno
 */
export const processStatusEffects = async (
  participants: BattleParticipant[]
): Promise<Record<string, { damage: number, stunned: boolean, messages: string[] }>> => {
  const results: Record<string, { damage: number, stunned: boolean, messages: string[] }> = {};

  for (const participant of participants) {
    results[participant.id] = { damage: 0, stunned: false, messages: [] };

    // Busca os efeitos de status ativos do participante
    const statusEffects = await prisma.battleStatusEffect.findMany({
      where: {
        battleParticipantId: participant.id,
        remainingTurns: { gt: 0 }
      }
    });

    // Processa cada efeito de status
    for (const effect of statusEffects) {
      // Decrementa a duração do efeito
      await prisma.battleStatusEffect.update({
        where: { id: effect.id },
        data: {
          remainingTurns: { decrement: 1 }
        }
      });

      // Se o efeito causar dano ao longo do tempo (burn, poison, bleed)
      if (['burn', 'poison', 'bleed'].includes(effect.type)) {
        // Aplica o dano
        await prisma.battleParticipant.update({
          where: { id: participant.id },
          data: {
            currentHealth: {
              decrement: effect.value
            }
          }
        });

        results[participant.id].damage += effect.value;
        results[participant.id].messages.push(`${getParticipantName(participant)} sofreu ${effect.value} de dano por ${getStatusEffectName(effect.type)}`);
      }

      // Se o efeito impedir ações (stun, freeze)
      if (['stun', 'freeze'].includes(effect.type)) {
        results[participant.id].stunned = true;
        results[participant.id].messages.push(`${getParticipantName(participant)} está ${effect.type === 'stun' ? 'atordoado' : 'congelado'} e não pode agir`);
      }

      // Se o efeito expirou, remove o efeito dos atributos
      if (effect.remainingTurns <= 1) {
        // Se for burn, restaura o ataque físico
        if (effect.type === 'burn') {
          // A redução foi de 30% do ataque original
          const originalAttack = participant.currentPhysicalAttack / 0.7;
          const attackToRestore = originalAttack - participant.currentPhysicalAttack;
          
          await prisma.battleParticipant.update({
            where: { id: participant.id },
            data: {
              currentPhysicalAttack: {
                increment: attackToRestore
              }
            }
          });
        }

        results[participant.id].messages.push(`${getStatusEffectName(effect.type)} em ${getParticipantName(participant)} expirou`);
      }
    }
  }

  return results;
};

/**
 * Processa os buffs ativos no início do turno
 */
export const processBuffs = async (
  participants: BattleParticipant[]
): Promise<Record<string, { messages: string[] }>> => {
  const results: Record<string, { messages: string[] }> = {};

  for (const participant of participants) {
    results[participant.id] = { messages: [] };

    // Busca os buffs ativos do participante
    const buffs = await prisma.battleBuff.findMany({
      where: {
        battleParticipantId: participant.id,
        remainingTurns: { gt: 0 }
      }
    });

    // Processa cada buff
    for (const buff of buffs) {
      // Decrementa a duração do buff
      await prisma.battleBuff.update({
        where: { id: buff.id },
        data: {
          remainingTurns: { decrement: 1 }
        }
      });

      // Se o buff expirou, remove o efeito dos atributos
      if (buff.remainingTurns <= 1) {
        const updateData: any = {};
        switch (buff.attribute) {
          case 'physicalAttack':
            updateData.currentPhysicalAttack = { decrement: buff.value * buff.stackCount };
            break;
          case 'specialAttack':
            updateData.currentSpecialAttack = { decrement: buff.value * buff.stackCount };
            break;
          case 'physicalDefense':
            updateData.currentPhysicalDefense = { decrement: buff.value * buff.stackCount };
            break;
          case 'specialDefense':
            updateData.currentSpecialDefense = { decrement: buff.value * buff.stackCount };
            break;
          case 'speed':
            updateData.currentSpeed = { decrement: buff.value * buff.stackCount };
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.battleParticipant.update({
            where: { id: participant.id },
            data: updateData
          });
        }

        results[participant.id].messages.push(`Buff de ${getAttributeName(buff.attribute)} em ${getParticipantName(participant)} expirou`);
      }
    }
  }

  return results;
};

/**
 * Obtém o nome amigável de um efeito de status
 */
export const getStatusEffectName = (type: string): string => {
  const names: Record<string, string> = {
    burn: 'Queimadura',
    poison: 'Envenenamento',
    stun: 'Atordoamento',
    freeze: 'Congelamento',
    blind: 'Cegueira',
    bleed: 'Sangramento',
    confuse: 'Confusão'
  };
  
  return names[type] || 'Efeito desconhecido';
};

/**
 * Obtém o nome amigável de um atributo
 */
export const getAttributeName = (attribute: string): string => {
  const names: Record<string, string> = {
    physicalAttack: 'Ataque Físico',
    specialAttack: 'Ataque Especial',
    physicalDefense: 'Defesa Física',
    specialDefense: 'Defesa Especial',
    speed: 'Velocidade'
  };
  
  return names[attribute] || 'Atributo desconhecido';
};

/**
 * Obtém o nome de um participante baseado no seu tipo
 */
export const getParticipantName = (participant: BattleParticipant): string => {
  return participant.participantType === 'user' ? 'Jogador' : 'Inimigo';
}; 