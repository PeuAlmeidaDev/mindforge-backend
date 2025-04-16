import { ElementalType } from '../types/common';

/**
 * Validadores utilitários para valores comuns
 */
export const Validators = {
  /**
   * Verifica se uma string é um email válido
   * @param email Email a ser validado
   * @returns Verdadeiro se o email for válido
   */
  isValidEmail(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  },

  /**
   * Verifica se uma string é uma senha forte
   * Regras: mínimo 8 caracteres, pelo menos uma letra maiúscula, uma minúscula e um número
   * @param password Senha a ser validada
   * @returns Verdadeiro se a senha for forte
   */
  isStrongPassword(password: string): boolean {
    if (password.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  },

  /**
   * Verifica se um valor é um número positivo
   * @param value Valor a ser validado
   * @returns Verdadeiro se for um número positivo
   */
  isPositiveNumber(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  },

  /**
   * Verifica se um valor está entre um mínimo e máximo
   * @param value Valor a ser validado
   * @param min Valor mínimo (inclusivo)
   * @param max Valor máximo (inclusivo)
   * @returns Verdadeiro se o valor estiver no intervalo
   */
  isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  },

  /**
   * Verifica se um ID no formato UUID é válido
   * @param id ID a ser validado
   * @returns Verdadeiro se o ID for válido
   */
  isValidUUID(id: string): boolean {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return pattern.test(id);
  },

  /**
   * Verifica se um tipo elemental é válido
   * @param type Tipo elemental a ser validado
   * @returns Verdadeiro se o tipo for válido
   */
  isValidElementalType(type: string): boolean {
    return Object.values(ElementalType).includes(type as ElementalType);
  },

  /**
   * Verifica se todos os IDs em um array são válidos
   * @param ids Array de IDs a serem validados
   * @returns Verdadeiro se todos os IDs forem válidos
   */
  areValidUUIDs(ids: string[]): boolean {
    return ids.every(id => this.isValidUUID(id));
  },

  /**
   * Sanitiza uma string removendo caracteres especiais
   * @param input String a ser sanitizada
   * @returns String sanitizada
   */
  sanitizeString(input: string): string {
    return input.replace(/[<>]/g, '');
  }
}; 