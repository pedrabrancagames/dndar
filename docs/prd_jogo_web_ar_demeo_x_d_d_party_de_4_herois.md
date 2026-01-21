# PRD – Product Requirements Document

## 📑 Sumário

1. Visão Geral
2. Objetivos do Produto
3. Público-Alvo
4. Plataformas e Restrições
5. Conceito de Gameplay
6. Party de 4 Heróis
7. Sistema de Turnos
8. Sistema de Cartas (Visão Geral)
9. Combate em Realidade Aumentada
10. Game Master Virtual
11. Exploração Baseada em GPS
12. Telas do Jogo
13. HUD de Combate
14. Progressão
15. Salvamento e Checkpoints
16. Requisitos Técnicos
17. Fora de Escopo (MVP)
18. Métricas de Sucesso
19. Próximas Fases
20. GDD – Sistema de Combate (Detalhado)
21. GDD – Sistema de Cartas (4 Classes)
22. Campanha – Capítulo 1: O Despertar

---

## Nome do Projeto
**(Nome provisório)**: Crônicas do Bairro Esquecido (WebAR)

---

## 1. Visão Geral

**Crônicas do Bairro Esquecido** é um jogo de **realidade aumentada via navegador mobile (Android)**, inspirado em **Demeo** e **D&D Battlemarked**, no qual o jogador controla **uma party fixa de 4 heróis** em uma **campanha narrativa guiada por um Game Master virtual**.

O jogo se passa em **locais reais do bairro do jogador**, utilizando **GPS** para progressão e **AR** para exibir inimigos, itens e eventos em **tamanho real**, sem movimentação de personagens dentro do combate.

A experiência é **offline-first**, após o primeiro carregamento.

---

## 2. Objetivos do Produto

- Criar uma experiência de RPG tático solo, com profundidade estratégica
- Usar AR de forma estável e segura em navegador
- Substituir o mestre humano por um **Game Master programado**
- Incentivar exploração física do bairro
- Permitir sessões curtas de jogo

---

## 3. Público-Alvo

- Jogadores de RPG (D&D, Pathfinder)
- Fãs de Demeo, HeroQuest, Gloomhaven
- Jogadores mobile Android
- Usuários interessados em experiências AR narrativas

---

## 4. Plataformas e Restrições

- **Plataforma**: Navegador mobile Android (Chrome)
- **Tecnologia**: WebXR + A-Frame + Three.js
- **Sem app nativo**
- **Sem multiplayer** (fase inicial)
- **Offline-first após cache inicial**

---

## 5. Conceito de Gameplay

### 5.1 Estrutura Geral

- 1 jogador
- 4 heróis controlados pelo jogador
- Combate por turnos
- Ações definidas por cartas
- Sem movimentação de personagens
- Movimentação apenas via GPS

---

## 6. Party de 4 Heróis

### 6.1 Heróis Fixos

- Guerreiro – tanque / dano físico
- Mago – dano mágico / controle
- Ladino – dano crítico / debuff
- Clérigo – cura / suporte

Cada herói possui:
- PV (Pontos de Vida)
- PA (Pontos de Ação)
- Deck próprio de cartas
- Progressão individual

---

## 7. Sistema de Turnos

### 7.1 Fluxo de Turno

1. Game Master anuncia o herói ativo
2. HUD destaca o herói atual
3. Jogador usa cartas até acabar o PA
4. Próximo herói
5. Turno dos inimigos
6. Novo round

---

## 8. Sistema de Cartas

### 8.1 Funcionamento

- Jogador **clica na carta**
- Sistema entra em modo de seleção de alvo
- Jogador **clica no inimigo, herói ou objeto em AR ou HUD**
- Ação é executada

### 8.2 Estrutura de Carta

- Nome
- Custo em PA
- Tipo de alvo (inimigo, aliado, objeto)
- Descrição
- Efeito lógico (sem visualização de área)

---

## 9. Combate em Realidade Aumentada

### 9.1 Inimigos

- Renderizados em **tamanho real**
- Modelos 3D `.glb`
- Ancorados no ambiente real
- Selecionáveis por toque

### 9.2 Heróis

- **Não aparecem em AR**
- Representados por:
  - Retrato PNG
  - HUD estilo FPS (inferior direito)

---

## 10. Game Master Virtual

### 10.1 Funções

- Introduzir capítulos
- Fornecer briefing de missões
- Narrar resultados de ações
- Liberar novos objetivos
- Reagir a sucesso ou falha

### 10.2 Forma de Comunicação

- Texto na tela
- Opcional: áudio sintético offline

---

## 11. Exploração Baseada em GPS

- Mapa do bairro com pontos de interesse
- Eventos ativados ao chegar no local
- Combates iniciam ao parar no local

---

## 12. Telas do Jogo

### 12.1 Tela de Loading

- Logo
- Barra de carregamento
- Cache de assets para uso offline

### 12.2 Tela HOME

- Game Master
- Combate & Exploração
- Mapa
- Perfil
- Configurações

### 12.3 Tela Game Master

- Narrativa
- Briefing
- Objetivos

### 12.4 Tela de Combate (AR)

- AR ativo
- HUD de party (lado esquerdo)
- Cartas (inferior)
- Retrato do herói ativo (inferior direito)

---

## 13. HUD de Combate

### 13.1 Party (lado esquerdo)

- Retratos dos 4 heróis
- PV
- PA
- Status

### 13.2 Cartas

- Apenas do herói ativo
- Toque para selecionar

---

## 14. Progressão

### 14.1 Individual

- Novas cartas
- Upgrade de cartas
- Traits passivos

### 14.2 Party

- Sinergias
- Eventos narrativos exclusivos

---

## 15. Salvamento e Checkpoints

- Automático
- Estado salvo:
  - Missão atual
  - PV/PA dos heróis
  - Decks
  - Progresso narrativo

---

## 16. Requisitos Técnicos

- WebXR compatível
- Raycasting para seleção
- Service Workers
- IndexedDB
- Assets locais

---

## 17. Fora de Escopo (MVP)

- Multiplayer
- PvP
- Movimentação de personagens
- Área de efeito visual no AR

---

## 18. Métricas de Sucesso

- Tempo médio de sessão
- Missões concluídas
- Retenção por capítulo

---

## 19. Próximas Fases

- Capítulo 1 jogável
- Sistema de áudio narrado
- Bosses com múltiplas fases
- Expansão de classes

---

**Status:** PRD Base aprovado para produção

---

# DOCUMENTO DE COMBATE – GDD (DETALHADO)

## 1. Visão Geral do Sistema de Combate

O sistema de combate é **tático, por turnos, baseado em cartas**, sem movimentação de personagens no espaço virtual. A única movimentação ocorre no mundo real (GPS). O combate acontece em **realidade aumentada**, com inimigos e objetos em tamanho real.

---

## 2. Estrutura do Combate

- Combate iniciado por evento narrativo ou chegada a local GPS
- Jogador controla **4 heróis**
- Inimigos são controlados por IA simples
- Combate ocorre com o jogador parado fisicamente

---

## 3. Ordem de Turnos

### 3.1 Fluxo de Round

1. Início do round
2. Turno do Herói 1
3. Turno do Herói 2
4. Turno do Herói 3
5. Turno do Herói 4
6. Turno dos inimigos
7. Fim do round

---

## 4. Pontos de Vida (PV)

- Representam a resistência do herói ou inimigo
- Ao chegar a 0 PV:
  - Herói: fica incapacitado
  - Inimigo: é derrotado

Heróis incapacitados:
- Não agem
- Podem ser curados ou revividos por cartas específicas

---

## 5. Pontos de Ação (PA)

- Cada herói inicia o turno com PA total
- PA padrão por classe:
  - Guerreiro: 2 PA
  - Mago: 3 PA
  - Ladino: 3 PA
  - Clérigo: 2 PA

- Cartas consomem PA
- PA não usado é perdido no fim do turno

---

## 6. Ações Básicas

Todas as ações são executadas via **cartas**.

Tipos:
- Ataque
- Cura
- Buff
- Debuff
- Controle
- Interação

---

## 7. Seleção de Ação e Alvo

### 7.1 Fluxo de Ação

1. Jogador seleciona uma carta
2. Sistema entra em modo de seleção de alvo
3. Jogador toca em:
   - Inimigo em AR
   - Herói no HUD
   - Objeto em AR
4. Ação é executada

---

## 8. Regras de Alvo

Cada carta define:
- Tipo de alvo permitido
- Restrições narrativas

Exemplo:
- Cura → apenas heróis
- Ataque físico → apenas inimigos
- Interação → objetos

---

## 9. Inimigos

### 9.1 Estrutura de Inimigo

Cada inimigo possui:
- PV
- Tipo
- Comportamento
- Lista de ataques
- Status possíveis

---

## 10. Turno dos Inimigos (IA)

- Inimigos agem em ordem fixa
- Prioridade de alvo:
  1. Heróis com menor PV
  2. Heróis que causaram mais dano
  3. Herói mais próximo narrativamente

---

## 11. Status Effects

Exemplos:
- Queimando: dano por round
- Congelado: perde próximo turno
- Envenenado: dano contínuo
- Provocado: força alvo

---

## 12. Fim de Combate

O combate termina quando:
- Todos os inimigos são derrotados
- Ou condição narrativa é atingida

Ao final:
- GM narra o desfecho
- Recompensas são concedidas
- Checkpoint salvo

---

## 13. Chefes (Bosses)

Chefes possuem:
- Múltiplas fases
- Mudança de comportamento
- Eventos narrativos durante o combate

---

## 14. Falha em Combate

Se todos os heróis forem incapacitados:
- GM narra a derrota
- Jogador retorna ao último checkpoint

---

## 15. Feedback Visual e Sonoro

- Animações simples no inimigo
- Efeitos sonoros
- Feedback textual do GM

---

## 16. Considerações de Balanceamento

- Combates devem durar 3–6 rounds
- PA limita explosões de dano
- Status devem ser raros e impactantes

---

**Status:** Documento de Combate aprovado para implementação

---

# SISTEMA DE CARTAS – DESIGN & JSON (4 CLASSES)

## 1. Visão Geral

O sistema de cartas define **todas as ações possíveis no jogo**. Cada herói possui um **deck próprio**, refletindo sua identidade tática. As cartas são usadas durante o combate, consumindo **Pontos de Ação (PA)** e exigindo a seleção de um alvo válido.

Não há cartas de movimento.

---

## 2. Estrutura Base de Carta (JSON)

```json
{
  "id": "fireball",
  "nome": "Bola de Fogo",
  "classe": "Mago",
  "custoPA": 3,
  "tipo": "ataque",
  "alvo": "inimigo",
  "descricao": "Lança uma bola de fogo que explode ao atingir o alvo.",
  "efeitos": {
    "dano": "3d6",
    "status": "queimando"
  }
}
```

---

## 3. Tipos de Cartas

- Ataque
- Cura
- Buff
- Debuff
- Controle
- Interação

---

## 4. Cartas por Classe

### 4.1 Guerreiro

**Função:** Linha de frente, controle de inimigos

Cartas iniciais:

```json
[
  {
    "id": "heavy_strike",
    "nome": "Golpe Pesado",
    "custoPA": 2,
    "tipo": "ataque",
    "alvo": "inimigo",
    "efeitos": { "dano": "2d8" }
  },
  {
    "id": "shield_wall",
    "nome": "Defesa Total",
    "custoPA": 1,
    "tipo": "buff",
    "alvo": "self",
    "efeitos": { "defesa": "+2" }
  },
  {
    "id": "taunt",
    "nome": "Provocar",
    "custoPA": 1,
    "tipo": "controle",
    "alvo": "inimigo",
    "efeitos": { "status": "provocado" }
  }
]
```

---

### 4.2 Mago

**Função:** Dano mágico, controle de campo

```json
[
  {
    "id": "fireball",
    "nome": "Bola de Fogo",
    "custoPA": 3,
    "tipo": "ataque",
    "alvo": "inimigo",
    "efeitos": { "dano": "3d6", "status": "queimando" }
  },
  {
    "id": "arcane_bolt",
    "nome": "Raio Arcano",
    "custoPA": 2,
    "tipo": "ataque",
    "alvo": "inimigo",
    "efeitos": { "dano": "2d6" }
  },
  {
    "id": "freeze",
    "nome": "Congelar",
    "custoPA": 1,
    "tipo": "controle",
    "alvo": "inimigo",
    "efeitos": { "status": "congelado" }
  }
]
```

---

### 4.3 Ladino

**Função:** Dano crítico, debuffs

```json
[
  {
    "id": "backstab",
    "nome": "Ataque Furtivo",
    "custoPA": 2,
    "tipo": "ataque",
    "alvo": "inimigo",
    "efeitos": { "dano": "2d6", "critico": true }
  },
  {
    "id": "poison_blade",
    "nome": "Lâmina Envenenada",
    "custoPA": 1,
    "tipo": "debuff",
    "alvo": "inimigo",
    "efeitos": { "status": "envenenado" }
  },
  {
    "id": "disarm_trap",
    "nome": "Desarmar Armadilha",
    "custoPA": 1,
    "tipo": "interacao",
    "alvo": "objeto",
    "efeitos": { "resultado": "armadilha_desarmada" }
  }
]
```

---

### 4.4 Clérigo

**Função:** Cura, suporte e controle leve

```json
[
  {
    "id": "heal",
    "nome": "Cura",
    "custoPA": 2,
    "tipo": "cura",
    "alvo": "heroi",
    "efeitos": { "cura": "2d6" }
  },
  {
    "id": "bless",
    "nome": "Bênção",
    "custoPA": 1,
    "tipo": "buff",
    "alvo": "heroi",
    "efeitos": { "ataque": "+1" }
  },
  {
    "id": "turn_undead",
    "nome": "Afastar Mortos-Vivos",
    "custoPA": 2,
    "tipo": "controle",
    "alvo": "inimigo",
    "efeitos": { "status": "amedrontado" }
  }
]
```

---

## 5. Progressão de Cartas

- Cartas novas desbloqueadas por capítulo
- Upgrades possíveis:
  - Redução de custo PA
  - Aumento de dano
  - Efeitos adicionais

---

## 6. Regras de Balanceamento

- Cada herói inicia com 6–8 cartas
- Mão ativa limitada (ex: 5 cartas)
- Cartas poderosas têm custo alto

---

**Status:** Sistema de Cartas aprovado para produção

---

# CAPÍTULO 1 – O DESPERTAR (CAMPANHA INICIAL)

> **Nota:** Este é o **primeiro capítulo jogável da campanha**, localizado ao final do PRD. Ele descreve missões, narrativa, locais GPS e combates iniciais.

## 1. Objetivo do Capítulo

Introduzir o jogador ao mundo do jogo, à party de 4 heróis, às mecânicas básicas de exploração por GPS e ao combate em AR, estabelecendo o tom narrativo da campanha.

---

## 2. Contexto Narrativo

> "Durante anos, o bairro permaneceu em silêncio. Mas algo antigo despertou sob suas ruas, atraído por passos desavisados e memórias esquecidas. Você e seu grupo foram chamados para investigar."  
— *Game Master*

O Capítulo 1 apresenta a **ameaça inicial**, sem revelar ainda o grande antagonista.

---

## 3. Estrutura do Capítulo

- Total de missões: 3
- Duração estimada: 30–45 minutos
- Locais reais do bairro
- Progressão linear

---

## 4. Missão 1 – O Chamado

### Tipo
Introdução / Exploração

### Gatilho
Primeiro acesso ao jogo ou retorno após tutorial

### Briefing do GM

> "Algo incomum foi relatado próximo ao primeiro ponto marcado. Vá até lá e observe." 

### Objetivos
- Abrir o mapa
- Caminhar até o Local 1

### Local 1 (GPS)
- Tipo: Ponto de Interesse
- Evento AR: Símbolo antigo no chão (objeto 3D)

### Evento Narrativo

> "Este símbolo não é recente. Ele reage à sua presença." 

### Resultado
- Missão concluída
- Checkpoint salvo

---

## 5. Missão 2 – Primeira Ameaça

### Tipo
Combate

### Gatilho
Interação com o símbolo

### Briefing do GM

> "Preparem-se. Vocês não estão sozinhos." 

### Inimigos
- 2 Criaturas Sombras (PV baixo)

### Mecânicas Introduzidas
- Turnos
- Uso de cartas
- Seleção de alvo

### Objetivos
- Derrotar todos os inimigos

### Pós-Combate

> "Isso foi apenas um presságio." 

### Recompensas
- Nova carta para um herói

---

## 6. Missão 3 – Ecos no Bairro

### Tipo
Exploração + Combate

### Gatilho
Conclusão da Missão 2

### Briefing do GM

> "Outros pontos apresentam a mesma energia. Precisamos investigar." 

### Locais 2 e 3 (GPS)

#### Local 2
- Evento: Item antigo (interação)

#### Local 3
- Evento: Emboscada

### Inimigos
- 1 Criatura Maior

### Objetivos
- Investigar os locais
- Sobreviver à emboscada

---

## 7. Clímax do Capítulo

Após o último combate:

> "Agora sabemos que algo desperto se espalha pelo bairro. E isso foi apenas o começo." 

---

## 8. Recompensas do Capítulo

- Desbloqueio de novas cartas
- Progresso narrativo
- Acesso ao Capítulo 2

---

## 9. Checkpoints

- Após cada missão
- Após cada combate

---

## 10. Gancho para Capítulo 2

> "A origem dessa corrupção não está aqui. Mas sabemos onde procurar." 

---

**Status:** Capítulo 1 aprovado para produção

