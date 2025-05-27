import { BattleParticipant, Battle, Skill } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { 
  BattleAction, 
  BattleActionResult, 
  BattleTurnResult,
  StatusEffectData,
  BuffData
} from '../types/battle';
import { ElementalType, AttackType } from '../types/common';
import * as damageService from './battle/damage.service';
import * as effectsService from './battle/effects.service';
import * as turnService from './battle/turn.service';
import * as stateService from './battle/state.service';

/**
 * Ordena os participantes da batalha por velocidade
 */
export const orderParticipantsBySpeed = turnService.orderParticipantsBySpeed;

/**
 * Calcula a tabela de vantagens/desvantagens elementais
 * @returns multiplicador de dano (0.5 para desvantagem, 1 para neutro, 1.5 para vantagem)
 */
export const calculateElementalAdvantage = damageService.calculateElementalAdvantage;

/**
 * Calcula o dano de um ataque
 */
export const calculateDamage = damageService.calculateDamage;

/**
 * Executa um turno da batalha, processando todas as ações
 */
export const executeBattleTurn = turnService.executeBattleTurn;

/**
 * Verifica o estado da batalha
 */
export const checkBattleState = stateService.checkBattleState;

/**
 * Inicializa uma nova batalha
 */
export const initializeBattle = stateService.initializeBattle;

/**
 * Finaliza uma batalha
 */
export const finalizeBattle = stateService.finalizeBattle; 