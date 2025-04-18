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
import { controllerHandler } from '../utils/controller.utils';
import { RegisterData } from '../services/register.service';
import { LoginCredentials } from '../services/login.service';

/**
 * Registra um novo usuário
 */
const registerHandler = async (req: Request, res: Response) => {
  const userData: RegisterData = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    primaryElementalType: req.body.primaryElementalType,
    interests: req.body.interests
  };

  const result = await AuthService.register(userData);

  return ResponseBuilder.success(
    res, 
    result,
    'Usuário registrado com sucesso',
    201
  );
};

/**
 * Autentica um usuário existente
 */
const loginHandler = async (req: Request, res: Response) => {
  const credentials: LoginCredentials = {
    email: req.body.email,
    password: req.body.password
  };
  
  const result = await AuthService.login(credentials);

  return ResponseBuilder.success(
    res, 
    result,
    'Login realizado com sucesso'
  );
};

/**
 * Verifica se o token é válido
 */
const verifyTokenHandler = async (req: Request, res: Response) => {
  // O usuário já foi verificado pelo middleware de autenticação
  return ResponseBuilder.success(res, { user: req.user }, 'Token válido');
};

// Exportar com o wrapper de tratamento de erros
export const register = controllerHandler(registerHandler);
export const login = controllerHandler(loginHandler);
export const verifyToken = controllerHandler(verifyTokenHandler); 