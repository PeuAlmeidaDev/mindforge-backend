import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { determineUserHouse } from '../services/house-assignment.service';
import { ResponseBuilder } from '../utils/response';
import { AuthenticationError, ConflictError } from '../utils/error';
import { AuthService } from '../services/auth.service';
import { ValidationError, NotFoundError, InternalServerError } from '../utils/error';

/**
 * Registra um novo usuário
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      email, 
      password,
      primaryElementalType,
      interests
    } = req.body;

    const userData = {
      username,
      email,
      password,
      primaryElementalType,
      interests
    };

    const result = await AuthService.register(userData);

    return ResponseBuilder.success(
      res, 
      result,
      'Usuário registrado com sucesso',
      201
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    if (error instanceof ConflictError) {
      return ResponseBuilder.error(res, error.message, undefined, 409);
    }
    console.error('Erro ao registrar usuário:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Autentica um usuário existente
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const credentials = { email, password };
    const result = await AuthService.login(credentials);

    return ResponseBuilder.success(
      res, 
      result,
      'Login realizado com sucesso'
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return ResponseBuilder.error(res, error.message, undefined, 401);
    }
    if (error instanceof ValidationError) {
      return ResponseBuilder.error(res, error.message);
    }
    console.error('Erro ao realizar login:', error);
    return ResponseBuilder.error(res, 'Erro interno no servidor', undefined, 500);
  }
};

/**
 * Verifica se o token é válido
 */
export const verifyToken = async (req: Request, res: Response) => {
  // O usuário já foi verificado pelo middleware de autenticação
  return ResponseBuilder.success(res, { user: req.user }, 'Token válido');
}; 