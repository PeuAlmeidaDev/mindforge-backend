import { ElementalType, AttackType, StatusEffect, AttributeType } from '../types/common';
import { BattleActionResult, BuffData, StatusEffectData } from '../types/battle';

/**
 * Mapa de vantagens elementais (atacante -> [tipos com vantagem])
 */
const ELEMENTAL_ADVANTAGES: Record<ElementalType, ElementalType[]> = {
  [ElementalType.FIRE]: [ElementalType.NATURE, ElementalType.ICE, ElementalType.STEEL],
  [ElementalType.WATER]: [ElementalType.FIRE, ElementalType.EARTH, ElementalType.ROCK],
  [ElementalType.EARTH]: [ElementalType.FIRE, ElementalType.ELECTRIC, ElementalType.POISON, ElementalType.ROCK, ElementalType.STEEL],
  [ElementalType.AIR]: [ElementalType.EARTH, ElementalType.FLYING],
  [ElementalType.LIGHT]: [ElementalType.DARK, ElementalType.GHOST, ElementalType.PSYCHIC],
  [ElementalType.DARK]: [ElementalType.LIGHT, ElementalType.PSYCHIC],
  [ElementalType.NATURE]: [ElementalType.WATER, ElementalType.EARTH, ElementalType.ROCK],
  [ElementalType.ELECTRIC]: [ElementalType.WATER, ElementalType.AIR, ElementalType.FLYING],
  [ElementalType.ICE]: [ElementalType.NATURE, ElementalType.EARTH, ElementalType.FLYING],
  [ElementalType.PSYCHIC]: [ElementalType.DARK, ElementalType.GHOST],
  [ElementalType.GHOST]: [ElementalType.PSYCHIC],
  [ElementalType.STEEL]: [ElementalType.ICE, ElementalType.ROCK],
  [ElementalType.POISON]: [ElementalType.NATURE],
  [ElementalType.FLYING]: [ElementalType.NATURE],
  [ElementalType.ROCK]: [ElementalType.FIRE, ElementalType.FLYING, ElementalType.ICE]
};

/**
 * Utilitários para cálculos relacionados a batalha
 */
export const BattleUtils = {
  /**
   * Verifica se um tipo elemental tem vantagem sobre outro
   * @param attackerType Tipo do atacante
   * @param defenderType Tipo do defensor
   * @returns Verdadeiro se o atacante tem vantagem
   */
  hasTypeAdvantage(attackerType: ElementalType, defenderType: ElementalType): boolean {
    // Se o tipo da skill for igual ao tipo do defensor, é desvantagem (no estilo Pokémon)
    if (attackerType === defenderType) {
      return false;
    }
    
    // Verificar imunidades - usando objetos parciais já que não definimos imunidades para todos os tipos
    const immunities: Partial<Record<ElementalType, ElementalType[]>> = {
      [ElementalType.EARTH]: [ElementalType.ELECTRIC],
      [ElementalType.GHOST]: [ElementalType.PSYCHIC], // Ghost é imune a Fighting, mas não temos essa constante
      [ElementalType.DARK]: [ElementalType.PSYCHIC],
      [ElementalType.FLYING]: [ElementalType.EARTH]
    };
    
    if (defenderType in immunities && immunities[defenderType]?.includes(attackerType)) {
      return false; // O defensor é imune ao tipo do atacante
    }
    
    return ELEMENTAL_ADVANTAGES[attackerType]?.includes(defenderType) || false;
  },

  /**
   * Calcula o dano base de um ataque
   * @param power Poder da skill
   * @param attackValue Valor de ataque do atacante
   * @param defenseValue Valor de defesa do defensor
   * @returns Dano base calculado
   */
  calculateBaseDamage(power: number, attackValue: number, defenseValue: number): number {
    // Evitar divisão por zero
    const defense = Math.max(defenseValue, 1);
    return (power * attackValue) / defense;
  },

  /**
   * Calcula dano com todos os modificadores
   * @param power Poder da skill
   * @param attackValue Valor de ataque (já com buffs aplicados)
   * @param defenseValue Valor de defesa (já com buffs aplicados)
   * @param skillType Tipo elemental da skill
   * @param attackerType Tipo elemental do atacante
   * @param defenderType Tipo elemental do defensor
   * @returns Dano final calculado
   */
  calculateDamage(
    power: number,
    attackValue: number,
    defenseValue: number,
    skillType: ElementalType,
    attackerType: ElementalType,
    defenderType: ElementalType
  ): number {
    let damage = this.calculateBaseDamage(power, attackValue, defenseValue);
    
    // Bônus de afinidade (mesmo tipo do atacante = bônus)
    if (skillType === attackerType) {
      damage *= 1.5; // STAB - Same Type Attack Bonus (como em Pokémon)
    }
    
    // Penalidade para mesmo tipo (atacante = defensor)
    if (skillType === defenderType) {
      damage *= 0.5; // Menos efetivo contra mesmo tipo
    } else {
      // Vantagem/desvantagem de tipo
      if (this.hasTypeAdvantage(skillType, defenderType)) {
        damage *= 2.0; // Super efetivo (como em Pokémon)
      } else if (this.hasTypeAdvantage(defenderType, skillType)) {
        damage *= 0.5; // Não muito efetivo
      }
      
      // Verificar imunidades
      const immunities: Partial<Record<ElementalType, ElementalType[]>> = {
        [ElementalType.EARTH]: [ElementalType.ELECTRIC],
        [ElementalType.GHOST]: [ElementalType.PSYCHIC], 
        [ElementalType.DARK]: [ElementalType.PSYCHIC],
        [ElementalType.FLYING]: [ElementalType.EARTH]
      };
      
      if (defenderType in immunities && immunities[defenderType]?.includes(skillType)) {
        return 0; // Imune ao dano
      }
    }
    
    // Arredondar e garantir que seja no mínimo 1
    return Math.max(Math.round(damage), 1);
  },

  /**
   * Verifica se um ataque acerta com base na precisão
   * @param accuracy Precisão da skill (0-100)
   * @returns Verdadeiro se o ataque acertar
   */
  checkAccuracy(accuracy: number): boolean {
    return Math.random() * 100 <= accuracy;
  },

  /**
   * Verifica se um ataque é crítico
   * @param critChance Chance de crítico (0-100)
   * @returns Verdadeiro se for crítico
   */
  isCriticalHit(critChance: number = 10): boolean {
    return Math.random() * 100 <= critChance;
  },

  /**
   * Calcula o valor pós-aplicação de buffs
   * @param baseValue Valor base do atributo
   * @param buffs Array de buffs aplicados
   * @param attributeType Tipo de atributo
   * @returns Valor com buffs aplicados
   */
  applyBuffsToAttribute(
    baseValue: number,
    buffs: BuffData[],
    attributeType: AttributeType
  ): number {
    const relevantBuffs = buffs.filter(buff => buff.attribute === attributeType);
    const totalModifier = relevantBuffs.reduce((sum, buff) => sum + buff.value, 0);
    
    // Limitar modificadores a +/- 100%
    const cappedModifier = Math.max(Math.min(totalModifier, 1.0), -0.9);
    return baseValue * (1 + cappedModifier);
  },

  /**
   * Cria um objeto de resultado de ação de batalha
   * @param damage Dano causado
   * @param isCritical Se o ataque foi crítico
   * @param accuracy Se o ataque acertou
   * @param statusEffects Efeitos de status aplicados
   * @param buffs Buffs aplicados
   * @param debuffs Debuffs aplicados
   * @param messages Mensagens associadas à ação
   * @returns Objeto resultado da ação
   */
  createActionResult(
    damage: number = 0,
    isCritical: boolean = false,
    accuracy: boolean = true,
    statusEffects: StatusEffectData[] = [],
    buffs: BuffData[] = [],
    debuffs: BuffData[] = [],
    messages: string[] = []
  ): BattleActionResult {
    return {
      damage,
      isCritical,
      accuracy,
      statusEffects,
      buffs,
      debuffs,
      messages
    };
  },

  /**
   * Verifica se um efeito de status é aplicado com base na chance
   * @param chance Chance de aplicação (0-100)
   * @returns Verdadeiro se o efeito for aplicado
   */
  isStatusEffectApplied(chance: number): boolean {
    return Math.random() * 100 <= chance;
  },

  /**
   * Calcula o valor de dano de efeito por porcentagem de vida máxima
   * @param maxHealth Saúde máxima do alvo
   * @param percentage Porcentagem a ser aplicada (0-1)
   * @returns Valor de dano calculado
   */
  calculateEffectDamage(maxHealth: number, percentage: number): number {
    return Math.round(maxHealth * percentage);
  }
}; 