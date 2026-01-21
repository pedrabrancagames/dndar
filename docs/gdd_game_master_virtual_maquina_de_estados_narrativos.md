# GDD – Game Master Virtual (Máquina de Estados Narrativos)

## Visão Geral
O **Game Master Virtual (GMV)** é o cérebro narrativo do jogo. Ele substitui o mestre humano de D&D, apresentando história, objetivos, reações e consequências de forma **programada, adaptativa e offline-first**.

O GMV não é uma IA generativa em tempo real. Ele funciona como uma **máquina de estados narrativos**, garantindo controle, coerência e previsibilidade técnica.

---

## Funções do Game Master Virtual
- Apresentar introduções e briefings de missão
- Explicar objetivos e contexto narrativo
- Reagir a sucessos, falhas e decisões
- Controlar progressão da campanha
- Adaptar diálogos conforme estado do bairro

---

## Arquitetura Conceitual

### Componentes Principais
- **Narrative State Manager** – controla o estado global da história
- **Mission State Machine** – controla missões ativas
- **Dialogue Engine** – seleciona falas
- **Event Trigger System** – dispara eventos por GPS, tempo ou ação

---

## Estados Narrativos Globais

Estados persistentes salvos localmente:
- Capítulo atual
- Missão atual
- Estado do bairro (estável / instável / colapso)
- Decisões irreversíveis
- Penalidades ativas

Esses estados afetam:
- Diálogos
- Eventos disponíveis
- Dificuldade

---

## Máquina de Estados de Missão

Cada missão possui estados:
1. **Locked** – indisponível
2. **Briefing** – GM apresenta a missão
3. **Active** – jogador pode ir ao local
4. **In Progress** – evento AR ativo
5. **Success** / **Partial Success** / **Failure**
6. **Resolved** – consequências aplicadas

---

## Gatilhos (Triggers)

### Tipos de Gatilho
- **GPS** – jogador entra em raio definido
- **Tempo Real** – contagem regressiva
- **Combate** – vitória, derrota, turnos
- **Decisão** – escolha do jogador

---

## Sistema de Diálogos

### Estrutura de Diálogo
Cada fala contém:
- ID
- Texto
- Condição de exibição
- Prioridade
- Áudio opcional

### Exemplo de Condição
- Capítulo == 3
- Estado do bairro == Instável
- Missão X concluída

---

## Reação a Falhas
Falhar não bloqueia o jogo, mas:
- Aumenta corrupção
- Altera diálogos
- Desbloqueia eventos mais difíceis

---

## Offline-First
- Todos os diálogos armazenados localmente
- Estados salvos em IndexedDB
- Nenhuma dependência de servidor para campanha

---

## Integração com HUD
- Briefings exibidos na tela Game Master
- Alertas curtos durante exploração
- Falas contextuais no combate

---

## Exemplo de Fluxo

1. Jogador abre o jogo
2. GM detecta estado atual
3. Exibe briefing correto
4. Aguarda gatilho GPS
5. Dispara evento AR
6. Aplica consequência
7. Atualiza estado narrativo

---

## Conclusão
O Game Master Virtual garante experiência narrativa profunda, controlada e escalável, ideal para jogos WebAR mobile.

