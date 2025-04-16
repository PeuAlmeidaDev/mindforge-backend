/**
 * Tipos compartilhados usados em toda a aplicação
 */

/**
 * Resposta padrão da API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Tipos elementais disponíveis no jogo
 */
export enum ElementalType {
  FIRE = 'fire',
  WATER = 'water',
  EARTH = 'earth',
  AIR = 'air',
  LIGHT = 'light',
  DARK = 'dark',
  NATURE = 'nature',
  ELECTRIC = 'electric',
  ICE = 'ice',
  PSYCHIC = 'psychic',
  GHOST = 'ghost',
  STEEL = 'steel',
  POISON = 'poison',
  FLYING = 'flying',
  ROCK = 'rock'
}

/**
 * Efeitos de status possíveis em batalhas
 */
export enum StatusEffect {
  BURN = 'burn',
  POISON = 'poison',
  PARALYSIS = 'paralysis',
  FREEZE = 'freeze',
  SLEEP = 'sleep',
  CONFUSION = 'confusion',
  BLEED = 'bleed',
  STUN = 'stun'
}

/**
 * Atributos que podem ser alvo de buffs/debuffs
 */
export enum AttributeType {
  PHYSICAL_ATTACK = 'physicalAttack',
  SPECIAL_ATTACK = 'specialAttack',
  PHYSICAL_DEFENSE = 'physicalDefense',
  SPECIAL_DEFENSE = 'specialDefense',
  SPEED = 'speed',
  ACCURACY = 'accuracy',
  EVASION = 'evasion'
}

/**
 * Tipos de ataque
 */
export enum AttackType {
  PHYSICAL = 'physical',
  SPECIAL = 'special'
}

/**
 * Tipos de alvo de habilidades
 */
export enum TargetType {
  SINGLE = 'single',
  ALL_ENEMIES = 'all_enemies',
  ALL_ALLIES = 'all_allies',
  SELF = 'self'
} 