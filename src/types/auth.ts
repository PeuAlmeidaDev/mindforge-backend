import { User, House, Interest } from '@prisma/client';

/**
 * Interface para o usuário na resposta, excluindo campos sensíveis
 */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  profileImageUrl: string | null;
  bannerUrl: string | null;
  houseId: string;
  primaryElementalType: string;
  secondaryElementalType: string | null;
  level: number;
  experience: number;
  attributePointsToDistribute: number;
  createdAt: Date;
  updatedAt: Date;
  house?: House;
  attributes?: UserAttributesResponse;
  interests?: InterestResponse[];
}

/**
 * Interface para os atributos do usuário na resposta
 */
export interface UserAttributesResponse {
  id: string;
  userId: string;
  health: number;
  physicalAttack: number;
  specialAttack: number;
  physicalDefense: number;
  specialDefense: number;
  speed: number;
}

/**
 * Interface para interesses na resposta
 */
export interface InterestResponse {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Interface para resultado de autenticação
 */
export interface AuthResponse {
  user: UserResponse;
  token: string;
} 