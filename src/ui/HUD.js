/**
 * HUD - Interface de Combate
 * Renderiza e atualiza todos os elementos do HUD de combate
 */
export class HUD {
    constructor() {
        this.elements = {};
        this.cacheElements();
        this.callbacks = {};
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

        cartas.forEach(carta => {
            const cardEl = this.criarElementoCarta(carta);
            this.elements.cardsContainer.appendChild(cardEl);
        });
    }

    /**
     * Cria elemento DOM de uma carta
     */
    criarElementoCarta(carta) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.cardId = carta.id;
        card.dataset.type = carta.tipo;

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
        card.addEventListener('click', () => {
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
}
