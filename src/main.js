/**
 * Main Entry Point
 * Inicializa e conecta todos os sistemas do jogo
 */
import { CombatManager } from './game/CombatManager.js';
import { GameMaster } from './gm/GameMaster.js';
import { HUD } from './ui/HUD.js';
import { SceneManager } from './render/SceneManager.js';
import { ARSceneManager } from './render/ARSceneManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { SaveManager } from './game/SaveManager.js';
import { CampaignManager } from './game/CampaignManager.js';

class Game {
    constructor() {
        this.combatManager = new CombatManager();
        this.gameMaster = new GameMaster();
        this.hud = new HUD();
        this.audioManager = new AudioManager();
        this.saveManager = new SaveManager();
        this.campaignManager = new CampaignManager();
        this.sceneManager = null;
        this.arSceneManager = null;
        this.isARMode = false;

        this.telaAtual = 'loading';
        this.elementos = {};
        this.saveData = null;
        this.settings = null;
        this.missaoSelecionada = null;
    }

    /**
     * Inicializa o jogo
     */
    async init() {
        console.log('[Game] Iniciando...');

        this.cacheElementos();
        this.setupEventListeners();

        // Mostrar loading
        this.atualizarLoading(10, 'Carregando sistema de combate...');

        // Inicializar combat manager
        const combatOk = await this.combatManager.inicializar();
        if (!combatOk) {
            this.atualizarLoading(100, 'Erro ao carregar dados do jogo');
            return;
        }

        this.atualizarLoading(30, 'Carregando campanha...');

        // Carregar campanha
        await this.campaignManager.carregarCampanha();

        this.atualizarLoading(40, 'Carregando progresso...');

        // Carregar save e configurações
        this.saveData = this.saveManager.carregar();
        this.settings = this.saveManager.carregarConfiguracoes();

        this.atualizarLoading(50, 'Carregando Game Master...');

        // Carregar configurações salvas
        this.carregarConfiguracoes();

        this.atualizarLoading(60, 'Configurando interface...');

        // Inicializar HUD
        this.hud.init();
        this.setupHUDCallbacks();

        this.atualizarLoading(70, 'Preparando...');

        // Configurar callbacks do combat manager
        this.setupCombatCallbacks();

        // Configurar callbacks do game master
        this.setupGMCallbacks();

        // Configurar callbacks das novas telas
        this.setupSettingsCallbacks();
        this.setupMissionCallbacks();
        this.setupMapCallbacks();

        this.atualizarLoading(85, 'Carregando sons...');

        // Carregar sons
        await this.audioManager.carregarSons();

        // Aplicar configurações de áudio
        this.aplicarConfiguracoesAudio();

        this.atualizarLoading(100, 'Pronto!');

        // Ir para home após pequeno delay
        setTimeout(() => {
            this.irParaTela('home');
        }, 500);

        console.log('[Game] Inicialização completa');
    }

    /**
     * Cacheia referências aos elementos
     */
    cacheElementos() {
        this.elementos = {
            loadingScreen: document.getElementById('loading-screen'),
            homeScreen: document.getElementById('home-screen'),
            combatScreen: document.getElementById('combat-screen'),
            loadingBar: document.getElementById('loading-bar'),
            loadingText: document.getElementById('loading-text'),
            settingsModal: document.getElementById('settings-modal'),

            // Botões do menu
            btnCombat: document.getElementById('btn-combat'),
            btnGameMaster: document.getElementById('btn-game-master'),
            btnMap: document.getElementById('btn-map'),
            btnProfile: document.getElementById('btn-profile'),
            btnSettings: document.getElementById('btn-settings'),
            closeSettings: document.getElementById('close-settings'),

            // Configurações
            settingVoice: document.getElementById('setting-voice'),
            settingSpeechRate: document.getElementById('setting-speech-rate'),
            settingVolume: document.getElementById('setting-volume'),
            speechRateValue: document.getElementById('speech-rate-value'),
            volumeValue: document.getElementById('volume-value'),

            // AR
            btnARCombat: document.getElementById('btn-ar-combat')
        };
    }

    /**
     * Configura event listeners gerais
     */
    setupEventListeners() {
        // Menu principal - Combate será configurado em setupMissionCallbacks
        // NÃO adicionar listener para btnCombat aqui para evitar duplicação
        this.elementos.btnGameMaster?.addEventListener('click', () => this.mostrarBriefing());
        this.elementos.btnMap?.addEventListener('click', () => {
            this.irParaTela('map');
            this.renderizarMapa();
        });
        this.elementos.btnProfile?.addEventListener('click', () => this.mostrarMensagem('Perfil em desenvolvimento...'));
        this.elementos.btnSettings?.addEventListener('click', () => this.abrirConfiguracoes());
        this.elementos.closeSettings?.addEventListener('click', () => this.fecharConfiguracoes());

        // Botão AR
        this.elementos.btnARCombat?.addEventListener('click', () => this.iniciarCombateAR());

        // Configurações do modal rápido (GameMaster)
        this.elementos.settingVoice?.addEventListener('change', (e) => {
            this.gameMaster.setVoiceEnabled(e.target.checked);
            this.salvarConfiguracoesGameMaster();
        });

        this.elementos.settingSpeechRate?.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            this.gameMaster.setSpeechRate(rate);
            this.elementos.speechRateValue.textContent = `${rate}x`;
            this.salvarConfiguracoesGameMaster();
        });

        this.elementos.settingVolume?.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            this.gameMaster.setVolume(volume);
            this.elementos.volumeValue.textContent = `${Math.round(volume * 100)}%`;
            this.salvarConfiguracoesGameMaster();
        });
    }

    /**
     * Configura callbacks do HUD
     */
    setupHUDCallbacks() {
        this.hud.on('cartaSelecionada', ({ cardId }) => {
            const resultado = this.combatManager.selecionarCarta(cardId);

            if (resultado.modoSelecao) {
                this.audioManager.tocarAcao('card_select');
                this.hud.mostrarModoSelecao();

                // Destacar alvos válidos
                const carta = this.combatManager.cartaSelecionada;

                if (carta.alvo === 'inimigo') {
                    const alvos = resultado.alvos.map(a => a.instanceId);
                    this.sceneManager?.destacarAlvosInimigos(alvos);
                } else if (carta.alvo === 'heroi' || carta.alvo === 'heroi_incapacitado') {
                    const alvos = resultado.alvos.map(a => a.id);
                    this.hud.destacarAlvosHerois(alvos);
                }
            }
        });

        this.hud.on('cancelarSelecao', () => {
            this.combatManager.cancelarSelecao();
            this.sceneManager?.limparDestaques();
            this.hud.limparDestaqueHerois();
        });

        this.hud.on('finalizarTurno', () => {
            this.combatManager.finalizarTurno();
        });

        this.hud.on('continuarDialogo', () => {
            this.gameMaster.continuarDialogo();
        });

        this.hud.on('heroClicado', ({ index }) => {
            if (this.combatManager.modoSelecaoAlvo) {
                const herois = this.combatManager.herois;
                const heroi = herois[index];
                if (heroi) {
                    const resultado = this.combatManager.selecionarAlvo(heroi.id);
                    if (resultado.sucesso) {
                        this.hud.esconderModoSelecao();
                        this.hud.limparDestaqueHerois();
                    }
                }
            }
        });
    }

    /**
     * Configura callbacks do Combat Manager
     */
    setupCombatCallbacks() {
        this.combatManager.on('combateIniciado', async (data) => {
            this.hud.limparLog();
            this.hud.adicionarLog('Combate iniciado!', 'buff');
            this.hud.atualizar(data);

            // Iniciar música de combate
            this.audioManager.iniciarMusicaCombate();

            // Adicionar inimigos à cena
            await this.sceneManager?.adicionarInimigos(
                this.combatManager.inimigos.map(e => ({
                    ...e,
                    ...e.getDisplayData()
                }))
            );

            // Anunciar combate
            await this.gameMaster.anunciarCombate(this.combatManager.inimigos);
        });

        this.combatManager.on('turnoIniciado', (data) => {
            const estado = this.combatManager.getEstadoHUD();
            this.hud.atualizar(estado);

            const heroi = this.combatManager.herois.find(h => h.id === data.heroiId);
            if (heroi) {
                this.hud.adicionarLog(`Turno de ${heroi.nome}`);
                this.audioManager.tocarAcao('turn_start');
            }
        });

        this.combatManager.on('novoRound', (data) => {
            this.hud.adicionarLog(`--- Round ${data.round} ---`, 'buff');
        });

        this.combatManager.on('cartaUsada', async (data) => {
            this.hud.adicionarLog(`${data.usuario} usa ${data.carta} em ${data.alvo}`);

            // Determinar tipo de efeito visual baseado na carta
            const cartaNome = data.carta.toLowerCase();
            let tipoEfeito = 'dano';
            if (cartaNome.includes('fogo') || cartaNome.includes('fire') || cartaNome.includes('meteor')) {
                tipoEfeito = 'fogo';
            } else if (cartaNome.includes('gelo') || cartaNome.includes('congela') || cartaNome.includes('freeze')) {
                tipoEfeito = 'gelo';
            } else if (cartaNome.includes('raio') || cartaNome.includes('lightning') || cartaNome.includes('corrente')) {
                tipoEfeito = 'raio';
            }

            for (const resultado of data.resultados) {
                if (resultado.tipo === 'dano') {
                    const msg = resultado.critico
                        ? `CRÍTICO! ${resultado.valor} de dano!`
                        : `${resultado.valor} de dano`;
                    this.hud.adicionarLog(msg, 'damage');

                    // Efeito visual no inimigo com partículas
                    if (data.alvoData?.instanceId) {
                        this.sceneManager?.mostrarDanoInimigo(data.alvoData.instanceId, resultado.valor, tipoEfeito);
                        this.sceneManager?.atualizarBarraVida(data.alvoData.instanceId, data.alvoData.pvPercent);
                    }

                    // Som de dano
                    this.audioManager.tocarAcao(tipoEfeito, { critico: resultado.critico });
                    this.audioManager.tocarAcao('enemy_hurt');

                    if (resultado.derrotado) {
                        this.hud.adicionarLog(`${data.alvo} foi derrotado!`, 'buff');
                        this.audioManager.tocarAcao('enemy_death');
                        if (data.alvoData?.instanceId) {
                            this.sceneManager?.removerInimigo(data.alvoData.instanceId);
                        }
                    }
                }

                if (resultado.tipo === 'cura') {
                    this.hud.adicionarLog(`${resultado.alvo} curou ${resultado.valor} PV`, 'heal');
                    this.audioManager.tocarAcao('heal');
                }

                if (resultado.tipo === 'buff') {
                    this.hud.adicionarLog(`${resultado.alvo} recebeu ${resultado.buff}`, 'buff');
                    this.audioManager.tocarAcao('buff');
                }

                if (resultado.tipo === 'debuff') {
                    this.hud.adicionarLog(`${resultado.alvo} foi afetado por ${resultado.debuff}`, 'damage');
                    this.audioManager.tocarAcao('debuff');
                    // Efeito de debuff no inimigo
                    if (data.alvoData?.instanceId) {
                        this.sceneManager?.mostrarDebuff(data.alvoData.instanceId);
                    }
                }
            }

            // Atualizar HUD
            this.hud.atualizar(this.combatManager.getEstadoHUD());
            this.hud.esconderModoSelecao();
            this.sceneManager?.limparDestaques();

            // Narrar ações importantes
            for (const resultado of data.resultados) {
                await this.gameMaster.narrarAcao(resultado);
            }
        });

        this.combatManager.on('ataqueInimigo', (data) => {
            if (data.pulou) {
                this.hud.adicionarLog(`${data.inimigo} está ${data.motivo}`, 'buff');
                return;
            }

            if (data.evadido) {
                this.hud.adicionarLog(`${data.alvo} evadiu o ataque de ${data.atacante}!`, 'buff');
                return;
            }

            this.hud.adicionarLog(`${data.atacante} ataca ${data.alvo} (${data.ataque})`, 'damage');
            this.hud.adicionarLog(`${data.alvo} recebe ${data.dano} de dano`, 'damage');

            // Som de ataque e dano no herói
            this.audioManager.tocar('sword_hit');
            this.audioManager.tocarAcao('hero_hurt');

            // Encontrar índice do herói para animação
            const heroiIndex = this.combatManager.herois.findIndex(h => h.nome === data.alvo);
            if (heroiIndex >= 0) {
                this.hud.mostrarDanoHeroi(heroiIndex, data.dano);
            }

            if (data.alvoIncapacitado) {
                this.hud.adicionarLog(`${data.alvo} foi incapacitado!`, 'damage');
                this.audioManager.tocarAcao('hero_down');
            }
        });

        this.combatManager.on('faseInimigosTerminada', (data) => {
            this.hud.atualizar({
                herois: data.herois,
                turno: data.turno,
                cartas: this.combatManager.getCartasHeroiAtivo()
            });
        });

        this.combatManager.on('combateFinalizado', async (data) => {
            // Parar música de combate
            this.audioManager.pararMusica();

            if (data.resultado === 'vitoria') {
                this.hud.adicionarLog('=== VITÓRIA ===', 'buff');
                this.hud.adicionarLog(`XP ganho: ${data.recompensas?.xp || 0}`, 'buff');

                // Som de vitória
                this.audioManager.tocarAcao('victory');

                // Salvar progresso
                this.salvarProgressoVitoria(data.recompensas || { xp: 0, ouro: 0 });

                // Limpar todos os inimigos restantes imediatamente
                this.sceneManager?.limparInimigos();

                // Anunciar vitória (sem bloquear a transição)
                this.gameMaster.anunciarVitoria(true);
            } else {
                this.hud.adicionarLog('=== DERROTA ===', 'damage');

                // Som de derrota
                this.audioManager.tocarAcao('defeat');

                // Anunciar derrota (sem bloquear a transição)
                this.gameMaster.anunciarDerrota(true);
            }

            // Voltar para home após delay (garantido)
            setTimeout(() => {
                // Fechar qualquer diálogo aberto
                this.gameMaster.continuarDialogo();
                this.irParaTela('home');

                // Limpar estado do AR se estiver ativo
                if (this.isARMode && this.arSceneManager) {
                    this.arSceneManager.stopAR?.();
                    this.isARMode = false;
                }
            }, 3500);
        });

        this.combatManager.on('modoSelecaoAlvo', () => {
            this.hud.mostrarModoSelecao();
        });

        this.combatManager.on('selecaoCancelada', () => {
            this.hud.esconderModoSelecao();
            this.sceneManager?.limparDestaques();
            this.hud.limparDestaqueHerois();
        });
    }

    /**
     * Configura callbacks do Game Master
     */
    setupGMCallbacks() {
        this.gameMaster.on('dialogoIniciado', ({ texto }) => {
            this.hud.mostrarDialogoGM(texto);
        });

        this.gameMaster.on('dialogoFechado', () => {
            this.hud.esconderDialogoGM();
        });
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
        // Se estava na tela de combate e está saindo, fazer limpeza
        if (this.telaAtual === 'combat' && tela !== 'combat') {
            // Parar música de combate
            this.audioManager.pararMusica();

            // Limpar estado do AR se estiver ativo
            if (this.isARMode && this.arSceneManager) {
                this.arSceneManager.stopAR?.();
                this.isARMode = false;
            }

            // Parar narração do GM
            this.gameMaster.stop();
        }

        // Esconder todas as telas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Mostrar tela desejada
        const telaElement = document.getElementById(`${tela}-screen`);
        if (telaElement) {
            telaElement.classList.add('active');
            this.telaAtual = tela;
        }
    }

    /**
     * Inicia um combate de teste
     */
    async iniciarCombateTeste() {
        this.irParaTela('combat');

        // Inicializar cena 3D se ainda não foi
        if (!this.sceneManager) {
            this.sceneManager = new SceneManager('scene-container');
            await this.sceneManager.init();

            // Callback para click em inimigo
            this.sceneManager.on('inimigoClicado', ({ instanceId }) => {
                if (this.combatManager.modoSelecaoAlvo) {
                    const resultado = this.combatManager.selecionarAlvo(instanceId);
                    if (resultado.sucesso) {
                        this.hud.esconderModoSelecao();
                        this.sceneManager.limparDestaques();
                    }
                }
            });
        }

        // Configuração de combate teste - Missão 1 do Capítulo 1
        const configInimigos = [
            { id: 'goblin' },
            { id: 'goblin' },
            { id: 'rato_gigante' }
        ];

        // Iniciar combate
        this.combatManager.iniciarCombate(configInimigos);
    }

    /**
     * Mostra briefing do Game Master
     */
    async mostrarBriefing() {
        this.irParaTela('combat');

        // Inicializar cena se necessário
        if (!this.sceneManager) {
            this.sceneManager = new SceneManager('scene-container');
            await this.sceneManager.init();
        }

        await this.gameMaster.apresentarBriefing({ capitulo: 1, numero: 1 });

        // Após briefing, iniciar combate
        this.iniciarCombateTeste();
    }

    /**
     * Inicia combate em modo AR
     */
    async iniciarCombateAR() {
        // Inicializar AR Scene Manager se ainda não existe
        if (!this.arSceneManager) {
            this.arSceneManager = new ARSceneManager('scene-container');
            const arSupported = await this.arSceneManager.init();

            if (!arSupported) {
                this.mostrarARNaoSuportado();
                return;
            }

            // Callbacks do AR
            this.arSceneManager.on('inimigoClicado', ({ instanceId }) => {
                if (this.combatManager.modoSelecaoAlvo) {
                    const resultado = this.combatManager.selecionarAlvo(instanceId);
                    if (resultado.sucesso) {
                        this.hud.esconderModoSelecao();
                        this.arSceneManager.limparDestaques();
                    }
                }
            });

            this.arSceneManager.on('enemiesPlaced', () => {
                this.hud.adicionarLog('Inimigos posicionados em AR!', 'buff');
                this.audioManager.tocarAcao('ar_placement');
            });

            this.arSceneManager.on('arError', ({ message }) => {
                console.error('[Game] Erro AR:', message);
                this.mostrarMensagem(`Erro AR: ${message}`);
            });

            this.arSceneManager.on('arEnded', () => {
                console.log('[Game] Sessão AR encerrada');
                this.isARMode = false;
            });
        }

        // Ir para tela de combate
        this.irParaTela('combat');

        // Tentar iniciar AR
        const arStarted = await this.arSceneManager.startAR();

        if (!arStarted) {
            // Fallback para modo normal
            console.warn('[Game] AR não iniciou, usando modo normal');
            this.iniciarCombateTeste();
            return;
        }

        this.isARMode = true;
        this.sceneManager = this.arSceneManager; // Usar AR como scene manager

        // Grupos de inimigos variados para combate AR
        const gruposInimigos = [
            // Grupo 1: Goblins e Rato
            [{ id: 'goblin' }, { id: 'rato_gigante' }],
            // Grupo 2: Mortos-vivos
            [{ id: 'esqueleto' }, { id: 'zumbi' }],
            // Grupo 3: Orcs
            [{ id: 'orc' }, { id: 'kobold' }],
            // Grupo 4: Bestas
            [{ id: 'lobo' }, { id: 'rato_gigante' }, { id: 'rato_gigante' }],
            // Grupo 5: Monstros variados
            [{ id: 'goblin' }, { id: 'esqueleto' }, { id: 'kobold' }],
            // Grupo 6: Desafio maior
            [{ id: 'ghoul' }, { id: 'esqueleto' }],
            // Grupo 7: Troll sozinho (mini-boss)
            [{ id: 'troll' }],
            // Grupo 8: Ogro e Goblins
            [{ id: 'ogro' }, { id: 'goblin' }],
            // Grupo 9: Mímico e surpresas
            [{ id: 'mimic' }, { id: 'kobold' }],
            // Grupo 10: Contemplador (boss)
            [{ id: 'beholder' }]
        ];

        // Selecionar grupo aleatório
        const grupoIndex = Math.floor(Math.random() * gruposInimigos.length);
        const configInimigos = gruposInimigos[grupoIndex];

        // Iniciar combate (os inimigos serão posicionados quando o usuário tocar no reticle)
        this.combatManager.iniciarCombate(configInimigos);

        // Mostrar instruções AR
        this.hud.adicionarLog('Aponte para uma superfície plana', 'buff');
        this.hud.adicionarLog('Toque para posicionar inimigos', 'buff');
    }

    /**
     * Mostra mensagem de AR não suportado
     */
    mostrarARNaoSuportado() {
        const overlay = document.createElement('div');
        overlay.className = 'ar-not-supported';
        overlay.innerHTML = `
            <h2>📱 AR Não Disponível</h2>
            <p>Seu dispositivo ou navegador não suporta WebXR AR.</p>
            <p style="font-size: 0.8rem; margin-bottom: 16px;">
                Requisitos:<br>
                • Android com Chrome 79+<br>
                • ARCore instalado<br>
                • Acesso via HTTPS
            </p>
            <button id="ar-fallback-btn">Jogar Modo Normal</button>
        `;
        document.body.appendChild(overlay);

        document.getElementById('ar-fallback-btn').addEventListener('click', () => {
            overlay.remove();
            this.iniciarCombateTeste();
        });
    }

    /**
     * Mostra mensagem simples
     */
    mostrarMensagem(texto) {
        alert(texto); // Por enquanto, usar alert. Futuramente, modal customizado.
    }

    /**
     * Abre modal de configurações
     */
    abrirConfiguracoes() {
        this.elementos.settingsModal?.classList.remove('hidden');

        // Carregar valores atuais
        const config = this.gameMaster.getConfig();
        if (this.elementos.settingVoice) {
            this.elementos.settingVoice.checked = config.voiceEnabled;
        }
        if (this.elementos.settingSpeechRate) {
            this.elementos.settingSpeechRate.value = config.speechRate;
            this.elementos.speechRateValue.textContent = `${config.speechRate}x`;
        }
        if (this.elementos.settingVolume) {
            this.elementos.settingVolume.value = config.volume;
            this.elementos.volumeValue.textContent = `${Math.round(config.volume * 100)}%`;
        }
    }

    /**
     * Fecha modal de configurações
     */
    fecharConfiguracoes() {
        this.elementos.settingsModal?.classList.add('hidden');
    }

    /**
     * Salva configurações do GameMaster no localStorage
     */
    salvarConfiguracoesGameMaster() {
        const config = this.gameMaster.getConfig();
        localStorage.setItem('gameConfig', JSON.stringify(config));
    }

    /**
     * Carrega configurações do localStorage
     */
    carregarConfiguracoes() {
        const configStr = localStorage.getItem('gameConfig');
        if (configStr) {
            try {
                const config = JSON.parse(configStr);
                this.gameMaster.loadConfig(config);
            } catch (e) {
                console.warn('[Game] Erro ao carregar configurações:', e);
            }
        }
    }

    /**
     * Aplica configurações de áudio
     */
    aplicarConfiguracoesAudio() {
        if (!this.settings) return;

        this.audioManager.setVolumeMusica(this.settings.audio.musicaVolume);
        this.audioManager.setVolumeSFX(this.settings.audio.sfxVolume);
        this.audioManager.setMute(this.settings.audio.mudo);
    }

    /**
     * Configura callbacks da tela de configurações
     */
    setupSettingsCallbacks() {
        // Botão de configurações na home
        this.elementos.btnSettings?.addEventListener('click', () => {
            this.irParaTela('settings');
            this.carregarConfiguracoesNaTela();
        });

        // Botão voltar
        document.getElementById('settings-back')?.addEventListener('click', () => {
            this.irParaTela('home');
        });

        // Sliders de volume
        const musicVolume = document.getElementById('music-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        const voiceVolume = document.getElementById('voice-volume');
        const muteToggle = document.getElementById('mute-toggle');

        musicVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('music-volume-value').textContent = `${value}%`;
            this.audioManager.setVolumeMusica(value / 100);
        });

        sfxVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('sfx-volume-value').textContent = `${value}%`;
            this.audioManager.setVolumeSFX(value / 100);
        });

        voiceVolume?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('voice-volume-value').textContent = `${value}%`;
        });

        muteToggle?.addEventListener('change', (e) => {
            this.audioManager.setMute(e.target.checked);
        });

        // Botão salvar
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.salvarConfiguracoesAudio();
            this.irParaTela('home');
        });

        // Botão resetar
        document.getElementById('reset-save-btn')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja apagar todo o progresso?')) {
                this.saveManager.resetar();
                this.saveData = this.saveManager.getDefaultSave();
                alert('Progresso resetado!');
            }
        });
    }

    /**
     * Carrega configurações na tela
     */
    carregarConfiguracoesNaTela() {
        const musicVolume = document.getElementById('music-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        const voiceVolume = document.getElementById('voice-volume');
        const muteToggle = document.getElementById('mute-toggle');

        if (this.settings) {
            if (musicVolume) {
                musicVolume.value = this.settings.audio.musicaVolume * 100;
                document.getElementById('music-volume-value').textContent = `${Math.round(this.settings.audio.musicaVolume * 100)}%`;
            }
            if (sfxVolume) {
                sfxVolume.value = this.settings.audio.sfxVolume * 100;
                document.getElementById('sfx-volume-value').textContent = `${Math.round(this.settings.audio.sfxVolume * 100)}%`;
            }
            if (voiceVolume) {
                voiceVolume.value = this.settings.audio.vozVolume * 100;
                document.getElementById('voice-volume-value').textContent = `${Math.round(this.settings.audio.vozVolume * 100)}%`;
            }
            if (muteToggle) {
                muteToggle.checked = this.settings.audio.mudo;
            }
        }
    }

    /**
     * Salva configurações de áudio da tela de configurações
     */
    salvarConfiguracoesAudio() {
        // Validar que settings existe
        if (!this.settings) {
            this.settings = this.saveManager.getDefaultSettings();
        }
        if (!this.settings.audio) {
            this.settings.audio = { musicaVolume: 0.3, sfxVolume: 0.7, vozVolume: 0.8, mudo: false };
        }

        this.settings.audio.musicaVolume = parseInt(document.getElementById('music-volume')?.value || 30) / 100;
        this.settings.audio.sfxVolume = parseInt(document.getElementById('sfx-volume')?.value || 70) / 100;
        this.settings.audio.vozVolume = parseInt(document.getElementById('voice-volume')?.value || 80) / 100;
        this.settings.audio.mudo = document.getElementById('mute-toggle')?.checked || false;

        this.saveManager.salvarConfiguracoes(this.settings);

        // Também salvar configurações do GameMaster
        this.salvarConfiguracoesGameMaster();
    }

    /**
     * Configura callbacks da tela de missões
     */
    setupMissionCallbacks() {
        // Botão combate leva para seleção de missões
        // Este é o único listener para btnCombat (removido de setupEventListeners)
        this.elementos.btnCombat?.addEventListener('click', () => {
            this.irParaTela('mission');
            this.renderizarListaMissoes();
        });

        // Botão voltar das missões
        document.getElementById('mission-back')?.addEventListener('click', () => {
            this.irParaTela('home');
        });

        // Botão iniciar missão
        document.getElementById('start-mission-btn')?.addEventListener('click', () => {
            if (this.missaoSelecionada) {
                this.iniciarMissao(this.missaoSelecionada);
            }
        });
    }

    /**
     * Renderiza lista de missões
     */
    renderizarListaMissoes() {
        const missionList = document.getElementById('mission-list');
        if (!missionList) return;

        const missoes = this.campaignManager.getMissoesDisponiveis(this.saveData);
        const progresso = this.campaignManager.getProgressoCapitulo(this.saveData);

        // Atualizar barra de progresso
        const progressFill = document.getElementById('chapter-progress-fill');
        const progressText = document.getElementById('chapter-progress-text');
        if (progressFill) progressFill.style.width = `${progresso.percent}%`;
        if (progressText) progressText.textContent = `${progresso.completas}/${progresso.total} missões`;

        // Limpar lista
        missionList.innerHTML = '';

        // Renderizar missões
        missoes.forEach(missao => {
            const item = document.createElement('div');
            item.className = 'mission-item';

            if (missao.completa) item.classList.add('complete');
            if (!missao.disponivel) item.classList.add('locked');
            if (missao.boss) item.classList.add('boss');

            let statusIcon = '▶️';
            if (missao.completa) statusIcon = '✅';
            if (!missao.disponivel) statusIcon = '🔒';
            if (missao.boss) statusIcon = missao.completa ? '✅' : '👑';

            item.innerHTML = `
                <div class="mission-number">${missao.id}</div>
                <div class="mission-item-info">
                    <h4>${missao.nome}</h4>
                    <p>${missao.descricao}</p>
                </div>
                <span class="mission-status-icon">${statusIcon}</span>
            `;

            if (missao.disponivel) {
                item.addEventListener('click', () => {
                    this.selecionarMissao(missao);

                    // Atualizar seleção visual
                    missionList.querySelectorAll('.mission-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                });
            }

            missionList.appendChild(item);
        });
    }

    /**
     * Seleciona uma missão para ver detalhes
     */
    selecionarMissao(missao) {
        this.missaoSelecionada = missao;

        const title = document.getElementById('mission-title');
        const description = document.getElementById('mission-description');
        const difficulty = document.getElementById('mission-difficulty');
        const rewards = document.getElementById('mission-rewards');
        const startBtn = document.getElementById('start-mission-btn');

        if (title) title.textContent = missao.nome;
        if (description) description.textContent = missao.briefing || missao.descricao;

        const dificuldadeMap = {
            'facil': '⚔️ Fácil',
            'medio': '⚔️⚔️ Médio',
            'dificil': '⚔️⚔️⚔️ Difícil',
            'boss': '👑 Boss'
        };
        if (difficulty) difficulty.textContent = dificuldadeMap[missao.dificuldade] || missao.dificuldade;

        if (rewards) rewards.textContent = `🏆 ${missao.recompensas.xp} XP`;

        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = missao.completa ? 'Jogar Novamente' : 'Iniciar Missão';
        }
    }

    /**
     * Inicia uma missão
     */
    async iniciarMissao(missao) {
        this.campaignManager.setMissaoAtual(missao);

        // PRIMEIRO: Ir para tela de combate para garantir que o container esteja visível
        this.irParaTela('combat');

        // Aguardar um frame para garantir que as dimensões do container sejam calculadas
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Limpar managers antigos se existirem
        if (this.arSceneManager) {
            this.arSceneManager.dispose();
            this.arSceneManager = null;
        }
        if (this.sceneManager) {
            this.sceneManager.dispose();
            this.sceneManager = null;
        }

        // Tentar inicializar AR
        const arManager = new ARSceneManager('scene-container');
        const arSupported = await arManager.init();

        if (!arSupported) {
            // Limpar ARSceneManager antes de usar fallback
            arManager.dispose();

            // Usar modo normal (fallback)
            console.log('[Game] AR não suportado, usando modo 3D normal');
            await this.iniciarModoNormal(missao);
            return;
        }

        // Callbacks do AR
        arManager.on('inimigoClicado', ({ instanceId }) => {
            if (this.combatManager.modoSelecaoAlvo) {
                const resultado = this.combatManager.selecionarAlvo(instanceId);
                if (resultado.sucesso) {
                    this.hud.esconderModoSelecao();
                    arManager.limparDestaques();
                }
            }
        });

        arManager.on('enemiesPlaced', () => {
            this.hud.adicionarLog('Inimigos posicionados em AR!', 'buff');
            this.audioManager.tocarAcao('ar_placement');
        });

        arManager.on('arError', ({ message }) => {
            console.error('[Game] Erro AR:', message);
            this.mostrarMensagem(`Erro AR: ${message}`);
        });

        arManager.on('arEnded', () => {
            console.log('[Game] Sessão AR encerrada');
            this.isARMode = false;
        });

        // Tentar iniciar sessão AR
        const arStarted = await arManager.startAR();

        if (!arStarted) {
            // Limpar ARSceneManager antes de usar fallback
            console.warn('[Game] AR não iniciou, usando modo 3D normal');
            arManager.dispose();

            await this.iniciarModoNormal(missao);
            return;
        }

        // Sucesso - usar modo AR
        this.arSceneManager = arManager;
        this.sceneManager = arManager;
        this.isARMode = true;

        // Mostrar briefing
        await this.gameMaster.apresentarBriefing({
            titulo: missao.nome,
            texto: missao.briefing
        });

        // Iniciar combate com os inimigos da missão (forçar reset se houver combate anterior)
        const configInimigos = this.campaignManager.getInimigosParaCombate();
        this.combatManager.iniciarCombate(configInimigos, true);

        // Mostrar instruções AR
        this.hud.adicionarLog('Aponte para uma superfície plana', 'buff');
        this.hud.adicionarLog('Toque para posicionar inimigos', 'buff');
    }

    /**
     * Inicia o modo normal (3D sem AR)
     */
    async iniciarModoNormal(missao) {
        this.sceneManager = new SceneManager('scene-container');
        await this.sceneManager.init();

        this.sceneManager.on('inimigoClicado', ({ instanceId }) => {
            if (this.combatManager.modoSelecaoAlvo) {
                const resultado = this.combatManager.selecionarAlvo(instanceId);
                if (resultado.sucesso) {
                    this.hud.esconderModoSelecao();
                    this.sceneManager.limparDestaques();
                }
            }
        });

        this.isARMode = false;

        // Mostrar briefing e iniciar combate
        await this.gameMaster.apresentarBriefing({
            titulo: missao.nome,
            texto: missao.briefing
        });

        const configInimigos = this.campaignManager.getInimigosParaCombate();
        this.combatManager.iniciarCombate(configInimigos);
    }

    /**
     * Configura callbacks da tela de mapa
     */
    setupMapCallbacks() {
        // Botão voltar do mapa
        document.getElementById('map-back')?.addEventListener('click', () => {
            this.irParaTela('home');
        });

        // Toggle da legenda
        const legendToggle = document.getElementById('map-legend-toggle');
        const legend = document.getElementById('map-legend');
        legendToggle?.addEventListener('click', () => {
            legend?.classList.toggle('hidden');
        });

        // Botão explorar
        document.getElementById('explore-location-btn')?.addEventListener('click', () => {
            if (this.localSelecionadoMapa) {
                this.missaoSelecionada = this.localSelecionadoMapa;
                this.iniciarMissao(this.localSelecionadoMapa);
            }
        });

        // Inicializar propriedade
        this.localSelecionadoMapa = null;
    }

    /**
     * Renderiza o mapa interativo com as localizações das missões
     */
    renderizarMapa() {
        const mapLocations = document.getElementById('map-locations');
        const mapPaths = document.getElementById('map-paths');
        if (!mapLocations) return;

        // Obter missões e progresso
        const missoes = this.campaignManager.getMissoesDisponiveis(this.saveData);

        // Limpar elementos anteriores
        mapLocations.innerHTML = '';
        if (mapPaths) mapPaths.innerHTML = '';

        // Definir posições dos locais no mapa (em porcentagem)
        // Layout em forma de caminho serpenteante
        const posicoes = [
            { x: 20, y: 20, icon: '🏚️', nome: 'Ruínas' },      // Missão 1
            { x: 70, y: 25, icon: '🌲', nome: 'Floresta' },     // Missão 2
            { x: 30, y: 50, icon: '⚰️', nome: 'Cemitério' },    // Missão 3
            { x: 75, y: 60, icon: '🏛️', nome: 'Cripta' },       // Missão 4
            { x: 50, y: 85, icon: '🌙', nome: 'Ritual' }        // Missão 5 (Boss)
        ];

        // Desenhar caminhos entre locais
        this.desenharCaminhos(mapPaths, posicoes, missoes);

        // Criar marcadores de localização
        missoes.forEach((missao, index) => {
            if (index >= posicoes.length) return;

            const pos = posicoes[index];
            const marker = document.createElement('div');
            marker.className = 'location-marker';
            marker.dataset.missionId = missao.id;

            // Aplicar classes de estado
            if (missao.completa) {
                marker.classList.add('complete');
            } else if (missao.disponivel) {
                marker.classList.add('available');
            } else {
                marker.classList.add('locked');
            }

            if (missao.boss) {
                marker.classList.add('boss');
            }

            // Posicionar marcador
            marker.style.left = `${pos.x}%`;
            marker.style.top = `${pos.y}%`;

            // Ícone do status
            let statusIcon = '⚔️';
            if (missao.completa) statusIcon = '✅';
            else if (!missao.disponivel) statusIcon = '🔒';
            else if (missao.boss) statusIcon = '💀';

            marker.innerHTML = `
                <div class="marker-icon">${pos.icon}</div>
                <span class="marker-label">${pos.nome}</span>
                <span class="marker-status">${statusIcon}</span>
            `;

            // Evento de clique
            if (missao.disponivel) {
                marker.addEventListener('click', () => {
                    this.selecionarLocalNoMapa(missao, marker);
                });
            } else {
                marker.style.cursor = 'not-allowed';
            }

            mapLocations.appendChild(marker);
        });

        // Resetar painel de detalhes
        this.resetarPainelMapa();
    }

    /**
     * Desenha os caminhos conectando os locais no mapa
     */
    desenharCaminhos(svgElement, posicoes, missoes) {
        if (!svgElement || posicoes.length < 2) return;

        for (let i = 0; i < posicoes.length - 1; i++) {
            const de = posicoes[i];
            const para = posicoes[i + 1];

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            // Criar curva bezier suave entre pontos
            const ctrlX1 = de.x + (para.x - de.x) * 0.3;
            const ctrlY1 = de.y;
            const ctrlX2 = para.x - (para.x - de.x) * 0.3;
            const ctrlY2 = para.y;

            path.setAttribute('d', `M ${de.x} ${de.y} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${para.x} ${para.y}`);
            path.classList.add('map-path');

            // Adicionar classes baseadas no estado das missões
            const missaoDe = missoes[i];
            const missaoPara = missoes[i + 1];

            if (missaoDe?.completa) {
                path.classList.add('complete');
            }
            if (missaoPara?.disponivel && !missaoPara?.completa) {
                path.classList.add('active');
            }

            svgElement.appendChild(path);
        }
    }

    /**
     * Seleciona um local no mapa e mostra seus detalhes
     */
    selecionarLocalNoMapa(missao, markerElement) {
        this.localSelecionadoMapa = missao;

        // Atualizar seleção visual
        document.querySelectorAll('.location-marker').forEach(m => m.classList.remove('selected'));
        markerElement.classList.add('selected');

        // Atualizar painel de detalhes
        const title = document.getElementById('map-location-title');
        const description = document.getElementById('map-location-description');
        const difficulty = document.getElementById('map-location-difficulty');
        const rewards = document.getElementById('map-location-rewards');
        const info = document.getElementById('map-location-info');
        const exploreBtn = document.getElementById('explore-location-btn');

        if (title) title.textContent = missao.nome;
        if (description) description.textContent = missao.briefing || missao.descricao;

        // Traduzir dificuldade
        const dificuldades = {
            'facil': '⭐ Fácil',
            'medio': '⭐⭐ Médio',
            'dificil': '⭐⭐⭐ Difícil',
            'boss': '💀 Chefe'
        };

        if (difficulty) difficulty.textContent = dificuldades[missao.dificuldade] || missao.dificuldade;
        if (rewards) rewards.textContent = `🪙 ${missao.recompensas?.xp || 0} XP`;
        if (info) info.style.display = 'flex';

        if (exploreBtn) {
            exploreBtn.disabled = !missao.disponivel || missao.completa;
            exploreBtn.textContent = missao.completa ? 'Concluída' : 'Explorar';
        }
    }

    /**
     * Reseta o painel de detalhes do mapa para estado inicial
     */
    resetarPainelMapa() {
        this.localSelecionadoMapa = null;

        const title = document.getElementById('map-location-title');
        const description = document.getElementById('map-location-description');
        const info = document.getElementById('map-location-info');
        const exploreBtn = document.getElementById('explore-location-btn');

        if (title) title.textContent = 'Selecione uma Localização';
        if (description) description.textContent = 'Toque em um local no mapa para ver detalhes.';
        if (info) info.style.display = 'none';
        if (exploreBtn) exploreBtn.disabled = true;
    }

    /**
     * Salva progresso após vitória
     */
    salvarProgressoVitoria(recompensas) {
        // Adicionar XP a todos os heróis
        const xpPorHeroi = Math.floor(recompensas.xp / 4);
        ['guerreiro', 'mago', 'ladino', 'clerigo'].forEach(heroiId => {
            this.saveData = this.saveManager.adicionarXP(heroiId, xpPorHeroi, this.saveData);
        });

        // Marcar missão como completa
        if (this.missaoSelecionada) {
            this.saveData = this.saveManager.completarMissao(
                this.missaoSelecionada.capituloId,
                this.missaoSelecionada.id,
                this.saveData
            );
        }

        // Adicionar ouro
        this.saveData.inventario.ouro += recompensas.ouro || 0;

        // Registrar estatísticas
        this.saveData = this.saveManager.registrarCombate('vitoria', {
            inimigosDerotados: this.combatManager.inimigos?.length || 0
        }, this.saveData);

        // Restaurar heróis
        this.saveData = this.saveManager.restaurarHerois(this.saveData);

        // Salvar
        this.saveManager.salvar(this.saveData);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();

    // Expor para debug
    window.game = game;
});
