import { Router } from 'express';
import { listInterests } from '../controllers/interest.controller';

const router = Router();

/**
 * @route   GET /api/interests
 * @desc    Lista todos os interesses disponíveis
 * @access  Public
 */
router.get('/', listInterests);

export default router; 