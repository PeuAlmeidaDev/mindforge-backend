import { z } from 'zod';
import { emailSchema, passwordSchema, uuidSchema } from './common';

/**
 * Schemas para validação de usuários
 */

// Schema para validação de registro de usuário
export const userRegisterSchema = z.object({
  username: z.string()
    .min(3, { message: 'O nome de usuário deve ter pelo menos 3 caracteres' })
    .max(30, { message: 'O nome de usuário deve ter no máximo 30 caracteres' }),
  
  email: z.string()
    .email({ message: 'E-mail inválido' }),
  
  password: z.string()
    .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
    .regex(/[A-Z]/, { message: 'A senha deve ter pelo menos uma letra maiúscula' })
    .regex(/[a-z]/, { message: 'A senha deve ter pelo menos uma letra minúscula' })
    .regex(/[0-9]/, { message: 'A senha deve ter pelo menos um número' }),
  
  primaryElementalType: z.string()
    .refine(type => ['FIRE', 'WATER', 'EARTH', 'AIR', 'LIGHT', 'DARK', 'NORMAL', 'POISON', 'ELECTRIC', 'ICE', 'PSYCHIC', 'GHOST', 'DRAGON', 'FAIRY'].includes(type), {
      message: 'Tipo elemental inválido'
    }),
  
  interests: z.array(z.string())
    .min(1, { message: 'Selecione pelo menos um interesse' })
});

// Schema para validação de login
export const userLoginSchema = z.object({
  email: z.string()
    .email({ message: 'E-mail inválido' }),
  
  password: z.string()
    .min(1, { message: 'Senha é obrigatória' })
});

// Schema para validação de atualização de usuário
export const userUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  passwordConfirmation: z.string().optional(),
  avatar: z.string().url({ message: 'URL de avatar inválida' }).optional()
}).refine(
  (data) => !data.password || !data.passwordConfirmation || data.password === data.passwordConfirmation, 
  { 
    message: 'As senhas não conferem', 
    path: ['passwordConfirmation'] 
  }
);

// Schema para validação de alteração de senha
export const passwordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(
  (data) => data.newPassword === data.confirmPassword, 
  { 
    message: 'As senhas não conferem', 
    path: ['confirmPassword'] 
  }
);

// Schema para validação de parâmetros de ID em rotas
export const userIdParamSchema = z.object({
  id: uuidSchema
});

// Schema para atualização de atributos
export const updateAttributesSchema = z.object({
  health: z.number().int().optional(),
  physicalAttack: z.number().int().optional(),
  specialAttack: z.number().int().optional(),
  physicalDefense: z.number().int().optional(),
  specialDefense: z.number().int().optional(),
  speed: z.number().int().optional()
}).refine(data => {
  const sum = Object.values(data).reduce((acc, val) => acc + (val || 0), 0);
  return sum > 0;
}, {
  message: 'Pelo menos um atributo deve ser atualizado'
});

// Schema para gerenciamento de habilidades equipadas
export const manageEquippedSkillsSchema = z.object({
  equippedSkills: z.array(z.string())
    .min(1, { message: 'Selecione pelo menos uma habilidade' })
    .max(4, { message: 'Você pode equipar no máximo 4 habilidades' })
}); 