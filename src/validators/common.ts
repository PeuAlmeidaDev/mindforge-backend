import { z } from 'zod';
import { ElementalType, StatusEffect, AttributeType, AttackType, TargetType } from '../types/common';

/**
 * Schemas de validação compartilhados
 */

// Schema para validação de UUIDs
export const uuidSchema = z.string().uuid({ message: 'ID inválido, deve ser um UUID válido' });

// Schema para validação de email
export const emailSchema = z.string().email({ message: 'Email inválido' });

// Schema para validação de senha
export const passwordSchema = z
  .string()
  .min(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  .regex(/[A-Z]/, { message: 'A senha deve conter pelo menos uma letra maiúscula' })
  .regex(/[a-z]/, { message: 'A senha deve conter pelo menos uma letra minúscula' })
  .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número' });

// Schema para validação de paginação
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

// Schema para validação de tipos elementais
export const elementalTypeSchema = z.nativeEnum(ElementalType, {
  errorMap: () => ({ message: 'Tipo elemental inválido' })
});

// Schema para validação de efeitos de status
export const statusEffectSchema = z.nativeEnum(StatusEffect, {
  errorMap: () => ({ message: 'Efeito de status inválido' })
});

// Schema para validação de tipos de atributos
export const attributeTypeSchema = z.nativeEnum(AttributeType, {
  errorMap: () => ({ message: 'Tipo de atributo inválido' })
});

// Schema para validação de tipos de ataque
export const attackTypeSchema = z.nativeEnum(AttackType, {
  errorMap: () => ({ message: 'Tipo de ataque inválido' })
});

// Schema para validação de tipos de alvo
export const targetTypeSchema = z.nativeEnum(TargetType, {
  errorMap: () => ({ message: 'Tipo de alvo inválido' })
});

// Schema para validação de nome/título
export const nameSchema = z.string().min(2).max(100);

// Schema para validação de descrição
export const descriptionSchema = z.string().min(5).max(500);

// Schema para validação de porcentagem (0-100)
export const percentageSchema = z.number().min(0).max(100);

// Schema para validação de valor positivo
export const positiveNumberSchema = z.number().positive(); 