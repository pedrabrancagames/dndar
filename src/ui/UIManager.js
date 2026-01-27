/**
 * UI Manager
 * Gerencia elementos do DOM, transições de tela e eventos de interface
 */
export class UIManager {
    constructor() {
        this.elementos = {};
        this.telaAtual = 'loading';
        this.callbacks = {};
    }

    /**
     * Inicializa o gerenciador de UI
     */
    init() {
        this.cacheElementos();
        this.setupGeneralListeners();
    }

    /**
     * Cacheia referências aos elementos do DOM
     */
    cacheElementos() {
        this.elementos = {
            // Telas
            loadingScreen: document.getElementById('loading-screen'),
            homeScreen: document.getElementById('home-screen'),
            combatScreen: document.getElementById('combat-screen'),
            settingsScreen: document.getElementById('settings-screen'),
            missionScreen: document.getElementById('mission-screen'),
            mapScreen: document.getElementById('map-screen'),
            profileScreen: document.getElementById('profile-screen'),
            inventoryScreen: document.getElementById('inventory-screen'),
            gmScreen: document.getElementById('gm-screen'),

            // Loading
            loadingBar: document.getElementById('loading-bar'),
            loadingText: document.getElementById('loading-text'),

            // Modais
            settingsModal: document.getElementById('settings-modal'),
            combatPauseMenu: document.getElementById('combat-pause-menu'),

            // Botões do menu principal
            btnCombat: document.getElementById('btn-combat'),
            btnARCombat: document.getElementById('btn-ar-combat'), // AR
            btnGameMaster: document.getElementById('btn-game-master'),
            btnMap: document.getElementById('btn-map'),
            btnProfile: document.getElementById('btn-profile'),
            btnInventory: document.getElementById('btn-inventory'),
            btnSettings: document.getElementById('btn-settings'),

            // Botões de Voltar
            btnSettingsBack: document.getElementById('settings-back'),
            btnMissionBack: document.getElementById('mission-back'),
            btnMapBack: document.getElementById('map-back'),
            btnProfileBack: document.getElementById('profile-back'),
            btnInventoryBack: document.getElementById('inventory-back'),
            btnGmBack: document.getElementById('gm-back'),

            // Configurações (Modal Rápido)
            closeSettings: document.getElementById('close-settings'),
            settingVoice: document.getElementById('setting-voice'),
            settingSpeechRate: document.getElementById('setting-speech-rate'),
            settingVolume: document.getElementById('setting-volume'),
            speechRateValue: document.getElementById('speech-rate-value'),
            volumeValue: document.getElementById('volume-value'),

            // Combate UI
            btnCombatMenu: document.getElementById('btn-combat-menu'),
            btnResumeCombat: document.getElementById('btn-resume-combat'),
            btnExitCombat: document.getElementById('btn-exit-combat'),
            btnToggleLog: document.getElementById('btn-toggle-log'),
            combatLog: document.getElementById('combat-log')
        };
    }

    /**
     * Registra callbacks para eventos de UI
     */
    on(evento, callback) {
        if (!this.callbacks[evento]) {
            this.callbacks[evento] = [];
        }
        this.callbacks[evento].push(callback);
    }

    /**
     * Dispara callbacks
     */
    emit(evento, data) {
        if (this.callbacks[evento]) {
            this.callbacks[evento].forEach(cb => cb(data));
        }
    }

    /**
     * Configura listeners gerais de navegação e UI
     */
    setupGeneralListeners() {
        // Navegação Principal
        this.elementos.btnCombat?.addEventListener('click', () => {
            // Fluxo de missão padrão
            this.irParaTela('mission');
            this.emit('navegacao', { destino: 'mission' });
        });

        this.elementos.btnARCombat?.addEventListener('click', () => {
            // Iniciar AR diretamente (por enquanto) ou ir para seleção de missão AR
            this.emit('iniciarAR');
        });

        this.elementos.btnGameMaster?.addEventListener('click', () => {
            this.irParaTela('gm');
            this.emit('navegacao', { destino: 'gm' });
        });

        this.elementos.btnMap?.addEventListener('click', () => {
            this.irParaTela('map');
            this.emit('navegacao', { destino: 'map' });
        });

        this.elementos.btnProfile?.addEventListener('click', () => {
            this.irParaTela('profile');
            this.emit('navegacao', { destino: 'profile' });
        });

        this.elementos.btnInventory?.addEventListener('click', () => {
            this.irParaTela('inventory');
            this.emit('navegacao', { destino: 'inventory' });
        });

        this.elementos.btnSettings?.addEventListener('click', () => {
            // Ir para tela cheia de configurações
            this.irParaTela('settings');
            this.emit('navegacao', { destino: 'settings' });

            // OU abrir modal (legado, mantendo suporte se necessário)
            // this.abrirConfiguracoesModal();
        });

        // Botões de Voltar
        const backBtns = [
            this.elementos.btnSettingsBack,
            this.elementos.btnMissionBack,
            this.elementos.btnMapBack,
            this.elementos.btnProfileBack,
            this.elementos.btnInventoryBack,
            this.elementos.btnGmBack
        ];

        backBtns.forEach(btn => {
            btn?.addEventListener('click', () => {
                this.irParaTela('home');
                this.emit('navegacao', { destino: 'home' });
            });
        });


        // Configurações do Modal Rápido (GameMaster)
        this.elementos.settingVoice?.addEventListener('change', (e) => {
            this.emit('configuracaoAlterada', { tipo: 'voice', valor: e.target.checked });
        });

        this.elementos.settingSpeechRate?.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            if (this.elementos.speechRateValue) this.elementos.speechRateValue.textContent = `${rate}x`;
            this.emit('configuracaoAlterada', { tipo: 'speechRate', valor: rate });
        });

        this.elementos.settingVolume?.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            if (this.elementos.volumeValue) this.elementos.volumeValue.textContent = `${Math.round(volume * 100)}%`;
            this.emit('configuracaoAlterada', { tipo: 'volume', valor: volume });
        });

        // Menu de Pausa e Combate
        this.elementos.btnCombatMenu?.addEventListener('click', () => this.abrirMenuPausa());
        this.elementos.btnResumeCombat?.addEventListener('click', () => this.fecharMenuPausa());

        this.elementos.btnExitCombat?.addEventListener('click', () => {
            this.fecharMenuPausa();
            this.emit('sairCombate');
        });

        this.elementos.btnToggleLog?.addEventListener('click', () => {
            if (this.elementos.combatLog) {
                this.elementos.combatLog.classList.toggle('hidden');
            }
        });

        this.elementos.closeSettings?.addEventListener('click', () => this.fecharConfiguracoesModal());
    }

    /**
     * Atualiza a barra de loading
     */
    atualizarLoading(percent, texto) {
        if (this.elementos.loadingBar) {
            this.elementos.loadingBar.style.width = `${percent}%`;
        }
        if (this.elementos.loadingText) {
            this.elementos.loadingText.textContent = texto;
        }
    }

    /**
     * Muda para uma tela específica
     */
    irParaTela(tela) {
        // Esconder todas as telas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Mostrar tela desejada
        const telaElement = document.getElementById(`${tela}-screen`);
        if (telaElement) {
            telaElement.classList.add('active');
            this.telaAtual = tela;
        } else {
            console.warn(`[UIManager] Tela não encontrada: ${tela}`);
        }
    }

    /**
     * Abre o modal de configurações rápido
     */
    abrirConfiguracoesModal() {
        this.elementos.settingsModal?.classList.remove('hidden');
    }

    /**
     * Fecha o modal de configurações rápido
     */
    fecharConfiguracoesModal() {
        this.elementos.settingsModal?.classList.add('hidden');
    }

    /**
     * Abre menu de pausa
     */
    abrirMenuPausa() {
        this.elementos.combatPauseMenu?.classList.remove('hidden');
    }

    /**
     * Fecha menu de pausa
     */
    fecharMenuPausa() {
        this.elementos.combatPauseMenu?.classList.add('hidden');
    }
}
