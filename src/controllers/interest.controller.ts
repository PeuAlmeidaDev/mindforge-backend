import { Request, Response } from 'express';
import { prisma } from '../index';

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
    
    return res.status(200).json(interests);
  } catch (error) {
    console.error('Erro ao listar interesses:', error);
    return res.status(500).json({ message: 'Erro interno do servidor ao listar interesses' });
  }
}; 