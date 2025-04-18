import jwt from 'jsonwebtoken';
import { AuthenticationError } from './error';

/**
 * Interface para padronizar o payload do JWT
 */
export interface JwtPayload {
  id: string;
  username: string;
  email: string;
}

/**
 * Utilitário para operações relacionadas a JWT
 */
export class JwtUtils {
  /**
   * Gera um token JWT com payload consistente
   * @param payload Dados para o token
   * @returns Token JWT
   */
  static generateToken(payload: JwtPayload): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não definido. Configure a variável de ambiente.');
    }
    
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifica e decodifica um token JWT
   * @param token Token JWT
   * @returns Payload decodificado
   */
  static verifyToken(token: string): JwtPayload {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não definido. Configure a variável de ambiente.');
    }
    
    try {
      return jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new AuthenticationError('Token inválido ou expirado');
    }
  }
} 