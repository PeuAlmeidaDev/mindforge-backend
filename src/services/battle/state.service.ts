import { prisma } from '../../database/prisma';
import { Battle, BattleParticipant } from '@prisma/client';
import * as turnService from './turn.service';

/**
 * Verifica o estado atual da batalha
 */
export const checkBattleState = async (battleId: string): Promise<{
  battle: Battle,
  participants: BattleParticipant[],
  isActive: boolean,
  winnerTeam: string | null
}> => {
  try {
    // Busca a batalha e seus participantes
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        participants: true
      }
    });

    if (!battle) {
      throw new Error('Batalha não encontrada');
    }

    // Se a batalha já está marcada como finalizada, retorna diretamente
    if (battle.isFinished) {
      // Determinar o time vencedor baseado no winnerId ou outro campo
      let winnerTeam: string | null = null;
      
      // Aqui podemos converter o winnerId para um identificador de time 
      // por exemplo, verificando a que time o winnerId pertence
      // Por simplicidade, apenas retornamos null por enquanto
      
      return {
        battle,
        participants: battle.participants,
        isActive: false,
        winnerTeam
      };
    }

    // Verifica o status dos times
    const teamStatus = turnService.checkTeamStatus(battle.participants);
    
    // Se algum time foi derrotado, finaliza a batalha
    if (teamStatus.playerDefeated || teamStatus.enemyDefeated) {
      const winnerTeam = teamStatus.playerDefeated ? 'enemy' : 'player';
      
      // Determinar o ID do vencedor (pode ser um representante do time)
      let winnerId: string | null = null;
      
      // Atualiza o status da batalha
      const updatedBattle = await prisma.battle.update({
        where: { id: battleId },
        data: {
          isFinished: true,
          winnerId    // Usando o campo correto do schema
        }
      });

      return {
        battle: updatedBattle,
        participants: battle.participants,
        isActive: false,
        winnerTeam
      };
    }

    // A batalha está ativa
    return {
      battle,
      participants: battle.participants,
      isActive: true,
      winnerTeam: null
    };
  } catch (error) {
    console.error('Erro ao verificar estado da batalha:', error);
    throw new Error(`Erro ao verificar estado da batalha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Inicia uma nova batalha ou reinicia uma existente
 */
export const initializeBattle = async (
  battleId: string
): Promise<Battle> => {
  try {
    // Verifica se a batalha existe
    const battle = await prisma.battle.findUnique({
      where: { id: battleId }
    });

    if (!battle) {
      throw new Error('Batalha não encontrada');
    }

    // Reinicia a batalha para o turno 1
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        currentTurn: 1,
        isFinished: false,
        winnerId: null  // Usando o campo correto do schema
      }
    });

    // Reinicia todos os participantes para seus valores iniciais
    await prisma.battleParticipant.updateMany({
      where: { battleId },
      data: {
        currentHealth: {
          // Reinicia para o valor inicial, mas isso dependeria de um projeto específico
          // Por simplicidade, estamos apenas definindo um valor alto aqui
          set: 100
        }
      }
    });

    // Remove todos os efeitos de status e buffs
    await prisma.battleStatusEffect.deleteMany({
      where: {
        battleParticipant: {
          battleId
        }
      }
    });

    await prisma.battleBuff.deleteMany({
      where: {
        battleParticipant: {
          battleId
        }
      }
    });

    return updatedBattle;
  } catch (error) {
    console.error('Erro ao inicializar batalha:', error);
    throw new Error(`Erro ao inicializar batalha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Finaliza uma batalha
 */
export const finalizeBattle = async (
  battleId: string,
  winnerTeam: 'player' | 'enemy' | null = null
): Promise<Battle> => {
  try {
    // Se não foi especificado um vencedor, verifica o estado atual
    if (!winnerTeam) {
      const state = await checkBattleState(battleId);
      winnerTeam = state.winnerTeam as 'player' | 'enemy' | null;
    }

    // Determinar o ID do vencedor (pode ser um representante do time)
    let winnerId: string | null = null;
    
    // Aqui você pode implementar a lógica para obter o ID de um representante do time vencedor
    // Por exemplo, buscando o primeiro participante do time vencedor
    
    // Finaliza a batalha
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        isFinished: true,
        winnerId  // Usando o campo correto do schema
      }
    });

    return updatedBattle;
  } catch (error) {
    console.error('Erro ao finalizar batalha:', error);
    throw new Error(`Erro ao finalizar batalha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}; 