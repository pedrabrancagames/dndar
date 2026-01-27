/**
 * HUD - Interface de Combate
 * Renderiza e atualiza todos os elementos do HUD de combate
 */
export class HUD {
    constructor() {
        this.elements = {};
        this.cacheElements();
        this.callbacks = {};

        // AR Arc Carousel State
        this.isARMode = false;
        this.carouselIndex = 0;
        this.dragStartX = 0;
        this.currentDragX = 0;
        this.isDragging = false;
        this.cardsCount = 0;

        // Inventory State
        this.inventoryOpen = false;
        this.combatInventory = [];
    }

    /**
     * Cacheia referências aos elementos do DOM
     */
    cacheElements() {
        this.elements = {
            // Party Panel
            partyPanel: document.getElementById('party-panel'),
            heroSlots: document.querySelectorAll('.hero-slot'),

            // Turn Indicator
            turnIndicator: document.getElementById('turn-indicator'),
            turnHero: document.querySelector('.turn-hero'),
            turnRound: document.querySelector('.turn-round'),

            // Cards Area
            cardsContainer: document.getElementById('cards-container'),
            btnEndTurn: document.getElementById('btn-end-turn'),

            // Active Hero Portrait
            activeHeroPortrait: document.getElementById('active-hero-portrait'),
            portraitIcon: document.querySelector('.portrait-icon'),
            portraitName: document.querySelector('.portrait-name'),

            // Game Master Dialogue
            gmDialogue: document.getElementById('gm-dialogue'),
            gmText: document.getElementById('gm-text'),
            gmContinue: document.getElementById('gm-continue'),

            // Target Mode
            targetMode: document.getElementById('target-mode'),
            cancelTarget: document.getElementById('cancel-target'),

            // Combat Log
            logEntries: document.getElementById('log-entries'),

            // Inspection Panel (AR)
            inspectionPanel: document.getElementById('inspection-panel'),
            inspectionName: document.querySelector('.inspection-name'),
            inspectionIcon: document.querySelector('.inspection-icon'),
            inspectionHp: document.querySelector('.inspection-stat.hp .value'),
            inspectionDetails: document.querySelector('.inspection-details')
        };
    }

    /**
     * Registra callback
     */
    on(evento, callback) {
        this.callbacks[evento] = callback;
    }

    /**
     * Emite evento
     */
    emit(evento, data) {
        if (this.callbacks[evento]) {
            this.callbacks[evento](data);
        }
    }

    /**
     * Inicializa event listeners
     */
    init() {
        // Botão finalizar turno
        this.elements.btnEndTurn.addEventListener('click', () => {
            this.emit('finalizarTurno');
        });

        // Botão continuar diálogo GM
        this.elements.gmContinue.addEventListener('click', () => {
            this.emit('continuarDialogo');
        });

        // Botão cancelar seleção de alvo
        this.elements.cancelTarget.addEventListener('click', () => {
            this.emit('cancelarSelecao');
            this.esconderModoSelecao();
        });

        // Click nos heróis para seleção de alvo
        this.elements.heroSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                const heroId = slot.dataset.hero;
                const heroIndex = parseInt(heroId);
                this.emit('heroClicado', { index: heroIndex });
            });
        });

        // AR Carousel Event Listeners (Container)
        this.setupCarouselListeners();

        // Inicializar UI de Inventário de Combate
        this.criarUIInventario();
    }

    /**
     * Cria os elementos de UI do inventário de combate dinamicamente
     */
    criarUIInventario() {
        // Encontrar container de controles de combate (onde fica o botão de turno)
        // Se não houver um container específico, vamos assumir que buttons e cards ficam numa área inferior
        const cardsContainer = this.elements.cardsContainer;
        if (!cardsContainer) return;

        const controlsArea = cardsContainer.parentElement; // Assumindo uma div wrapper

        // 1. Criar Botão da Mochila
        const bagBtn = document.createElement('button');
        bagBtn.id = 'combat-bag-btn';
        bagBtn.className = 'combat-btn bag-btn';
        bagBtn.innerHTML = '🎒 Itens';
        bagBtn.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(to bottom, #8e44ad, #9b59b6);
            border: 2px solid #6c3483;
            border-radius: 8px;
            padding: 10px 15px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 50;
        `;

        // Inserir no DOM
        if (controlsArea) {
            controlsArea.appendChild(bagBtn);
        } else {
            document.body.appendChild(bagBtn); // Fallback
        }

        // 2. Criar Painel de Itens (inicialmente escondido)
        const itemPanel = document.createElement('div');
        itemPanel.id = 'combat-item-panel';
        itemPanel.className = 'combat-item-panel hidden';
        itemPanel.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 20px;
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid #8e44ad;
            border-radius: 10px;
            padding: 15px;
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
            z-index: 100;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
            transform-origin: bottom left;
        `;
        // Estado inicial de hidden via style também para garantir
        itemPanel.style.opacity = '0';
        itemPanel.style.pointerEvents = 'none';
        itemPanel.style.transform = 'scale(0.9)';

        // Inserir painel
        controlsArea ? controlsArea.appendChild(itemPanel) : document.body.appendChild(itemPanel);

        // Cachear novos elementos
        this.elements.bagBtn = bagBtn;
        this.elements.itemPanel = itemPanel;

        // Listeners
        bagBtn.addEventListener('click', () => this.toggleInventario());

        // Fechar ao clicar fora (opcional, mas bom pra UX)
        document.addEventListener('click', (e) => {
            if (this.inventoryOpen &&
                !itemPanel.contains(e.target) &&
                !bagBtn.contains(e.target)) {
                this.toggleInventario(false);
            }
        });
    }

    /**
     * Abre/Fecha inventário de combate
     */
    toggleInventario(forcarEstado = null) {
        const novoEstado = forcarEstado !== null ? forcarEstado : !this.inventoryOpen;
        this.inventoryOpen = novoEstado;

        const panel = this.elements.itemPanel;
        const btn = this.elements.bagBtn;
        if (!panel) return;

        if (this.inventoryOpen) {
            panel.classList.remove('hidden');
            // Animação de entrada
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
                panel.style.transform = 'scale(1)';
            });
            btn.classList.add('active');

            // Emitir evento para pedir dados atualizados (se necessário)
            // Mas idealmente o HUD já deveria ter recebido via update()
            // Vamos renderizar o que temos
            this.renderizarItens();

        } else {
            // Animação de saída
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';
            panel.style.transform = 'scale(0.9)';
            btn.classList.remove('active');

            setTimeout(() => {
                if (!this.inventoryOpen) panel.classList.add('hidden');
            }, 300);
        }
    }

    /**
     * Atualiza toda a party no HUD
     */
    atualizarParty(herois, heroiAtivoId) {
        herois.forEach((heroi, index) => {
            const slot = this.elements.heroSlots[index];
            if (!slot) return;

            // Atualizar dados do slot
            slot.dataset.heroId = heroi.id;

            // Classes ativas
            slot.classList.toggle('active', heroi.id === heroiAtivoId);
            slot.classList.toggle('incapacitated', heroi.incapacitado);

            // Nome e ícone
            const icon = slot.querySelector('.hero-icon');
            const name = slot.querySelector('.hero-name');
            if (icon) icon.textContent = heroi.icon;
            if (name) name.textContent = heroi.nome;

            // Barra de PV
            const hpBar = slot.querySelector('.hp-bar .stat-fill');
            const hpText = slot.querySelector('.hp-bar .stat-text');
            if (hpBar) hpBar.style.width = `${heroi.pvPercent}%`;
            if (hpText) hpText.textContent = `${heroi.pv}/${heroi.pvMax}`;

            // Barra de PA
            const paBar = slot.querySelector('.pa-bar .stat-fill');
            const paText = slot.querySelector('.pa-bar .stat-text');
            if (paBar) paBar.style.width = `${heroi.paPercent}%`;
            if (paText) paText.textContent = `${heroi.pa} PA`;

            // Indicadores de status (buffs/debuffs)
            this.atualizarIndicadoresStatus(slot, heroi);
        });
    }

    /**
     * Atualiza indicadores visuais de status
     */
    atualizarIndicadoresStatus(slot, heroi) {
        // Remover indicadores anteriores
        const indicadoresAntigos = slot.querySelectorAll('.status-indicator');
        indicadoresAntigos.forEach(el => el.remove());

        // Adicionar indicadores de buffs/debuffs
        const statusContainer = document.createElement('div');
        statusContainer.className = 'status-indicators';

        const statusIcons = {
            defesa: '🛡️',
            ataque: '⚔️',
            evasao: '💨',
            queimando: '🔥',
            envenenado: '🧪',
            congelado: '❄️',
            marcado: '🎯',
            amedrontado: '😨'
        };

        [...heroi.buffs, ...heroi.debuffs].forEach(status => {
            const icon = statusIcons[status] || '•';
            const indicator = document.createElement('span');
            indicator.className = 'status-indicator';
            indicator.textContent = icon;
            indicator.title = status;
            statusContainer.appendChild(indicator);
        });

        if (statusContainer.children.length > 0) {
            slot.appendChild(statusContainer);
        }
    }

    /**
     * Atualiza o indicador de turno
     */
    atualizarTurno(turnoData) {
        if (this.elements.turnHero) {
            this.elements.turnHero.textContent = turnoData.heroiAtivoNome || 'Inimigos';
        }
        if (this.elements.turnRound) {
            this.elements.turnRound.textContent = `Round ${turnoData.round}`;
        }
    }

    /**
     * Atualiza o retrato do herói ativo
     */
    atualizarHeroiAtivo(heroi) {
        if (!heroi) {
            this.elements.activeHeroPortrait.classList.add('hidden');
            return;
        }

        this.elements.activeHeroPortrait.classList.remove('hidden');

        if (this.elements.portraitIcon) {
            this.elements.portraitIcon.textContent = heroi.icon;
        }
        if (this.elements.portraitName) {
            this.elements.portraitName.textContent = heroi.nome;
        }
    }

    /**
     * Renderiza as cartas do herói ativo
     */
    renderizarCartas(cartas) {
        if (!this.elements.cardsContainer) return;

        this.elements.cardsContainer.innerHTML = '';
        this.cardsCount = cartas.length;

        // Resetar carousel index se necessário
        if (this.carouselIndex >= this.cardsCount) {
            this.carouselIndex = Math.max(0, this.cardsCount - 1);
        }

        cartas.forEach((carta, index) => {
            const cardEl = this.criarElementoCarta(carta, index);
            this.elements.cardsContainer.appendChild(cardEl);
        });

        // Se estiver em AR, aplicar transformações do carrossel
        if (this.isARMode) {
            this.updateCarousel();
        }
    }

    /**
     * Cria elemento DOM de uma carta
     */
    criarElementoCarta(carta, index) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.cardId = carta.id;
        card.dataset.type = carta.tipo;
        // Salvar índice para referência no carrossel
        card.dataset.index = index;

        if (!carta.disponivel) {
            card.classList.add('disabled');
        }

        card.innerHTML = `
      <span class="card-cost">${carta.custoPA}</span>
      <div class="card-icon">${carta.icon}</div>
      <div class="card-name">${carta.nome}</div>
      
      ${carta.preview && carta.preview.valor ? `
      <div class="card-stats">
        <span class="stat-value">${carta.preview.icone} ${carta.preview.valor}</span>
        ${carta.preview.secundario ? `<span class="stat-sec">${carta.preview.secundario}</span>` : ''}
      </div>
      ` : ''}

      <div class="card-type">${carta.tipo}</div>
    `;

        // Event listener para seleção
        card.addEventListener('click', (e) => {
            // Em modo AR, se clicar em carta lateral, apenas navega para ela
            if (this.isARMode && index !== this.carouselIndex) {
                e.stopPropagation(); // Evitar seleção acidental
                this.snapToCard(index);
                return;
            }

            if (!carta.disponivel) return;

            // Remover seleção anterior
            this.elements.cardsContainer.querySelectorAll('.card').forEach(c => {
                c.classList.remove('selected');
            });

            card.classList.add('selected');
            this.emit('cartaSelecionada', { cardId: carta.id });
        });

        return card;
    }

    /**
     * Limpa seleção de cartas
     */
    limparSelecaoCartas() {
        if (!this.elements.cardsContainer) return;

        this.elements.cardsContainer.querySelectorAll('.card').forEach(c => {
            c.classList.remove('selected');
        });
    }

    /**
     * Mostra modo de seleção de alvo
     */
    mostrarModoSelecao() {
        if (this.elements.targetMode) {
            this.elements.targetMode.classList.remove('hidden');
        }
    }

    /**
     * Esconde modo de seleção de alvo
     */
    esconderModoSelecao() {
        if (this.elements.targetMode) {
            this.elements.targetMode.classList.add('hidden');
        }
        this.limparSelecaoCartas();
    }

    /**
     * Mostra diálogo do Game Master
     */
    mostrarDialogoGM(texto) {
        if (!this.elements.gmDialogue || !this.elements.gmText) return;

        this.elements.gmText.textContent = texto;
        this.elements.gmDialogue.classList.remove('hidden');
    }

    /**
     * Esconde diálogo do Game Master
     */
    esconderDialogoGM() {
        if (this.elements.gmDialogue) {
            this.elements.gmDialogue.classList.add('hidden');
        }
    }

    /**
     * Adiciona entrada ao log de combate
     */
    adicionarLog(mensagem, tipo = 'normal') {
        if (!this.elements.logEntries) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${tipo}`;
        entry.textContent = mensagem;

        this.elements.logEntries.appendChild(entry);

        // Scroll para o final
        this.elements.logEntries.scrollTop = this.elements.logEntries.scrollHeight;

        // Limitar entradas
        while (this.elements.logEntries.children.length > 50) {
            this.elements.logEntries.removeChild(this.elements.logEntries.firstChild);
        }
    }

    /**
     * Limpa o log de combate
     */
    limparLog() {
        if (this.elements.logEntries) {
            this.elements.logEntries.innerHTML = '';
        }
    }

    /**
     * Mostra animação de dano em um herói
     */
    mostrarDanoHeroi(heroiIndex, dano) {
        const slot = this.elements.heroSlots[heroiIndex];
        if (!slot) return;

        slot.classList.add('animate-shake');

        // Criar número flutuante
        const floatNum = document.createElement('div');
        floatNum.className = 'float-damage';
        floatNum.textContent = `-${dano}`;
        floatNum.style.cssText = `
      position: absolute;
      top: -10px;
      right: 10px;
      color: #e74c3c;
      font-weight: bold;
      animation: floatUp 1s ease-out forwards;
      pointer-events: none;
    `;
        slot.appendChild(floatNum);

        setTimeout(() => {
            slot.classList.remove('animate-shake');
            floatNum.remove();
        }, 1000);
    }

    /**
     * Mostra animação de cura em um herói
     */
    mostrarCuraHeroi(heroiIndex, cura) {
        const slot = this.elements.heroSlots[heroiIndex];
        if (!slot) return;

        const floatNum = document.createElement('div');
        floatNum.className = 'float-heal';
        floatNum.textContent = `+${cura}`;
        floatNum.style.cssText = `
      position: absolute;
      top: -10px;
      right: 10px;
      color: #27ae60;
      font-weight: bold;
      animation: floatUp 1s ease-out forwards;
      pointer-events: none;
    `;
        slot.appendChild(floatNum);

        setTimeout(() => {
            floatNum.remove();
        }, 1000);
    }

    /**
     * Destaca heróis como alvos válidos
     */
    destacarAlvosHerois(heroiIds) {
        this.elements.heroSlots.forEach((slot, index) => {
            const heroiId = slot.dataset.heroId;
            if (heroiIds.includes(heroiId) || heroiIds.includes(index)) {
                slot.classList.add('alvo-valido');
            }
        });
    }

    /**
     * Remove destaque de heróis alvos
     */
    limparDestaqueHerois() {
        this.elements.heroSlots.forEach(slot => {
            slot.classList.remove('alvo-valido');
        });
    }

    /**
     * Atualiza estado geral do HUD
     */
    atualizar(estadoHUD) {
        if (!estadoHUD) return;

        // Atualizar party
        if (estadoHUD.herois) {
            this.atualizarParty(estadoHUD.herois, estadoHUD.turno?.heroiAtivoId);
        }

        // Atualizar indicador de turno
        if (estadoHUD.turno) {
            this.atualizarTurno(estadoHUD.turno);

            // Atualizar retrato do herói ativo
            const heroiAtivo = estadoHUD.herois?.find(h => h.id === estadoHUD.turno.heroiAtivoId);
            this.atualizarHeroiAtivo(heroiAtivo);
        }

        // Atualizar cartas
        if (estadoHUD.cartas) {
            this.renderizarCartas(estadoHUD.cartas);
        }

        // Modo seleção de alvo
        if (estadoHUD.modoSelecaoAlvo) {
            this.mostrarModoSelecao();
        } else {
            this.esconderModoSelecao();
        }

        // Atualizar inventário se fornecido
        if (estadoHUD.inventario) {
            this.combatInventory = estadoHUD.inventario;
            if (this.inventoryOpen) {
                this.renderizarItens();
            }
        }
    }

    /**
     * Renderiza os itens no painel de inventário
     */
    renderizarItens() {
        const panel = this.elements.itemPanel;
        if (!panel) return;

        panel.innerHTML = '';

        if (!this.combatInventory || this.combatInventory.length === 0) {
            panel.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #aaa; padding: 20px;">Mochila vazia</div>';
            return;
        }

        this.combatInventory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'combat-item';
            itemEl.dataset.itemId = item.id;
            itemEl.title = `${item.nome}\n${item.descricao}`;

            // Estilo do item (card mini)
            itemEl.style.cssText = `
                position: relative;
                background: #2c3e50;
                border: 1px solid #7f8c8d;
                border-radius: 6px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                transition: transform 0.2s;
            `;

            // Hover effect via JS já que é inline (ou adicionar classe CSS global seria melhor, mas seguindo inline)
            itemEl.onmouseenter = () => itemEl.style.transform = 'scale(1.05)';
            itemEl.onmouseleave = () => itemEl.style.transform = 'scale(1)';

            itemEl.innerHTML = `
                <div class="item-icon" style="font-size: 24px; margin-bottom: 5px;">${item.icon}</div>
                <div class="item-qtd" style="
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                ">${item.quantidade}</div>
                <div class="item-name" style="font-size: 10px; text-align: center; color: white;">${item.nome}</div>
            `;

            // Click listener
            itemEl.addEventListener('click', () => {
                this.emit('cartaSelecionada', { cardId: item.id, isItem: true, itemData: item });
                // Fechar inventário após selecionar? Talvez não, melhor deixar usuário fechar ou fechar ao usar
                if (window.innerWidth < 768) { // Apenas mobile fecha auto
                    this.toggleInventario(false);
                }
            });

            panel.appendChild(itemEl);
        });
    }

    /**
     * Mostra painel de inspeção de inimigo
     */
    mostrarInspecao(inimigo) {
        if (!this.elements.inspectionPanel) return;

        // Preencher dados
        this.elements.inspectionName.textContent = inimigo.nome;
        this.elements.inspectionHp.textContent = `${inimigo.pv}/${inimigo.pvMax}`;

        // Ícone baseado no tipo (simplificado)
        // Poderia ser mapeado melhor, mas por enquanto:
        this.elements.inspectionIcon.textContent = inimigo.isBoss ? '💀' : '👹';

        // Detalhes: Fraquezas e Resistências
        const details = this.elements.inspectionDetails;
        details.innerHTML = '';

        // Fraquezas
        if (inimigo.vulnerabilidades && inimigo.vulnerabilidades.length > 0) {
            inimigo.vulnerabilidades.forEach(tipo => {
                const badge = document.createElement('span');
                badge.className = 'inspection-badge weak';
                badge.textContent = `${this.getIconeTipo(tipo)} Fraco`;
                details.appendChild(badge);
            });
        }

        // Resistências
        if (inimigo.resistencias && inimigo.resistencias.length > 0) {
            inimigo.resistencias.forEach(tipo => {
                const badge = document.createElement('span');
                badge.className = 'inspection-badge resist';
                badge.textContent = `${this.getIconeTipo(tipo)} Resiste`;
                details.appendChild(badge);
            });
        }

        // Buffs/Debuffs
        if (inimigo.debuffs && inimigo.debuffs.length > 0) {
            inimigo.debuffs.forEach(debuff => {
                const badge = document.createElement('span');
                badge.className = 'inspection-badge debuff';
                badge.textContent = `${debuff.tipo}`;
                details.appendChild(badge);
            });
        }

        this.elements.inspectionPanel.classList.remove('hidden');
    }

    /**
     * Esconde painel de inspeção
     */
    esconderInspecao() {
        if (this.elements.inspectionPanel) {
            this.elements.inspectionPanel.classList.add('hidden');
        }
    }

    /**
     * Helper para ícones de tipo
     */
    getIconeTipo(tipo) {
        const icones = {
            'fogo': '🔥',
            'gelo': '❄️',
            'raio': '⚡',
            'veneno': '🧪',
            'fisico': '⚔️',
            'sagrado': '✨'
        };
        return icones[tipo] || '•';
    }
    /**
     * Define o modo AR (ativa/desativa carrossel)
     */
    setARMode(active) {
        this.isARMode = active;
        const container = document.getElementById('combat-screen'); // Ou onde a classe deve ser aplicada

        if (active) {
            container?.classList.add('ar-mode');
            // Recalcular carrossel
            setTimeout(() => this.updateCarousel(), 50);
        } else {
            container?.classList.remove('ar-mode');
            // Limpar transformações inline
            this.elements.cardsContainer.querySelectorAll('.card').forEach(card => {
                card.style.transform = '';
                card.style.opacity = '';
                card.style.zIndex = '';
                card.classList.remove('carousel-active');
            });
        }
    }

    /**
     * Configura listeners para swipe no carrossel
     */
    setupCarouselListeners() {
        const container = this.elements.cardsContainer;
        if (!container) return;

        // Touch Events
        container.addEventListener('touchstart', (e) => this.inputStart(e.touches[0].clientX));
        container.addEventListener('touchmove', (e) => this.inputMove(e.touches[0].clientX));
        container.addEventListener('touchend', () => this.inputEnd());

        // Mouse Events
        container.addEventListener('mousedown', (e) => this.inputStart(e.clientX));
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) this.inputMove(e.clientX);
        });
        window.addEventListener('mouseup', () => {
            if (this.isDragging) this.inputEnd();
        });
    }

    inputStart(x) {
        if (!this.isARMode) return;
        this.isDragging = true;
        this.dragStartX = x;
        this.cardDragOffset = 0; // Offset visual temporário
    }

    inputMove(x) {
        if (!this.isDragging || !this.isARMode) return;
        const deltaX = x - this.dragStartX;

        // Converter pixels para "fração de carta" (sensitivity)
        // Aproximadamente 100px = 1 carta
        this.cardDragOffset = -(deltaX / 100);

        this.updateCarousel(this.cardDragOffset);
    }

    inputEnd() {
        if (!this.isDragging || !this.isARMode) return;
        this.isDragging = false;

        // Aplicar o movimento ao índice
        if (Math.abs(this.cardDragOffset) > 0.2) {
            if (this.cardDragOffset > 0) {
                this.carouselIndex = Math.min(this.cardsCount - 1, this.carouselIndex + Math.ceil(this.cardDragOffset));
            } else {
                this.carouselIndex = Math.max(0, this.carouselIndex + Math.floor(this.cardDragOffset));
            }
        } else {
            // Reverter se movimento foi muito pequeno (snap back)
        }

        // Limite final
        this.carouselIndex = Math.max(0, Math.min(this.carouselIndex, this.cardsCount - 1));

        this.cardDragOffset = 0;
        this.updateCarousel();
    }

    snapToCard(index) {
        this.carouselIndex = index;
        this.updateCarousel();
    }

    /**
     * Atualiza as transformações 3D das cartas em arco
     * @param {number} offset - Offset temporário durante arraste
     */
    updateCarousel(offset = 0) {
        if (!this.isARMode) return;

        const cards = this.elements.cardsContainer.querySelectorAll('.card');
        const totalCards = cards.length;
        const centerIndex = this.carouselIndex + offset;

        // Configurações do Arco
        const radius = 400; // Raio do arco em px
        const angleStep = 15; // Graus de separação por carta

        cards.forEach((card, index) => {
            // Distância relativa ao centro (float durante drag)
            const dist = index - centerIndex;

            // Ângulo no arco
            const angle = dist * angleStep;

            // Coordenadas
            // x: horizontal no arco
            // z: profundidade (afasta conforme vai para borda)
            // y: leve curva vertical (opcional)

            // Simplificação matemática para arco frontal
            const theta = (angle * Math.PI) / 180;
            const x = radius * Math.sin(theta);
            const z = radius * Math.cos(theta) - radius; // Z=0 no centro

            // Escala e Opacidade baseada na distância
            const absDist = Math.abs(dist);
            let scale = 1.0;
            let opacity = 1.0;
            let rotateY = angle; // Rotaciona para olhar para o centro

            if (absDist < 0.5) {
                // Carta central (ou quase)
                scale = 1.2 - (absDist * 0.2);
                card.classList.add('carousel-active');
                card.style.zIndex = 100;
            } else {
                scale = 1.0 - (Math.min(absDist, 3) * 0.1); // Diminui nas pontas
                opacity = 1.0 - (Math.min(absDist, 3) * 0.2);
                card.classList.remove('carousel-active');
                card.style.zIndex = 100 - Math.round(absDist * 10);
            }

            // Aplicar CSS Transform
            // translate3d(x, y, z) rotateY(deg) scale(s)

            const transform = `
                translate3d(${x}px, 0, ${z}px)
                rotateY(${rotateY}deg)
                scale(${scale})
            `;

            card.style.transform = transform;
            card.style.opacity = Math.max(0, opacity);
        });
    }
}
