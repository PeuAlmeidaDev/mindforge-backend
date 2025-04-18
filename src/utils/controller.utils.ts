import { Request, Response } from 'express';
import { ResponseBuilder } from './response';
import { ValidationError, NotFoundError, AuthenticationError, ConflictError, InternalServerError } from './error';

/**
 * Tipo para função de controller que retorna uma Promise
 */
export type ControllerFunction = (req: Request, res: Response) => Promise<any>;

/**
 * Wrapper para controllers que padroniza o tratamento de erros
 * @param controllerFn Função do controller a ser executada
 * @returns Função de middleware do Express com tratamento de erros padronizado
 */
export const controllerHandler = (controllerFn: ControllerFunction) => {
  return async (req: Request, res: Response) => {
    try {
      await controllerFn(req, res);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        return ResponseBuilder.error(res, error.message, error.details, 400);
      }
      
      if (error instanceof NotFoundError) {
        return ResponseBuilder.error(res, error.message, undefined, 404);
      }
      
      if (error instanceof AuthenticationError) {
        return ResponseBuilder.error(res, error.message, undefined, 401);
      }
      
      if (error instanceof ConflictError) {
        return ResponseBuilder.error(res, error.message, undefined, 409);
      }
      
      // Log do erro para debugging (apenas detalhes técnicos em ambiente de desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro no controller:', error);
      } else {
        // Em produção, log mais simples sem stacktrace completa
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Erro no controller:', errorMessage);
      }
      
      return ResponseBuilder.error(
        res, 
        error instanceof Error ? error.message : 'Erro interno no servidor',
        undefined,
        500
      );
    }
  };
}; 