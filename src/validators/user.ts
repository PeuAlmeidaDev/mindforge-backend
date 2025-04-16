import { z } from 'zod';
import { emailSchema, passwordSchema, uuidSchema } from './common';

/**
 * Schemas para validação de usuários
 */

// Schema para validação de registro de usuário
export const userRegisterSchema = z.object({
  username: z.string().min(3, { message: 'Nome de usuário deve ter pelo menos 3 caracteres' }).max(100),
  email: emailSchema,
  password: passwordSchema,
  passwordConfirmation: z.string().optional(),
  primaryElementalType: z.string(),
  interests: z.array(z.string())
}).refine(
  (data) => !data.passwordConfirmation || data.password === data.passwordConfirmation, 
  { 
    message: 'As senhas não conferem', 
    path: ['passwordConfirmation'] 
  }
);

// Schema para validação de login
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Senha é obrigatória' })
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