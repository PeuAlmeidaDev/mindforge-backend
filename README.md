# Mindforge Backend

## Atualizações Recentes

### Dados detalhados de inimigos em batalhas
Atualizamos os endpoints de batalha para incluir informações mais completas sobre inimigos:
- Endpoints `/api/battles/:id` e `/api/battles/:id/turn` agora retornam informações detalhadas de inimigos
- Incluímos dados como nome, imageUrl, tipos elementais, raridade, atributos e status
- Isso permite ao frontend exibir informações ricas durante as batalhas

### Estrutura de Retorno
Para cada inimigo, agora são retornados:
- Dados básicos: id, name, imageUrl
- Tipos: elementalType
- Atributos: rarity, isBoss
- Estatísticas: health, physicalAttack, specialAttack, physicalDefense, specialDefense, speed

Estas mudanças facilitam a criação de uma interface de batalha mais informativa no frontend.