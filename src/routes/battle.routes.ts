import { Router } from 'express';
import { getUserBattles, startRandomBattle, getBattleById, processTurnAction, getBattleRewards } from '../controllers/battle.controller';

const router = Router();

/**
 * @route   GET /api/battles
 * @desc    Obtém as batalhas do usuário
 * @access  Privado
 */
router.get('/', getUserBattles);

/**
 * @route   GET /api/battles/:id
 * @desc    Obtém uma batalha específica por ID
 * @access  Privado
 */
router.get('/:id', getBattleById);

/**
 * @route   POST /api/battles/random
 * @desc    Inicia uma batalha aleatória contra inimigos
 * @access  Privado
 */
router.post('/random', startRandomBattle);

/**
 * @route   POST /api/battles/:id/turn
 * @desc    Executa ações de um turno da batalha
 * @access  Privado
 */
router.post('/:id/turn', processTurnAction);

/**
 * @route   GET /api/battles/:id/rewards
 * @desc    Obtém as recompensas de uma batalha finalizada
 * @access  Privado
 */
router.get('/:id/rewards', getBattleRewards);

export default router; 