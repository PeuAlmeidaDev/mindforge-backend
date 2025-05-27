import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ResponseBuilder } from '../utils/response';

/**
 * Lista todas as casas disponíveis
 */
export const listHouses = async (req: Request, res: Response) => {
  try {
    const houses = await prisma.house.findMany({
      select: {
        id: true,
        name: true,
        description: true
      }
    });
    
    return ResponseBuilder.success(res, houses);
  } catch (error) {
    console.error('Erro ao listar casas:', error);
    return ResponseBuilder.error(res, 'Erro interno do servidor ao listar casas', undefined, 500);
  }
}; 