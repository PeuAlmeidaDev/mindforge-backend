import { Request, Response } from 'express';
import { ApiResponse } from '../types/common';
import { 
  ExtendedDailyGoal, 
  ExtendedGoal, 
  CompleteGoalRequest,
  GoalRewardResult 
} from '../types/goal';
import { ResponseBuilder } from '../utils/response';
import { GoalService } from '../services/goal.service';
import { ValidationError, NotFoundError, ConflictError, InternalServerError } from '../utils/error';

/**
 * Obtém as metas diárias do usuário
 */
export const getDailyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const dailyGoals = await GoalService.getDailyGoals(userId);
    return ResponseBuilder.success(res, dailyGoals);
  } catch (error) {
    console.error('Erro ao obter metas diárias:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Gera novas metas diárias para o usuário
 */
export const generateDailyGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const dailyGoals = await GoalService.generateDailyGoals(userId);
    return ResponseBuilder.success(
      res, 
      dailyGoals, 
      'Metas diárias geradas com sucesso', 
      201
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    if (error instanceof ConflictError) {
      return ResponseBuilder.error(res, error.message);
    }
    console.error('Erro ao gerar metas diárias:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Marca uma meta como concluída
 */
export const completeGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { goalId } = req.params;
    
    const results = await GoalService.completeGoal(userId, { dailyGoalId: goalId });
    
    // Mensagem personalizada se uma habilidade foi desbloqueada
    const message = results.unlockedSkill 
      ? `Meta concluída com sucesso! Você desbloqueou a habilidade: ${results.unlockedSkill.name}`
      : 'Meta concluída com sucesso';
    
    return ResponseBuilder.success(
      res, 
      results, 
      message
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return ResponseBuilder.error(res, error.message, undefined, 404);
    }
    if (error instanceof ConflictError) {
      return ResponseBuilder.error(res, error.message);
    }
    console.error('Erro ao concluir meta:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
}; 