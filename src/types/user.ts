import { ElementalType } from './common';
import { User, UserAttributes, House, Interest, Skill } from '@prisma/client';

/**
 * Interface para o registro de usuário
 */
export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  primaryElementalType: string;
  interests: string[]; // Array de IDs de interesses
}

/**
 * Interface para login de usuário
 */
export interface UserLoginData {
  email: string;
  password: string;
}

/**
 * Dados do token JWT
 */
export interface JwtPayload {
  id: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Usuário autenticado com token
 */
export interface AuthenticatedUser {
  user: UserResponseData;
  token: string;
}

/**
 * Dados do usuário para resposta da API (sem senha)
 */
export interface UserResponseData {
  id: string;
  username: string;
  email: string;
  profileImageUrl?: string | null;
  bannerUrl?: string | null;
  primaryElementalType: string;
  secondaryElementalType?: string | null;
  level: number;
  experience: number;
  attributePointsToDistribute: number;
  createdAt: Date;
  updatedAt: Date;
  attributes?: UserAttributes;
  house?: House;
  interests?: Interest[];
  equippedSkills?: Skill[];
}

/**
 * Extensão para o tipo Request do Express, incluindo usuário autenticado
 */
export interface AuthenticatedRequest {
  user: {
    id: string;
    username: string;
    email: string;
  }
}

/**
 * Interface para atualização de atributos
 */
export interface AttributeUpdateData {
  health?: number;
  physicalAttack?: number;
  specialAttack?: number;
  physicalDefense?: number;
  specialDefense?: number;
  speed?: number;
}

/**
 * Interface para gerenciamento de habilidades equipadas
 */
export interface EquippedSkillsData {
  skillIds: string[];
} 