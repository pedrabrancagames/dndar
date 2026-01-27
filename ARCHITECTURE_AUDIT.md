# 🏗️ Auditoria de Arquitetura: Crônicas do Bairro Esquecido (dnd-demeo)

**Data:** 27/01/2026
**Auditor:** Antigravity (Skill de Arquitetura)
**Escopo:** Código Fonte, Gestão de Assets, Estrutura do Projeto

---

## 1. 📊 Resumo Executivo

O projeto é um RPG WebXR/3D construído com **Three.js** e **Vanilla JavaScript**, orquestrado pelo **Vite**. A base de código segue um padrão clássico de "Game Loop" com classes Gerenciadoras (Managers). Embora funcional e mais simples que abordagens baseadas em frameworks pesados, o projeto exibe sinais de dores de crescimento típicas de projetos Vanilla JS que escalam: alto acoplamento no ponto de entrada principal, gerenciamento de estado disperso e tamanhos de assets não verificados.

**Pontuação de Saúde:** 🟡 **Moderada** (Fundação funcional, mas dívida técnica de arquitetura está acumulando)

---

## 2. 🔍 Análise Estrutural

### 2.1. O Padrão "God Class" (`main.js`)
A classe `Game` em `src/main.js` está atuando como uma "God Class" (Classe Deus):
- **Responsabilidades**: Inicialização, Cache de Elementos DOM, Vínculo de Event Listeners (UI e Lógica), Roteamento de Navegação, Detenção de Estado.
- **Risco**: À medida que funcionalidades são adicionadas (Inventário, Perfil, Mapa), este arquivo cresce linearmente, tornando-se mais difícil de manter.
- **Evidência**: `setupEventListeners` e `setupCombatCallbacks` são métodos de "código cola" manuais que estão se tornando gigantescos.

### 2.2. Gerenciamento de Estado Distribuído
O estado do jogo está fragmentado entre múltiplos gerenciadores:
- `CombatManager`: Mantém `herois`, `inimigos`, `emCombate`.
- `Game` (Main): Mantém `saveData`, `settings`, `inventory`.
- `SaveManager`: Lida com a lógica de persistência, mas não é a "fonte da verdade" em tempo de execução.
- **Risco**: Problemas de sincronização. Por exemplo, se um item é equipado no Inventário, o `CombatManager` sabe disso imediatamente? Atualmente requer atualizações/sincronização manuais.

### 2.3. Arquitetura Orientada a Eventos
**Ponto Forte**: O uso de um padrão interno `emit/on` nos Gerenciadores (`CombatManager`, `TurnManager`) é uma escolha arquitetural forte. Desacopla a lógica central da UI até certo ponto.
**Ponto Fraco**: A ligação é manual em `main.js`. Se `CombatManager` emite 'heroDied', `main.js` deve capturar explicitamente e dizer ao `SceneManager` para remover a malha (mesh) e ao `HUD` para atualizar o log.

---

## 3. 📦 Gerenciamento de Assets

### 3.1. Assets Pesados
Como notado em `MODELS_ANALYSIS.md`, assets como `bugbear.glb` (57MB) e `wight.glb` (41MB) são criticamente grandes para uma aplicação web, especialmente uma visando AR móvel.
- **Impacto**: Tempos de carregamento lentos, travamentos de navegador móvel (falta de memória).
- **Controle**: Atualmente manual. Nenhum pipeline automatizado para compressão.

---

## 4. 🛠️ Tech Stack & Ferramentas

- **Linguagem**: Vanilla JavaScript (ES Modules).
  - *Risco*: Falta de segurança de tipo. Refatorar entidades complexas como `Hero` ou `Card` é propenso a erros sem TypeScript ou JSDoc estrito.
- **Build**: Vite. (Escolha excelente, rápido e moderno).
- **Testes**: **AUSENTE**. Sem testes unitários para regras do jogo (Ordem de turnos, Cálculo de dano).
  - *Risco*: Regressões na lógica de combate são prováveis à medida que novas funcionalidades (ex: Efeitos de Status) são adicionadas.

---

## 5. 💡 Recomendações

### Prioridade 1: Limpeza Estrutural (Baixo Esforço / Alto Valor)
1. **Extrair `UIManager`**: Mover todo o cache de elementos DOM, vínculo de eventos e lógica de troca de tela de `main.js` para `src/ui/UIManager.js`. `main.js` deve apenas orquestrar a inicialização.
2. **`GameState` Centralizado**: Criar um Objeto de Estado simples ou Proxy que mantém dados globais (Ouro, Inventário, Missões Desbloqueadas) para agir como fonte única da verdade.

### Prioridade 2: Resiliência (Médio Esforço)
3. **Segurança de Tipo via JSDoc**: Adicionar `jsconfig.json` e começar a adicionar anotações JSDoc `@type` às classes principais (`Hero`, `Enemy`). Habilitar `checkJs` no VSCode para capturar erros.
4. **Testes Unitários**: Instalar **Vitest**. Adicionar testes para `TurnManager.js` e `CardSystem.js`. Estes são módulos de lógica pura e fáceis de testar.

### Prioridade 3: Pipeline de Assets (Crítico para UX)
5. **Script de Otimização de Assets**: Criar um script utilitário usando `@gltf-transform/cli` para comprimir automaticamente texturas e dados de malha para todos os arquivos GLB em `public/assets`.

---

## 6. Registros de Decisão de Arquitetura (ADRs) - Propostos

| ID | Título | Decisão de Design | Racional |
|----|--------|-------------------|----------|
| 001 | **Extração do UIManager** | Mover lógica de DOM para Gerenciador genérico | Limpar o ponto de entrada Principal |
| 002 | **Tipagem JSDoc** | Usar JSDoc + TS Check | Obter segurança de tipo sem reescrita total para TS |
| 003 | **Vitest** | Usar Vitest para Lógica | Garantir que a matemática de combate permaneça correta |
