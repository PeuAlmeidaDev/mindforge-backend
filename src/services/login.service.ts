import { AuthenticationError, InternalServerError } from '../utils/error';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthResponse } from '../types/auth';

// Instância do repositório de autenticação
const authRepository = new AuthRepository();

/**
 * Interface para credenciais de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Serviço para autenticação de usuários
 */
export class LoginService {
  /**
   * Realiza login do usuário
   * @param credentials Credenciais do usuário
   * @returns Usuário e token
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // Realizar login usando o repositório
      const authResult = await authRepository.login(email, password);

      if (!authResult) {
        throw new AuthenticationError('E-mail ou senha incorretos');
      }

      return authResult;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      console.error('Erro ao realizar login:', error);
      throw new InternalServerError('Erro ao realizar login');
    }
  }
} 