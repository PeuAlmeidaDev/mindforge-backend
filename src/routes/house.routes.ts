import { Router } from 'express';
import { listHouses } from '../controllers/house.controller';

const router = Router();

/**
 * @route   GET /api/houses
 * @desc    Lista todas as casas disponíveis
 * @access  Public
 */
router.get('/', listHouses);

export default router; 