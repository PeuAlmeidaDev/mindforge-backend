import { PrismaClient } from '@prisma/client';

/**
 * Classe para encapsular a instância do PrismaClient
 * Implementa o padrão Singleton para garantir uma única instância
 */
class PrismaInstance {
  private static instance: PrismaClient;

  /**
   * Obtém a instância do PrismaClient
   * Se não existir, cria uma nova
   */
  public static getInstance(): PrismaClient {
    if (!PrismaInstance.instance) {
      PrismaInstance.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
      });
    }
    return PrismaInstance.instance;
  }

  /**
   * Desconecta o cliente do banco de dados
   */
  public static async disconnect(): Promise<void> {
    if (PrismaInstance.instance) {
      await PrismaInstance.instance.$disconnect();
    }
  }
}

// Exporta a instância do Prisma para uso global na aplicação
export const prisma = PrismaInstance.getInstance();

// Exporta a classe para casos em que precisamos acessar métodos como disconnect
export default PrismaInstance; 