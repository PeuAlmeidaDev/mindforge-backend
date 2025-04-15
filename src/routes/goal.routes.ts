import { Router } from 'express';
import { getDailyGoals, generateDailyGoals, completeGoal } from '../controllers/goal.controller';

const router = Router();

/**
 * @route   GET /api/goals/daily
 * @desc    Obtém as metas diárias do usuário
 * @access  Privado
 */
router.get('/daily', getDailyGoals);

/**
 * @route   POST /api/goals/generate
 * @desc    Gera novas metas diárias para o usuário
 * @access  Privado
 */
router.post('/generate', generateDailyGoals);

/**
 * @route   PUT /api/goals/complete/:goalId
 * @desc    Marca uma meta como concluída
 * @access  Privado
 */
router.put('/complete/:goalId', completeGoal);

export default router; 