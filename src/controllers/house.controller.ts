import { Request, Response } from 'express';
import { prisma } from '../index';

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
    
    return res.status(200).json(houses);
  } catch (error) {
    console.error('Erro ao listar casas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor ao listar casas' });
  }
}; 