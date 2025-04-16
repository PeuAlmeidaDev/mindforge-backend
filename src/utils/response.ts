import { Response } from 'express';
import { ApiResponse, PaginatedResult, PaginationParams } from '../types/common';

/**
 * Utilitário para padronizar as respostas da API
 */
export class ResponseBuilder {
  /**
   * Retorna uma resposta de sucesso
   * 
   * @param res - Objeto de resposta do Express
   * @param data - Dados a serem retornados
   * @param message - Mensagem opcional
   * @param statusCode - Código HTTP (padrão: 200)
   * @returns Resposta formatada
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Retorna uma resposta de erro
   * 
   * @param res - Objeto de resposta do Express
   * @param message - Mensagem de erro
   * @param errors - Erros detalhados (opcional)
   * @param statusCode - Código HTTP (padrão: 400)
   * @returns Resposta formatada
   */
  static error(
    res: Response,
    message: string,
    errors?: Record<string, string[]>,
    statusCode: number = 400
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Formata uma resposta paginada
   * 
   * @param items - Array de itens
   * @param total - Total de itens
   * @param pagination - Parâmetros de paginação
   * @returns Resultado paginado
   */
  static paginate<T>(
    items: T[],
    total: number,
    pagination: PaginationParams
  ): PaginatedResult<T> {
    const { page, limit } = pagination;
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }
} 