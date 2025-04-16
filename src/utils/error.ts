/**
 * Classe base para erros da aplicação
 */
export class AppError extends Error {
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(message: string, statusCode: number = 400, details?: Record<string, string[]>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação (formulários, dados inválidos)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Erro de validação', details?: Record<string, string[]>) {
    super(message, 400, details);
  }
}

/**
 * Erro de autenticação (credenciais inválidas)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Credenciais inválidas') {
    super(message, 401);
  }
}

/**
 * Erro de autorização (sem permissão)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Sem permissão para acessar este recurso') {
    super(message, 403);
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`, 404);
  }
}

/**
 * Erro de conflito (recurso já existe)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Recurso já existe') {
    super(message, 409);
  }
}

/**
 * Erro interno do servidor
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500);
  }
}

/**
 * Conversor de erros do Prisma para AppError
 * @param error Erro do Prisma
 * @returns AppError
 */
export function handlePrismaError(error: any): AppError {
  console.error('Erro do Prisma:', error);
  
  // Validar se é um erro conhecido do Prisma
  if (error.code) {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        const field = (error.meta?.target as string[])[0];
        return new ConflictError(`${field} já está em uso`);
      
      case 'P2025': // Record not found
        return new NotFoundError();
      
      case 'P2003': // Foreign key constraint failed
        return new ValidationError('Relação inválida com outro recurso');
      
      case 'P2014': // Violation of required relation
        return new ValidationError('Relação obrigatória não satisfeita');
    }
  }
  
  return new InternalServerError('Erro no banco de dados');
} 