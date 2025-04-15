import { Router } from 'express';
import { getProfile, updateAttributes, manageEquippedSkills } from '../controllers/user.controller';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Obtém o perfil do usuário autenticado
 * @access  Privado
 */
router.get('/profile', getProfile);

/**
 * @route   PUT /api/users/attributes
 * @desc    Atualiza os atributos do usuário
 * @access  Privado
 */
router.put('/attributes', updateAttributes);

/**
 * @route   PUT /api/users/skills
 * @desc    Gerencia as habilidades equipadas do usuário
 * @access  Privado
 */
router.put('/skills', manageEquippedSkills);

export default router; 