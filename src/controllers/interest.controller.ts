import { Request, Response } from 'express';
import { prisma } from '../index';
import { ResponseBuilder } from '../utils/response';

/**
 * Lista todos os interesses disponíveis
 */
export const listInterests = async (req: Request, res: Response) => {
  try {
    const interests = await prisma.interest.findMany({
      select: {
        id: true,
        name: true,
        description: true
      }
    });
    
    return ResponseBuilder.success(res, interests);
  } catch (error) {
    console.error('Erro ao listar interesses:', error);
    return ResponseBuilder.error(res, 'Erro interno do servidor ao listar interesses', undefined, 500);
  }
}; 