import { z } from 'zod';
import { descriptionSchema, nameSchema, uuidSchema } from './common';

/**
 * Schemas para validação de metas
 */

// Schema para validação de criação de meta
export const goalCreateSchema = z.object({
  title: nameSchema.min(3, { message: 'Título deve ter pelo menos 3 caracteres' }),
  description: descriptionSchema,
  deadline: z.string().datetime({ message: 'Data limite inválida' }).optional(),
  difficulty: z.number().int().min(1).max(5),
  type: z.enum(['daily', 'weekly', 'monthly', 'personal'], {
    errorMap: () => ({ message: 'Tipo de meta inválido' })
  })
});

// Schema para validação de atualização de meta
export const goalUpdateSchema = z.object({
  title: nameSchema.min(3).optional(),
  description: descriptionSchema.optional(),
  deadline: z.string().datetime().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  status: z.enum(['pending', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).optional()
});

// Schema para validação de conclusão de meta
export const goalCompleteSchema = z.object({
  id: uuidSchema,
  completed: z.boolean()
});

// Schema para validação de parâmetros de ID em rotas
export const goalIdParamSchema = z.object({
  id: uuidSchema
});

// Schema para validação de filtros de meta
export const goalFilterSchema = z.object({
  status: z.enum(['all', 'pending', 'completed', 'failed']).optional().default('all'),
  type: z.enum(['all', 'daily', 'weekly', 'monthly', 'personal']).optional().default('all'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}); 