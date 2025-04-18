import { ValidationError, ConflictError, InternalServerError } from '../utils/error';
import { determineUserHouse } from './house-assignment.service';
import { InterestService } from './interest.service';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtUtils } from '../utils/jwt.utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '../database/prisma';
import { UserResponse, AuthResponse, InterestResponse } from '../types/auth';

// Instância do repositório de autenticação
const authRepository = new AuthRepository();

/**
 * Interface para dados de registro
 */
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  primaryElementalType: string;
  interests: string[];
}

/**
 * Serviço para registro de usuários
 */
export class RegisterService {
  /**
   * Registra um novo usuário
   * @param userData Dados do usuário
   * @returns Usuário criado e token
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const { username, email, password, primaryElementalType, interests } = userData;

      // Verificações de unicidade
      const emailTaken = await authRepository.isEmailTaken(email);
      if (emailTaken) {
        throw new ConflictError('E-mail já está em uso');
      }

      const usernameTaken = await authRepository.isUsernameTaken(username);
      if (usernameTaken) {
        throw new ConflictError('Nome de usuário já está em uso');
      }

      // Verificar se todos os interesses existem
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
      
      // Converter interesses para o formato esperado
      const interestsFormatted: InterestResponse[] = userInterests.map((ui) => ({
        id: ui.interest.id,
        name: ui.interest.name,
        description: ui.interest.description
      }));
      
      const userResponse: UserResponse = {
        ...userWithoutPassword,
        interests: interestsFormatted
      };

      // Gerar token JWT
      const token = JwtUtils.generateToken({
        id: user.id,
        username: user.username,
        email: user.email
      });

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
} 