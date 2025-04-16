import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { ValidationError } from '../utils/error';

/**
 * Middleware para validação de entrada usando schemas Zod
 * @param schema Schema de validação
 * @param source Origem dos dados a serem validados (body, query, params)
 */
export const validate = (
  schema: ZodType<any, any, any>,
  source: 'body' | 'query' | 'params' | 'all' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (source === 'all') {
        // Validar todas as fontes de dados
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params
        });
      } else {
        // Validar apenas a fonte especificada
        const data = source === 'body' ? req.body : 
                    source === 'query' ? req.query : req.params;
        await schema.parseAsync(data);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatar os erros do Zod para um formato mais amigável
        const details: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.') || 'value';
          
          if (!details[path]) {
            details[path] = [];
          }
          
          details[path].push(err.message);
        });
        
        next(new ValidationError('Dados de entrada inválidos', details));
      } else {
        next(error);
      }
    }
  };
}; 