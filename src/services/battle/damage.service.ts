import { BattleParticipant, Skill } from '@prisma/client';
import { BattleActionResult } from '../../types/battle';

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