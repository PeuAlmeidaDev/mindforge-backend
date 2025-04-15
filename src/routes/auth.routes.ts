import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  register,
  login,
  verifyToken
} from '../controllers/auth.controller';
import { getProfile } from '../controllers/user.controller';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário
 * @access  Público
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Autentica um usuário existente
 * @access  Público
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/verify
 * @desc    Verifica se o token é válido
 * @access  Privado
 */
router.get('/verify', authMiddleware, verifyToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtém os dados do perfil do usuário autenticado
 * @access  Privado
 */
router.get('/profile', authMiddleware, getProfile);

export default router; 