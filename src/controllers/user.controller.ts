import { Request, Response } from 'express';
import { ResponseBuilder } from '../utils/response';
import { UserService } from '../services/user.service';
import { ValidationError, NotFoundError, InternalServerError } from '../utils/error';

/**
 * Obtém o perfil do usuário autenticado
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await UserService.getProfile(userId);
    return ResponseBuilder.success(res, user);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return ResponseBuilder.error(res, error.message, undefined, 404);
    }
    console.error('Erro ao obter perfil do usuário:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Atualiza os atributos do usuário
 */
export const updateAttributes = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { health, physicalAttack, specialAttack, physicalDefense, specialDefense, speed } = req.body;
    
    const attributeUpdates = { 
      health, 
      physicalAttack, 
      specialAttack, 
      physicalDefense, 
      specialDefense, 
      speed 
    };
    
    const result = await UserService.updateAttributes(userId, attributeUpdates);
    
    return ResponseBuilder.success(
      res,
      result,
      'Atributos atualizados com sucesso'
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    if (error instanceof NotFoundError) {
      return ResponseBuilder.error(res, error.message, undefined, 404);
    }
    console.error('Erro ao atualizar atributos:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Gerencia as habilidades equipadas do usuário
 */
export const manageEquippedSkills = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { equippedSkills } = req.body;
    
    const equipedSkills = await UserService.manageEquippedSkills(userId, equippedSkills);
    
    return ResponseBuilder.success(
      res,
      equipedSkills,
      'Habilidades equipadas com sucesso'
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    console.error('Erro ao gerenciar habilidades:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
}; 