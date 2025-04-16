import { User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Interface para resultado de autenticação
 */
export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
}

/**
 * Repositório para operações de autenticação
 */
export class AuthRepository extends BaseRepository<User> {
  constructor() {
    super('user');
  }

  /**
   * Busca um usuário pelo email
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Busca um usuário pelo nome de usuário
   * @param username Nome de usuário
   * @returns Usuário encontrado ou null
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username }
    });
  }

  /**
   * Registra um novo usuário
   * @param userData Dados do usuário
   * @param interestIds IDs dos interesses do usuário
   * @param houseId ID da casa (opcional)
   * @returns Usuário criado
   */
  async register(
    userData: Omit<User, 'id' | 'level' | 'experience' | 'attributePointsToDistribute' | 'createdAt' | 'updatedAt'>,
    interestIds: string[],
    houseId?: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return this.transaction(async (tx) => {
      // Criar o usuário
      const user = await tx.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          houseId: houseId || userData.houseId,
          userInterests: {
            create: interestIds.map(interestId => ({
              interest: {
                connect: {
                  id: interestId
                }
              }
            }))
          },
          attributes: {
            create: {} // Cria com valores default
          }
        },
        include: {
          attributes: true,
          house: true,
          userInterests: {
            include: {
              interest: true
            }
          }
        }
      });

      // Buscar a habilidade "Investida"
      const investidaSkill = await tx.skill.findFirst({
        where: {
          name: 'Investida'
        }
      });

      // Se a habilidade foi encontrada, adicioná-la ao usuário e marcá-la como equipada
      if (investidaSkill) {
        await tx.userSkill.create({
          data: {
            userId: user.id,
            skillId: investidaSkill.id,
            equipped: true // Equipada por padrão
          }
        });
      } else {
        console.error(`Erro: Habilidade "Investida" não encontrada no banco de dados durante o registro do usuário ${user.id}. Verifique se a habilidade existe.`);
      }

      return user;
    });
  }

  /**
   * Verifica credenciais e realiza login
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Resultado da autenticação ou null se falhar
   */
  async login(email: string, password: string): Promise<AuthResult | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        attributes: true,
        house: true
      }
    });

    if (!user) {
      return null;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return null;
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'mindforge-secret',
      { expiresIn: '7d' }
    );

    // Remover a senha do objeto do usuário antes de retornar
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Altera a senha do usuário
   * @param userId ID do usuário
   * @param currentPassword Senha atual
   * @param newPassword Nova senha
   * @returns Verdadeiro se a senha foi alterada com sucesso
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return false;
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return true;
  }

  /**
   * Verifica se um email já está em uso
   * @param email Email para verificar
   * @returns Verdadeiro se o email já está em uso
   */
  async isEmailTaken(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    return !!user;
  }

  /**
   * Verifica se um nome de usuário já está em uso
   * @param username Nome de usuário para verificar
   * @returns Verdadeiro se o nome de usuário já está em uso
   */
  async isUsernameTaken(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    return !!user;
  }
} 