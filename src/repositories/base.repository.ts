import { PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma';

/**
 * Classe base para todos os repositórios com operações CRUD genéricas
 * @template T Tipo da entidade
 */
export abstract class BaseRepository<T> {
  /**
   * Cliente Prisma compartilhado
   */
  protected prisma: PrismaClient;
  
  /**
   * Nome do modelo a ser manipulado
   */
  protected readonly modelName: string;

  /**
   * Construtor do repositório base
   * @param modelName Nome do modelo no Prisma
   */
  constructor(modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Cria um novo registro
   * @param data Dados para criar o registro
   * @returns Registro criado
   */
  async create(data: any): Promise<T> {
    // @ts-ignore - Acesso dinâmico ao modelo do Prisma
    return this.prisma[this.modelName].create({ data });
  }

  /**
   * Busca um registro pelo ID
   * @param id ID do registro
   * @param include Relações a serem incluídas
   * @returns Registro encontrado ou null
   */
  async findById(id: string, include?: any): Promise<T | null> {
    // @ts-ignore - Acesso dinâmico ao modelo do Prisma
    return this.prisma[this.modelName].findUnique({
      where: { id },
      ...(include && { include }),
    });
  }

  /**
   * Busca todos os registros com suporte a paginação
   * @param page Número da página
   * @param limit Limite de registros por página
   * @param where Condições de filtragem
   * @param orderBy Ordenação dos resultados
   * @param include Relações a serem incluídas
   * @returns Lista paginada de registros e total
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    where: any = {},
    orderBy: any = {},
    include?: any
  ): Promise<{ data: T[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      // @ts-ignore - Acesso dinâmico ao modelo do Prisma
      this.prisma[this.modelName].findMany({
        skip,
        take: limit,
        where,
        orderBy,
        ...(include && { include }),
      }),
      // @ts-ignore - Acesso dinâmico ao modelo do Prisma
      this.prisma[this.modelName].count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Atualiza um registro pelo ID
   * @param id ID do registro
   * @param data Dados para atualização
   * @returns Registro atualizado
   */
  async update(id: string, data: any): Promise<T> {
    // @ts-ignore - Acesso dinâmico ao modelo do Prisma
    return this.prisma[this.modelName].update({
      where: { id },
      data,
    });
  }

  /**
   * Remove um registro pelo ID
   * @param id ID do registro
   * @returns Registro removido
   */
  async delete(id: string): Promise<T> {
    // @ts-ignore - Acesso dinâmico ao modelo do Prisma
    return this.prisma[this.modelName].delete({
      where: { id },
    });
  }

  /**
   * Executa uma transação com callback
   * @param callback Função a ser executada dentro da transação
   * @returns Resultado da callback
   */
  async transaction<R>(
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(callback);
  }
} 