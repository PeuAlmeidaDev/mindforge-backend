import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  register,
  login,
  verifyToken
} from '../controllers/auth.controller';
import { getProfile } from '../controllers/user.controller';
import { userLoginSchema, userRegisterSchema } from '../validators/user';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário
 * @access  Público
 */
router.post('/register', validate(userRegisterSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Autentica um usuário existente
 * @access  Público
 */
router.post('/login', validate(userLoginSchema), login);

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