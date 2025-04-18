import { Router } from 'express';
import { validate } from '../middlewares/validation.middleware';
import { getProfile, updateAttributes, manageEquippedSkills } from '../controllers/user.controller';
import { z } from 'zod';
import { uuidSchema } from '../validators/common';

const router = Router();

// Schemas de validação
const attributesUpdateSchema = z.object({
  strength: z.number().int().min(1).max(100).optional(),
  intelligence: z.number().int().min(1).max(100).optional(),
  agility: z.number().int().min(1).max(100).optional(),
  constitution: z.number().int().min(1).max(100).optional(),
  wisdom: z.number().int().min(1).max(100).optional(),
});

const skillsUpdateSchema = z.object({
  equippedSkills: z.array(uuidSchema).max(4)
});

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
router.put('/attributes', validate(attributesUpdateSchema), updateAttributes);

/**
 * @route   PUT /api/users/skills
 * @desc    Gerencia as habilidades equipadas do usuário
 * @access  Privado
 */
router.put('/skills', validate(skillsUpdateSchema), manageEquippedSkills);

export default router; 