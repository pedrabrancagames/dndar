# Walkthrough - Correção de Crash na Missão 5

## Resumo das Alterações
Várias correções críticas foram implementadas para resolver o crash reportado durante a 5ª missão (Boss Fight). O problema foi identificado como uma combinação de vazamento de memória em recursos 3D (WebGL) e conflitos no sistema de narração por voz.

### 1. Gerenciamento de Memória (ARSceneManager.js & main.js)
**Problema:** O jogo não estava liberando a memória da GPU (geometrias, texturas, materiais) ao trocar de tela ou reiniciar o combate, causando acúmulo de memória até o crash na missão do Boss.
**Solução:**
- Implementado método `dispose()` completo em `ARSceneManager.js` que limpa recursivamente todos os recursos Three.js.
- Atualizado `main.js` para chamar `dispose()` e anular a referência do gerenciador ao encerrar sessões AR ou trocar de tela.

### 2. Sistema de Narração Robusto (GameMaster.js)
**Problema:** Erros de sintetização de voz (`synthesis-failed`) e chamadas rápidas e sobrepostas de narração causavam loops de erro e instabilidade no navegador.
**Solução:**
- Implementada uma **Fila de Narração**: As falas agora são enfileiradas e processadas sequencialmente.
- **Tratamento de Erros**: O sistema agora se recupera suavemente de falas falhadas e desativa temporariamente a voz se ocorrer erro crítico, prevenindo o crash da aba.
- **Prevenção de Flood**: O sistema evita cancelar e reiniciar falas freneticamente.

### 3. Melhoria de Performance (ARSceneManager.js)
**Problema:** O log de "Performance baixa detectada" estava sendo disparado repetidamente, poluindo o console.
**Solução:**
- Corrigida a lógica para emitir o aviso e desativar partículas apenas uma vez.

## Como Testar
1. Inicie o jogo (`npm run dev`) e jogue através das missões.
2. Observe o console (`F12`) - ao final de cada combate, deve aparecer `[AR] Recursos liberados e memória limpa`.
3. Ao chegar na missão 5 (Lobisomem), o jogo deve carregar sem fechar a aba.
4. Se houver erro na voz (log `synthesis-failed`), o jogo continuará rodando.

## Arquivos Modificados
- `src/gm/GameMaster.js`
- `src/render/ARSceneManager.js`
- `src/main.js`
