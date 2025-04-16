import { prisma } from '../database/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { ValidationError, AuthenticationError, NotFoundError, ConflictError, InternalServerError } from '../utils/error';
import { determineUserHouse } from './house-assignment.service';
import { Validators } from '../utils/validation';
import { InterestService } from './interest.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';
import { AuthRepository, AuthResult } from '../repositories/auth.repository';

// Instância do repositório de autenticação
const authRepository = new AuthRepository();

/**
 * Serviço para autenticação e gestão de usuários
 */
export class AuthService {
  /**
   * Registra um novo usuário
   * @param userData Dados do usuário
   * @returns Usuário criado e token
   */
  static async register(userData: {
    username: string;
    email: string;
    password: string;
    primaryElementalType: string;
    interests: string[];
  }): Promise<{ user: any; token: string }> {
    try {
      const { username, email, password, primaryElementalType, interests } = userData;

      // Validar campos obrigatórios
      if (!username || !email || !password || !primaryElementalType || !interests) {
        throw new ValidationError('Todos os campos são obrigatórios');
      }

      // Validar email
      if (!Validators.isValidEmail(email)) {
        throw new ValidationError('E-mail inválido');
      }

      // Validar força da senha
      if (!Validators.isStrongPassword(password)) {
        throw new ValidationError('A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números');
      }

      // Verificar se o usuário selecionou pelo menos um interesse
      if (!Array.isArray(interests) || interests.length === 0) {
        throw new ValidationError('Selecione pelo menos um interesse');
      }

      // Verificar se o tipo elemental é válido
      if (!Validators.isValidElementalType(primaryElementalType)) {
        throw new ValidationError('Tipo elemental inválido');
      }

      // Verificar se o email já está em uso
      const emailTaken = await authRepository.isEmailTaken(email);
      if (emailTaken) {
        throw new ConflictError('E-mail já está em uso');
      }

      // Verificar se o nome de usuário já está em uso
      const usernameTaken = await authRepository.isUsernameTaken(username);
      if (usernameTaken) {
        throw new ConflictError('Nome de usuário já está em uso');
      }

      // Verificar se todos os interesses existem
      console.log("Interesses recebidos para validação:", interests);
      const interestsExist = await InterestService.validateInterests(interests);
      if (!interestsExist) {
        throw new ValidationError('Um ou mais interesses selecionados não existem');
      }

      // Determinar a casa do usuário com base em seus interesses
      const houseId = await determineUserHouse(interests);

      // Verificar se a casa existe
      const houseExists = await prisma.house.findUnique({
        where: { id: houseId }
      });

      if (!houseExists) {
        throw new ValidationError('Não foi possível determinar uma casa adequada');
      }

      // Criar usuário com os interesses
      const userDataToCreate = {
        username,
        email,
        password,
        primaryElementalType,
        houseId,
        profileImageUrl: null,
        bannerUrl: null,
        secondaryElementalType: null,
        level: 1,
        experience: 0,
        attributePointsToDistribute: 15
      };

      const user = await authRepository.register(userDataToCreate, interests, houseId);

      // Buscar os interesses do usuário para incluir na resposta
      const userInterests = await prisma.userInterest.findMany({
        where: {
          userId: user.id
        },
        include: {
          interest: true
        }
      });

      // Remover a senha da resposta
      const { password: _, ...userWithoutPassword } = user;
      const userResponse = {
        ...userWithoutPassword,
        interests: userInterests.map((ui: any) => ui.interest)
      };

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'mindforge-secret',
        { expiresIn: '7d' }
      );

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      // Tratar erro de unicidade (email ou username já existem)
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])[0];
          throw new ConflictError(`${field === 'email' ? 'E-mail' : 'Nome de usuário'} já está em uso`);
        }
      }

      // Repassar erros de validação
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }

      console.error('Erro ao registrar usuário:', error);
      throw new InternalServerError('Erro ao registrar usuário');
    }
  }

  /**
   * Realiza login do usuário
   * @param credentials Credenciais do usuário
   * @returns Usuário e token
   */
  static async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: any; token: string }> {
    try {
      const { email, password } = credentials;

      // Validar campos
      if (!email || !password) {
        throw new ValidationError('E-mail e senha são obrigatórios');
      }

      // Realizar login usando o repositório
      const authResult = await authRepository.login(email, password);

      if (!authResult) {
        throw new AuthenticationError('E-mail ou senha incorretos');
      }

      return authResult;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }

      console.error('Erro ao realizar login:', error);
      throw new InternalServerError('Erro ao realizar login');
    }
  }

  /**
   * Verifica um token JWT
   * @param token Token JWT
   * @returns Dados do token decodificado
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'mindforge-secret');
    } catch (error) {
      throw new AuthenticationError('Token inválido ou expirado');
    }
  }
} 