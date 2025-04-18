import { Battle, BattleParticipant, Skill, User, Enemy } from '@prisma/client';
import { AttributeType, ElementalType, StatusEffect, TargetType } from './common';

/**
 * Ação de batalha (input do jogador/IA)
 */
export interface BattleAction {
  actorId: string;
  targetId: string;
  skillId: string;
}

/**
 * Efeito de status em batalha
 */
export interface StatusEffectData {
  type: string;
  chance: number;
  duration: number;
  value: number;
  applied: boolean;
}

/**
 * Buff em batalha
 */
export interface BuffData {
  attribute: string;
  value: number;
  duration: number;
  applied: boolean;
}

/**
 * Resultado de uma ação de batalha
 */
export interface BattleActionResult {
  damage: number;
  isCritical: boolean;
  accuracy: boolean;
  statusEffects: StatusEffectData[];
  buffs: BuffData[];
  debuffs: BuffData[];
  messages: string[];
}

/**
 * Resultado de um turno de batalha
 */
export interface BattleTurnResult {
  battle: Battle;
  participants: BattleParticipant[];
  turnNumber?: number;
  playerActions?: Record<string, BattleActionResult>;
  enemyActions?: Record<string, BattleActionResult>;
  actionResults: Record<string, BattleActionResult>;
  isFinished: boolean;
  winnerTeam: string | null;
}

/**
 * Dados para criar uma nova batalha
 */
export interface CreateBattleData {
  userId: string;
  enemyCount?: number;
  difficulty?: BattleDifficulty;
  isBossEncounter?: boolean;
}

/**
 * Dificuldade da batalha
 */
export enum BattleDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXTREME = 'extreme'
}

/**
 * Dados de participante estendidos (com informação adicional)
 */
export interface ExtendedBattleParticipant extends BattleParticipant {
  user?: User;
  enemy?: Enemy;
  elementalType: string;
  secondaryElementalType?: string | null;
  skills: Skill[];
  statusEffects: {
    type: string;
    value: number;
    remainingDuration: number;
  }[];
  buffs: {
    attribute: string;
    value: number;
    remainingDuration: number;
  }[];
  debuffs: {
    attribute: string;
    value: number;
    remainingDuration: number;
  }[];
}

/**
 * Resposta formatada de batalha
 */
export interface BattleResponse {
  id: string;
  currentTurn: number;
  isFinished: boolean;
  winnerId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  participants: ExtendedBattleParticipant[];
  userTeam: string;
}

/**
 * Interface para requisição de ação em batalha
 */
export interface BattleActionRequest {
  actions: BattleAction[];
} 