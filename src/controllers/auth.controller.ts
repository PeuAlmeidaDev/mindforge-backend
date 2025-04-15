import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { determineUserHouse } from '../services/house-assignment.service';

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
      interests // Array de IDs dos interesses
    } = req.body;

    // Verificar se os campos obrigatórios foram enviados
    if (!username || !email || !password || !primaryElementalType || !interests) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos são obrigatórios' 
      });
    }

    // Verificar se o usuário selecionou pelo menos um interesse
    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selecione pelo menos um interesse'
      });
    }

    // Verificar se o tipo elemental é válido
    const validElements = [
      'fire', 'water', 'earth', 'air', 'light', 'dark', 
      'nature', 'electric', 'ice', 'psychic', 'ghost', 
      'steel', 'poison', 'flying', 'rock'
    ];
    
    if (!validElements.includes(primaryElementalType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo elemental inválido' 
      });
    }

    // Verificar se todos os interesses existem
    const existingInterests = await prisma.interest.findMany({
      where: {
        id: {
          in: interests
        }
      }
    });

    if (existingInterests.length !== interests.length) {
      return res.status(400).json({
        success: false,
        message: 'Um ou mais interesses selecionados não existem'
      });
    }

    // Determinar a casa do usuário com base em seus interesses
    const houseId = await determineUserHouse(interests);

    // Verificar se a casa existe
    const houseExists = await prisma.house.findUnique({
      where: { id: houseId }
    });

    if (!houseExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Não foi possível determinar uma casa adequada' 
      });
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar o usuário com seus interesses em uma transação
    const user = await prisma.$transaction(async (prisma) => {
      // Criar o usuário
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          primaryElementalType,
          houseId, // Usar a casa determinada automaticamente
          attributePointsToDistribute: 15,
          attributes: {
            create: {
              health: 100,
              physicalAttack: 10,
              specialAttack: 10,
              physicalDefense: 10,
              specialDefense: 10,
              speed: 10
            }
          }
        },
        include: {
          attributes: true,
          house: true
        }
      });

      // Criar as relações com os interesses
      await Promise.all(
        interests.map(interestId =>
          prisma.userInterest.create({
            data: {
              userId: newUser.id,
              interestId
            }
          })
        )
      );

      // Adicionar a skill "Investida" para o usuário (skill inicial padrão)
      const investidaSkill = await prisma.skill.findFirst({
        where: { name: 'Investida' }
      });

      if (investidaSkill) {
        await prisma.userSkill.create({
          data: {
            userId: newUser.id,
            skillId: investidaSkill.id,
            equipped: true // Já vem equipada por padrão
          }
        });
      }

      return newUser;
    });

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
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      primaryElementalType: user.primaryElementalType,
      level: user.level,
      experience: user.experience,
      house: user.house,
      attributes: user.attributes,
      interests: userInterests.map(ui => ui.interest)
    };

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);

    // Tratar erro de unicidade (email ou username já existem)
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])[0];
        return res.status(409).json({ 
          success: false, 
          message: `${field === 'email' ? 'E-mail' : 'Nome de usuário'} já está em uso` 
        });
      }
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno no servidor' 
    });
  }
};

/**
 * Autentica um usuário existente
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Verificar se os campos obrigatórios foram enviados
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'E-mail e senha são obrigatórios' 
      });
    }

    // Buscar o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email },
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

    // Verificar se o usuário existe
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Verificar se a senha está correta
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Remover a senha da resposta
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      primaryElementalType: user.primaryElementalType,
      secondaryElementalType: user.secondaryElementalType,
      level: user.level,
      experience: user.experience,
      house: user.house,
      attributes: user.attributes,
      interests: user.userInterests.map(ui => ui.interest)
    };

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno no servidor' 
    });
  }
};

/**
 * Verifica se o token é válido
 */
export const verifyToken = async (req: Request, res: Response) => {
  // O usuário já foi verificado pelo middleware de autenticação
  return res.status(200).json({
    success: true,
    message: 'Token válido',
    data: {
      user: req.user
    }
  });
}; 