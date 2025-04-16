import { Goal, UserDailyGoal, Interest } from '@prisma/client';

/**
 * Meta diária estendida com informações adicionais
 */
export interface ExtendedDailyGoal extends UserDailyGoal {
  goal: ExtendedGoal;
}

/**
 * Meta estendida com interesses relacionados
 */
export interface ExtendedGoal extends Goal {
  interests: Interest[];
}

/**
 * Interface para completar uma meta
 */
export interface CompleteGoalRequest {
  dailyGoalId: string;
}

/**
 * Resultado de recompensa ao completar meta
 */
export interface GoalRewardResult {
  goal: any;
  rewards: {
    health: number;
    physicalAttack: number;
    specialAttack: number;
    physicalDefense: number;
    specialDefense: number;
    speed: number;
  };
  user: {
    id: string;
    attributes: any;
  };
  unlockedSkill?: any;
}

/**
 * Interface para geração de metas diárias
 */
export interface GenerateGoalsResult {
  dailyGoals: ExtendedDailyGoal[];
}

/**
 * Dados de progresso do usuário
 */
export interface UserProgressData {
  completedGoalsToday: number;
  totalGoalsToday: number;
  completedGoalsWeek: number;
  totalGoalsWeek: number;
  completedGoalsMonth: number;
  totalGoalsMonth: number;
  completedGoalsTotal: number;
  streakDays: number;
}

/**
 * Filtros para busca de metas
 */
export interface GoalSearchFilters {
  interestIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  completed?: boolean;
} 