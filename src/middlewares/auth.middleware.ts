import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { JwtPayload, AuthenticatedRequest } from '../types/user';

// Estender a interface Request para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request extends AuthenticatedRequest {}
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Verificar se o token foi enviado no header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de autenticação não fornecido' 
      });
    }

    // Extrair o token do header (Bearer TOKEN)
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Formato de token inválido' 
      });
    }

    // Verificar e decodificar o token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    
    // Debug logs
    console.log('Token decodificado:', decodedToken);
    console.log('ID no token:', decodedToken.id);
    console.log('Tipo do ID:', typeof decodedToken.id);

    // Verificar se o usuário existe no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Adicionar o usuário ao objeto de requisição
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido ou expirado' 
      });
    }

    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno no servidor' 
    });
  }
}; 