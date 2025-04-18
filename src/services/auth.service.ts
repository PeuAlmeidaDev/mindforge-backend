
import { AuthRepository } from '../repositories/auth.repository';
import { JwtUtils } from '../utils/jwt.utils';
import { RegisterService, RegisterData } from './register.service';
import { LoginService, LoginCredentials } from './login.service';
import { AuthResponse } from '../types/auth';

// Instância do repositório de autenticação
const authRepository = new AuthRepository();

/**
 * Serviço para autenticação e gestão de usuários
 * Facade que delega para serviços especializados
 */
export class AuthService {
  /**
   * Registra um novo usuário
   * @param userData Dados do usuário
   * @returns Usuário criado e token
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    return RegisterService.register(userData);
  }

  /**
   * Realiza login do usuário
   * @param credentials Credenciais do usuário
   * @returns Usuário e token
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return LoginService.login(credentials);
  }

  /**
   * Verifica um token JWT
   * @param token Token JWT
   * @returns Dados do token decodificado
   */
  static verifyToken(token: string): any {
    return JwtUtils.verifyToken(token);
  }
} 