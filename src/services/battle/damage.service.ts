import { BattleParticipant, Skill } from '@prisma/client';
import { BattleActionResult } from '../../types/battle';

/**
 * Calcula a tabela de vantagens/desvantagens elementais
 * @returns multiplicador de dano (0.5 para desvantagem, 1 para neutro, 1.5 para vantagem, 0.5 para mesmo tipo)
 */
export const calculateElementalAdvantage = (
  attackerType: string,
  defenderType: string
): number => {
  // Se o atacante e defensor são do mesmo tipo, causará menos dano (como em Pokémon)
  if (attackerType === defenderType) {
    return 0.5; // Mesmo tipo causará metade do dano
  }

  const advantageTable: Record<string, string[]> = {
    fire: ['nature', 'ice', 'steel', 'bug'],
    water: ['fire', 'earth', 'rock'],
    earth: ['electric', 'poison', 'fire', 'rock', 'steel'],
    air: ['earth', 'fighting', 'bug'],
    light: ['dark', 'ghost'],
    dark: ['light', 'psychic', 'ghost'],
    nature: ['water', 'earth', 'rock'],
    electric: ['water', 'air', 'flying'],
    ice: ['nature', 'air', 'dragon', 'flying'],
    psychic: ['fighting', 'poison'],
    ghost: ['psychic', 'ghost'],
    steel: ['ice', 'rock', 'fairy'],
    poison: ['nature', 'fairy'],
    flying: ['fighting', 'bug', 'nature'],
    rock: ['fire', 'ice', 'flying', 'bug']
  };

  const disadvantageTable: Record<string, string[]> = {
    fire: ['water', 'earth', 'rock'],
    water: ['nature', 'electric'],
    earth: ['water', 'ice', 'nature'],
    air: ['electric', 'ice', 'rock'],
    light: ['dark'],
    dark: ['light', 'fighting', 'bug'],
    nature: ['fire', 'ice', 'poison', 'flying', 'bug'],
    electric: ['earth', 'nature'],
    ice: ['fire', 'fighting', 'rock', 'steel'],
    psychic: ['dark', 'ghost', 'bug'],
    ghost: ['dark'],
    steel: ['fire', 'fighting', 'earth'],
    poison: ['steel', 'earth', 'psychic'],
    flying: ['electric', 'ice', 'rock'],
    rock: ['water', 'nature', 'fighting', 'earth', 'steel']
  };

  // Imunidades completas (como em Pokémon)
  const immunities: Record<string, string[]> = {
    earth: ['electric'],
    ghost: ['fighting', 'normal'],
    dark: ['psychic'],
    flying: ['earth']
  };

  // Verificar imunidades primeiro (dano zero)
  if (immunities[defenderType]?.includes(attackerType)) {
    return 0; // Imune: não causa dano
  }
  
  // Verifica vantagem
  if (advantageTable[attackerType]?.includes(defenderType)) {
    return 1.5; // Super efetivo: 50% mais dano
  }
  
  // Verifica desvantagem
  if (disadvantageTable[attackerType]?.includes(defenderType)) {
    return 0.5; // Não muito efetivo: 50% menos dano
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
  skill: Skill,
  attackerType: string = 'fire',
  defenderType: string = 'fire'
): BattleActionResult => {
  // Resultado inicial
  const result: BattleActionResult = {
    damage: 0,
    isCritical: false,
    accuracy: true,
    statusEffects: [],
    buffs: [],
    debuffs: [],
    messages: [] // Inicializamos o array de mensagens
  };

  // Log para debug
  console.log(`Calculando dano - Skill: ${skill.name}, Precisão: ${skill.accuracy}%`);

  // Verifica acurácia - Skills com 100% de precisão sempre acertam
  if (skill.accuracy < 100 && Math.random() * 100 > skill.accuracy) {
    console.log(`Ataque errou! Random roll > ${skill.accuracy}`);
    result.accuracy = false;
    result.messages.push('O ataque errou!');
    return result;
  }

  console.log(`Ataque acertou! Skill tem ${skill.accuracy}% de precisão.`);

  // Determina se é ataque físico ou especial baseado no campo attackType
  const isPhysical = skill.attackType === 'physical';
  
  // Pega o ataque e defesa relevantes
  const attack = isPhysical ? attacker.currentPhysicalAttack : attacker.currentSpecialAttack;
  const defense = isPhysical ? defender.currentPhysicalDefense : defender.currentSpecialDefense;

  // Calcular bônus de mesmo tipo (STAB - Same Type Attack Bonus)
  // Se o tipo da skill for igual ao tipo do atacante, recebe um bônus de 50%
  const stabBonus = skill.elementalType === attackerType ? 1.5 : 1.0;

  // Calcular vantagem/desvantagem elemental (inclui verificação para mesmo tipo entre atacante e defensor)
  const typeAdvantage = calculateElementalAdvantage(skill.elementalType, defenderType);

  // Adiciona mensagem sobre vantagem/desvantagem de tipo
  if (typeAdvantage > 1.0) {
    result.messages.push(`É super efetivo!`);
  } else if (typeAdvantage < 1.0 && typeAdvantage > 0) {
    result.messages.push(`Não é muito efetivo...`);
  } else if (typeAdvantage === 0) {
    result.messages.push(`Não afeta o oponente...`);
  }

  // Chance de crítico (5%)
  const isCritical = Math.random() < 0.05;
  const criticalMultiplier = isCritical ? 1.5 : 1.0;

  // Variação aleatória (85% a 100%)
  const randomFactor = 0.85 + (Math.random() * 0.15);

  // Fórmula de cálculo de dano
  // (((2 * Nível / 5 + 2) * Poder * Ataque / Defesa) / 50 + 2) * Modificadores
  // Simplificando para nosso caso:
  const baseDamage = ((attack / defense) * skill.baseDamage);
  
  // Se o tipo for imune (typeAdvantage === 0), não causa dano
  if (typeAdvantage === 0) {
    result.damage = 0;
  } else {
    const damage = Math.floor(
      baseDamage * stabBonus * typeAdvantage * criticalMultiplier * randomFactor
    );
    result.damage = Math.max(1, damage); // No mínimo 1 de dano, exceto para imunidades
  }
  
  result.isCritical = isCritical;

  // Se for crítico, adiciona uma mensagem
  if (isCritical) {
    result.messages.push(`Acerto crítico!`);
  }

  // Processar efeitos de status
  if (skill.statusEffect && skill.statusEffectChance && skill.statusEffectDuration) {
    const statusApplied = Math.random() * 100 <= skill.statusEffectChance;
    
    // Define valores específicos para cada tipo de efeito
    let effectValue = 0;
    
    // Calcula o valor do efeito baseado no tipo
    if (skill.statusEffect === 'burn') {
      // Burn: -1/15 da vida máxima por turno (estimando vida máxima como 15x a vida atual)
      effectValue = Math.ceil(defender.currentHealth / 15);
    } else if (skill.statusEffect === 'poison') {
      // Poison: -1/10 da vida máxima por turno (estimando vida máxima como 10x a vida atual)
      effectValue = Math.ceil(defender.currentHealth / 10);
    } else if (skill.statusEffect === 'bleed') {
      // Bleed: valor arbitrário, mantemos o cálculo anterior
      effectValue = Math.max(7, Math.floor(result.damage * 0.18));
    }
    
    // Sorteia a duração do efeito entre 1 e o valor máximo definido na habilidade
    const randomDuration = Math.floor(Math.random() * skill.statusEffectDuration) + 1;
    
    result.statusEffects.push({
      type: skill.statusEffect,
      chance: skill.statusEffectChance,
      duration: randomDuration,
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