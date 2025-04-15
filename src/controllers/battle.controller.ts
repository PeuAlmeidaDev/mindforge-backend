import { Request, Response } from 'express';
import { prisma } from '../index';
import * as battleService from '../services/battle.service';
import * as battleEngineService from '../services/battle-engine.service';
import * as battleRewardsService from '../services/battle-rewards.service';
import { BattleStatusEffect } from '@prisma/client';

/**
 * Obtém todas as batalhas do usuário atual
 */
export const getUserBattles = async (req: Request, res: Response) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const userId = req.user.id;
    const battles = await battleService.findUserBattles(userId);

    return res.status(200).json({
      success: true,
      message: 'Batalhas obtidas com sucesso',
      data: battles
    });
  } catch (error) {
    console.error('Erro ao obter batalhas do usuário:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter batalhas'
    });
  }
};

/**
 * Inicia uma nova batalha contra inimigos aleatórios
 */
export const startRandomBattle = async (req: Request, res: Response) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const userId = req.user.id;
    const { difficulty = 'normal' } = req.body;

    const battle = await battleService.createRandomBattle(
      userId, 
      difficulty as 'easy' | 'normal' | 'hard'
    );

    return res.status(201).json({
      success: true,
      message: 'Batalha iniciada com sucesso',
      data: battle
    });
  } catch (error) {
    console.error('Erro ao iniciar batalha:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao iniciar batalha';
    
    return res.status(
      errorMessage.includes('não encontrado') ? 404 : 500
    ).json({
      success: false,
      message: errorMessage
    });
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
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    const userId = req.user.id;
    const battle = await battleService.findBattleById(id, userId);

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: 'Batalha não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Batalha obtida com sucesso',
      data: battle
    });
  } catch (error) {
    console.error('Erro ao obter batalha:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter batalha'
    });
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
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    const userId = req.user.id;
    
    // Verificar se a batalha existe e pertence ao usuário
    const battle = await battleService.findBattleById(id, userId);
    
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: 'Batalha não encontrada'
      });
    }
    
    // Verificar se a batalha já foi finalizada
    if (battle.isFinished) {
      return res.status(400).json({
        success: false,
        message: 'Esta batalha já foi finalizada'
      });
    }
    
    // Validar as ações de turno
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ações de turno inválidas'
      });
    }
    
    // Executar o turno da batalha
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
    
    // Preparar a resposta para o frontend
    return res.status(200).json({
      success: true,
      message: 'Turno processado com sucesso',
      data: {
        turnNumber: battle.currentTurn + 1,
        isFinished: turnResult.isFinished,
        winnerTeam: turnResult.winnerTeam,
        actions: turnResult.actionResults,
        participants: turnResult.participants,
        battle: turnResult.battle,
        rewards: rewards // Incluindo as recompensas na resposta, se houver
      }
    });
  } catch (error) {
    console.error('Erro ao processar turno da batalha:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao processar turno da batalha';
    
    return res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

/**
 * Obtém recompensas de uma batalha finalizada
 */
export const getBattleRewards = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verifica se o usuário está autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    const userId = req.user.id;
    
    // Verificar se a batalha existe e pertence ao usuário
    const battle = await battleService.findBattleById(id, userId);
    
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: 'Batalha não encontrada'
      });
    }
    
    // Verificar se a batalha foi finalizada
    if (!battle.isFinished) {
      return res.status(400).json({
        success: false,
        message: 'Esta batalha ainda não foi finalizada'
      });
    }
    
    // Buscar as recompensas da batalha
    const rewards = await battleRewardsService.processBattleRewards(userId, id);
    
    return res.status(200).json({
      success: true,
      message: 'Recompensas obtidas com sucesso',
      data: rewards
    });
  } catch (error) {
    console.error('Erro ao obter recompensas da batalha:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro ao obter recompensas da batalha';
    
    return res.status(500).json({
      success: false,
      message: errorMessage
    });
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