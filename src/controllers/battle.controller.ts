import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import * as battleService from '../services/battle.service';
import * as battleEngineService from '../services/battle-engine.service';
import * as battleRewardsService from '../services/battle-rewards.service';
import { BattleStatusEffect } from '@prisma/client';
import { ResponseBuilder } from '../utils/response';

/**
 * Obtém todas as batalhas do usuário atual
 */
export const getUserBattles = async (req: Request, res: Response) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return ResponseBuilder.error(res, 'Usuário não autenticado', undefined, 401);
    }

    const userId = req.user.id;
    const battles = await battleService.findUserBattles(userId);

    return ResponseBuilder.success(res, battles, 'Batalhas obtidas com sucesso');
  } catch (error) {
    console.error('Erro ao obter batalhas do usuário:', error);
    return ResponseBuilder.error(res, 'Erro ao obter batalhas', undefined, 500);
  }
};

/**
 * Inicia uma nova batalha contra inimigos aleatórios
 */
export const startRandomBattle = async (req: Request, res: Response) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return ResponseBuilder.error(res, 'Usuário não autenticado', undefined, 401);
    }

    const userId = req.user.id;
    const { difficulty = 'normal', aiDifficulty } = req.body;

    const battle = await battleService.createRandomBattle(
      userId, 
      difficulty as 'easy' | 'normal' | 'hard',
      aiDifficulty ? parseInt(aiDifficulty) : undefined
    );

    return ResponseBuilder.success(res, battle, 'Batalha iniciada com sucesso', 201);
  } catch (error) {
    console.error('Erro ao iniciar batalha:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar batalha';
    const statusCode = errorMessage.includes('não encontrado') ? 404 : 500;
    
    return ResponseBuilder.error(res, errorMessage, undefined, statusCode);
  }
};

/**
 * Obtém uma batalha pelo ID
 */
export const getBattleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return ResponseBuilder.error(res, 'Usuário não autenticado', undefined, 401);
    }
    
    const userId = req.user.id;
    const battle = await battleService.findBattleById(id, userId);

    if (!battle) {
      return ResponseBuilder.error(res, 'Batalha não encontrada', undefined, 404);
    }

    return ResponseBuilder.success(res, battle, 'Batalha obtida com sucesso');
  } catch (error) {
    console.error('Erro ao obter batalha:', error);
    return ResponseBuilder.error(res, 'Erro ao obter batalha', undefined, 500);
  }
};

/**
 * Processa as ações de um turno da batalha
 */
export const processTurnAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actions } = req.body;
    
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return ResponseBuilder.error(res, 'Usuário não autenticado', undefined, 401);
    }
    
    const userId = req.user.id;
    
    // Verificar se a batalha existe e pertence ao usuário
    const battle = await battleService.findBattleById(id, userId);
    
    if (!battle) {
      return ResponseBuilder.error(res, 'Batalha não encontrada', undefined, 404);
    }
    
    // Verificar se a batalha já foi finalizada
    if (battle.isFinished) {
      return ResponseBuilder.error(res, 'Esta batalha já foi finalizada');
    }
    
    // Validar as ações de turno
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return ResponseBuilder.error(res, 'Ações de turno inválidas');
    }
    
    // Executar o turno da batalha com o sistema refatorado
    const turnResult = await battleEngineService.executeBattleTurn(id, actions);
    
    // Verifica se a batalha foi finalizada com vitória do jogador, para processar recompensas
    let rewards = null;
    if (turnResult.isFinished && turnResult.winnerTeam === 'player') {
      try {
        rewards = await battleRewardsService.processBattleRewards(userId, id);
      } catch (rewardError) {
        console.error('Erro ao processar recompensas:', rewardError);
        // Se falhar ao processar recompensas, não interrompemos o fluxo
      }
    }
    
    // Separa as ações dos jogadores e dos inimigos para melhor visualização no frontend
    const playerActions = Object.fromEntries(
      Object.entries(turnResult.actionResults).filter(([actorId]) => {
        const participant = turnResult.participants.find(p => p.id === actorId);
        return participant && participant.participantType === 'user';
      })
    );
    
    const enemyActions = Object.fromEntries(
      Object.entries(turnResult.actionResults).filter(([actorId]) => {
        const participant = turnResult.participants.find(p => p.id === actorId);
        return participant && participant.participantType === 'enemy';
      })
    );
    
    // Preparar a resposta para o frontend
    return ResponseBuilder.success(
      res, 
      {
        turnNumber: battle.currentTurn + 1,
        isFinished: turnResult.isFinished,
        winnerTeam: turnResult.winnerTeam,
        playerActions: playerActions,
        enemyActions: enemyActions,
        participants: turnResult.participants,
        battle: turnResult.battle,
        rewards: rewards // Incluindo as recompensas na resposta, se houver
      },
      'Turno processado com sucesso'
    );
  } catch (error) {
    console.error('Erro ao processar turno da batalha:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao processar turno da batalha';
    
    return ResponseBuilder.error(res, errorMessage, undefined, 500);
  }
};

/**
 * Obtém recompensas de uma batalha finalizada
 */
export const getBattleRewards = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`Solicitação de recompensas para batalha ID: ${id}`);
    
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return ResponseBuilder.error(res, 'Usuário não autenticado', undefined, 401);
    }
    
    const userId = req.user.id;
    console.log(`Usuário autenticado: ${userId}`);
    
    // Verificar se a batalha existe e pertence ao usuário
    const battle = await battleService.findBattleById(id, userId);
    
    if (!battle) {
      console.log(`Batalha ${id} não encontrada para o usuário ${userId}`);
      return ResponseBuilder.error(res, 'Batalha não encontrada', undefined, 404);
    }
    
    console.log(`Batalha encontrada: ${id}, finalizada: ${battle.isFinished}`);
    
    // Verificar se a batalha foi finalizada
    if (!battle.isFinished) {
      return ResponseBuilder.error(res, 'Esta batalha ainda não foi finalizada');
    }
    
    // Buscar as recompensas da batalha
    try {
      const rewards = await battleRewardsService.processBattleRewards(userId, id);
      return ResponseBuilder.success(res, rewards, 'Recompensas obtidas com sucesso');
    } catch (rewardError) {
      if (rewardError instanceof Error) {
        const errorMessage = rewardError.message;
        
        // Mapear mensagens de erro específicas para códigos HTTP apropriados
        if (errorMessage.includes('já recebeu recompensas por esta batalha')) {
          return ResponseBuilder.error(res, errorMessage, undefined, 400);
        } else if (errorMessage.includes('não pode receber recompensas por uma batalha que não venceu')) {
          return ResponseBuilder.error(res, errorMessage, undefined, 403);
        } else if (errorMessage.includes('Batalha não finalizada')) {
          return ResponseBuilder.error(res, errorMessage, undefined, 400);
        } else if (errorMessage.includes('Usuário não participou desta batalha')) {
          return ResponseBuilder.error(res, errorMessage, undefined, 403);
        }
      }
      
      console.error('Erro ao processar recompensas:', rewardError);
      return ResponseBuilder.error(res, 'Erro ao processar recompensas da batalha', undefined, 500);
    }
  } catch (error) {
    console.error('Erro ao obter recompensas da batalha:', error);
    return ResponseBuilder.error(res, 'Erro ao obter recompensas da batalha', undefined, 500);
  }
};

// Função auxiliar para obter descrições dos efeitos de status
function getStatusEffectDescription(type: string): string {
  const descriptions: Record<string, string> = {
    burn: 'Queimadura: causa dano a cada turno e reduz o ataque físico em 30%',
    poison: 'Envenenamento: causa dano a cada turno',
    stun: 'Atordoamento: impede de agir por um turno',
    freeze: 'Congelamento: impede de agir por um turno e aumenta a defesa física',
    blind: 'Cegueira: reduz a precisão dos ataques',
    bleed: 'Sangramento: causa dano baseado em % da vida a cada turno',
    confuse: 'Confusão: chance de atacar a si mesmo'
  };
  
  return descriptions[type] || 'Efeito desconhecido';
} 