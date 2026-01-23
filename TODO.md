# 📋 TODO - Crônicas do Bairro Esquecido

Última atualização: 2026-01-23 (Revisado)

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### Sistema de Combate
- [x] Sistema de turnos por rodada (heróis primeiro, depois inimigos)
- [x] Sistema de cartas com custos de PA (Pontos de Ação)
- [x] 24 cartas implementadas (6 por heróis)
- [x] Dano, cura, buffs e debuffs funcionando
- [x] Sistema de seleção de alvos
- [x] Cartas de área de efeito (todos_inimigos, todos_herois)
- [x] Sistema de crítico para algumas cartas
- [x] Verificação de condição de vitória/derrota
- [x] Cálculo de recompensas (XP)

### Heróis
- [x] 4 heróis jogáveis: Guerreiro, Mago, Ladino, Clérigo
- [x] Stats: PV, PA, Defesa, Ataque
- [x] Sistema de buffs e debuffs
- [x] Escudo temporário
- [x] Evasão (esquivar próximo ataque)
- [x] Incapacitação ao chegar a 0 PV
- [x] Ressurreição de heróis incapacitados

### Inimigos
- [x] 16 tipos de inimigos definidos
- [x] IA de combate básica com prioridades de alvo
- [x] Comportamentos: menor_pv, maior_dano, mais_proximo, aleatorio
- [x] Agressividade: covarde, normal, agressivo
- [x] Vulnerabilidades e resistências a tipos de dano
- [x] Sistema de debuffs (congelado, paralisado, amedrontado, marcado)
- [x] Status de provocado (Tank)
- [x] Bosses com múltiplas fases (estrutura implementada)
- [x] Lifesteal para alguns inimigos (implementado no turno)
- [x] Regeneração implementada para Troll

### Interface/HUD
- [x] Tela de loading
- [x] Menu principal
- [x] HUD de combate com party visível
- [x] Log de combate
- [x] Indicador de turno e round
- [x] Seleção de cartas
- [x] Modo de seleção de alvo
- [x] Diálogo do Game Master
- [x] Destaque visual em heróis e inimigos selecionáveis
- [x] Animação de dano nos heróis

### Renderização 3D
- [x] Cena 3D básica com Three.js
- [x] Carregamento de modelos GLB
- [x] Barra de vida 3D sobre inimigos
- [x] Destaque de inimigos selecionáveis
- [x] Efeitos visuais de dano (shake, flash)
- [x] Efeitos de fogo, gelo, raio
- [x] Efeito de debuff
- [x] Fade out na remoção de inimigos

### Realidade Aumentada
- [x] ARSceneManager com WebXR
- [x] Verificação de suporte a AR
- [x] Reticula para posicionamento
- [x] Posicionamento de inimigos via toque
- [x] Sistema de partículas para efeitos
- [x] Fallback para modo 3D normal

### Áudio
- [x] AudioManager com 22 efeitos sonoros
- [x] Música de combate
- [x] Controles de volume (música, SFX)
- [x] Sistema de mudo

### Game Master Virtual
- [x] Narração por voz (Text-to-Speech)
- [x] Briefing de missões
- [x] Narração de ações importantes
- [x] Anúncio de combate, vitória e derrota
- [x] Configurações de velocidade e volume de voz

### Campanha
- [x] Capítulo 1 com 5 missões
- [x] Sistema de seleção de missões
- [x] Briefings por missão
- [x] Recompensas por missão
- [x] Progresso de capítulo

### Persistência
- [x] SaveManager com localStorage
- [x] Salvar/carregar progresso
- [x] Salvar configurações
- [x] Sistema de XP por herói
- [x] Registro de missões completas
- [x] Estatísticas de combate

---

## ❌ FUNCIONALIDADES A IMPLEMENTAR

### 🔴 Prioridade Alta (Crítico para gameplay)

#### ~~Sistema de Level Up~~ ✅
- [x] Implementar UI de level up quando herói ganha nível
- [x] Aumentar stats dos heróis ao subir de nível
- [x] Desbloquear novas cartas ao subir de nível (níveis 3, 5, 7, 10)
- [x] Mostrar XP atual e XP necessário para próximo nível

#### ~~Recompensas de Cartas~~ ✅
- [x] Criar carta `lunar_strike` (recompensa do boss do Capítulo 1)
- [x] Sistema de adicionar cartas novas ao deck do herói
- [x] UI para visualizar cartas desbloqueadas (na tela de Perfil)

#### Fases de Boss
- [ ] UI para mostrar transição de fase do boss
- [ ] Animação/efeito especial na mudança de fase
- [ ] Narração do Game Master na transição de fase
- [ ] Restauração parcial de PV ao mudar de fase

#### Status de Ataques Inimigos
- [ ] Aplicar status (envenenado, paralisado, etc.) quando inimigo ataca com ataques que têm status
- [ ] Mostrar no log quando herói recebe status de ataque inimigo

### 🟡 Prioridade Média (Melhoria de experiência)

#### ~~Tela de Mapa~~ ✅
- [x] Criar tela de mapa do bairro
- [x] Mostrar localizações das missões
- [x] Indicar missões disponíveis, completas e bloqueadas
- [x] Caminhos conectando locais com estados (ativo, completo)
- [x] Legenda interativa
- [ ] Navegação entre capítulos (quando houver mais)

#### ~~Tela de Perfil/Party~~ ✅
- [x] Criar tela de perfil dos heróis
- [x] Mostrar stats detalhados de cada herói
- [x] Mostrar deck atual de cada herói (cartas desbloqueadas)
- [x] Histórico de combates e estatísticas
- [x] Sistema de equipamentos (visual)
- [x] Títulos baseados em progresso
- [x] Sistema de conquistas/achievements

#### ~~Sistema de Inventário~~ ✅
- [x] UI de inventário completa
- [x] Sistema de filtros por categoria
- [x] Detalhes de itens com stats
- [x] Sistema de equipar/desequipar
- [x] Loja para comprar itens com ouro
- [x] Vender itens
- [x] 24 itens implementados (armas, armaduras, acessórios, consumíveis)
- [ ] Usar itens durante combate (poções, etc.)

#### Comportamentos de IA Avançados
- [ ] Implementar IA "calculista" (escolhe melhor ataque para situação)
- [ ] Implementar IA "emboscador" (bônus de dano no primeiro ataque)
- [ ] Covardes fogem/param de atacar quando com pouco PV

#### Configurações de Gameplay
- [ ] Implementar toggle de "Mostrar Dicas"
- [ ] Implementar toggle de "Auto Passar Turno" quando sem PA
- [ ] Seleção de dificuldade

#### Navegação de Combate
- [ ] Botão de pausar combate
- [ ] Botão de voltar ao menu (com confirmação)
- [ ] Opção de reiniciar missão

### 🟢 Prioridade Baixa (Nice to have)

#### Capítulos Adicionais
- [ ] Criar Capítulo 2
- [ ] Criar Capítulo 3
- [ ] Sistema de desbloquear próximo capítulo ao completar boss

#### Carta "Desarmar Armadilha"
- [ ] Sistema de armadilhas/objetos interativos
- [ ] Detecção de armadilhas durante exploração
- [ ] Uso da carta do Ladino para desarmar

#### Tipo de Dano
- [ ] Passar tipo de dano corretamente das cartas (fogo, gelo, sagrado, etc.)
- [ ] Vulnerabilidades funcionarem com tipos de dano de cartas

#### Animações Avançadas
- [ ] Animações GLB dos modelos (se disponíveis)
- [ ] Animações de ataque dos heróis
- [ ] Partículas mais elaboradas

#### Sistema de Tutorial
- [ ] Tutorial interativo para novos jogadores
- [ ] Explicação do sistema de cartas
- [ ] Explicação do sistema de turnos

#### Conquistas/Achievements
- [ ] Sistema de conquistas
- [ ] Conquistas por derrotar bosses
- [ ] Conquistas por completar capítulos
- [ ] Notificação de conquista desbloqueada

#### Multiplayer Local
- [ ] Cada jogador controla um herói
- [ ] Passagem de dispositivo entre turnos

---

## 🐛 BUGS CONHECIDOS

### Corrigidos (2026-01-22)
- [x] Event listener duplicado para botão de combate
- [x] Funções `salvarConfiguracoes` duplicadas
- [x] Validação de settings null
- [x] Métodos de efeitos visuais faltantes no SceneManager

### A Corrigir
- [x] Verificar se todos os modelos GLB existem para todos os inimigos
- [x] Algumas cartas podem não mostrar efeitos visuais corretos

---

## 📝 NOTAS DE DESENVOLVIMENTO

### Arquivos Principais
- `src/main.js` - Entry point e orquestração geral
- `src/game/CombatManager.js` - Lógica de combate
- `src/game/CardSystem.js` - Sistema de cartas
- `src/game/TurnManager.js` - Gerenciamento de turnos
- `src/game/CampaignManager.js` - Progressão de campanha
- `src/game/SaveManager.js` - Persistência de dados
- `src/entities/Hero.js` - Classe de heróis
- `src/entities/Enemy.js` - Classe de inimigos
- `src/render/SceneManager.js` - Renderização 3D
- `src/render/ARSceneManager.js` - Realidade Aumentada
- `src/ui/HUD.js` - Interface de combate
- `src/gm/GameMaster.js` - Narração e diálogos
- `src/audio/AudioManager.js` - Áudio e música

### Dados JSON
- `data/heroes.json` - Definição dos 4 heróis
- `data/enemies.json` - Definição dos 16 inimigos
- `data/cards.json` - Definição das 24 cartas
- `data/campaign.json` - Capítulo 1 com 5 missões

### Modelos 3D
- 33 modelos GLB em `/public/assets/models/`
- Suporte a DRACO compression

### Sons
- 22 efeitos sonoros em `/public/sounds/`
- 1 música de combate
