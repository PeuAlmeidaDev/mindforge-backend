import { Request, Response, NextFunction } from 'express';
import { AppError, InternalServerError, handlePrismaError } from '../utils/error';
import { ResponseBuilder } from '../utils/response';
import { Prisma } from '@prisma/client';

/**
 * Middleware global para tratamento de erros
 * 
 * Captura todos os erros da aplicação e retorna uma resposta padronizada
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  // Erros do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError || 
      err instanceof Prisma.PrismaClientValidationError) {
    const prismaError = handlePrismaError(err);
    return ResponseBuilder.error(
      res, 
      prismaError.message, 
      prismaError.details, 
      prismaError.statusCode
    );
  }

  // Erros da aplicação
  if (err instanceof AppError) {
    return ResponseBuilder.error(
      res,
      err.message,
      err.details,
      err.statusCode
    );
  }

  // Erros desconhecidos
  const serverError = new InternalServerError();
  
  // Em produção, não enviar detalhes dos erros internos
  if (process.env.NODE_ENV === 'production') {
    return ResponseBuilder.error(
      res,
      serverError.message,
      undefined,
      serverError.statusCode
    );
  }
  
  // Em desenvolvimento, enviar mais detalhes
  return ResponseBuilder.error(
    res,
    serverError.message,
    {
      originalError: [err.message],
      stack: err.stack ? err.stack.split('\n') : []
    },
    serverError.statusCode
  );
}; 