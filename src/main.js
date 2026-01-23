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

        // Inventário
        this.itemsData = null;
        this.itemSelecionado = null;
        this.heroiEquipSelecionado = 'guerreiro';
        this.filtroAtual = 'todos';
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
        this.setupProfileCallbacks();
        this.setupInventoryCallbacks();

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
        this.elementos.btnProfile?.addEventListener('click', () => {
            this.irParaTela('profile');
            this.renderizarPerfil();
        });
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

        // Menu de pausa do combate
        document.getElementById('btn-combat-menu')?.addEventListener('click', () => {
            this.abrirMenuPausa();
        });

        document.getElementById('btn-resume-combat')?.addEventListener('click', () => {
            this.fecharMenuPausa();
        });

        document.getElementById('btn-exit-combat')?.addEventListener('click', () => {
            this.confirmarSaidaCombate();
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
            console.log('[Game] Combate finalizado - resultado:', data.resultado);

            // Parar música de combate IMEDIATAMENTE
            console.log('[Game] Parando música de combate...');
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

            // Parar música novamente por segurança (após 1 segundo)
            setTimeout(() => {
                console.log('[Game] Segunda tentativa de parar música...');
                this.audioManager.pararMusica();
            }, 1000);

            // Voltar para home após delay (garantido)
            setTimeout(() => {
                console.log('[Game] Voltando para home...');

                // Parar música mais uma vez antes de mudar de tela
                this.audioManager.pararMusica();

                // Fechar qualquer diálogo aberto
                this.gameMaster.continuarDialogo();
                this.irParaTela('home');

                // Limpar estado do AR se estiver ativo
                if (this.isARMode && this.arSceneManager) {
                    console.log('[Game] Encerrando sessão AR...');
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
     * Abre o menu de pausa durante o combate
     */
    abrirMenuPausa() {
        const pauseMenu = document.getElementById('combat-pause-menu');
        if (pauseMenu) {
            pauseMenu.classList.remove('hidden');
        }
        // Pausar qualquer áudio de combate
        this.audioManager?.pausarMusica?.();
    }

    /**
     * Fecha o menu de pausa e retoma o combate
     */
    fecharMenuPausa() {
        const pauseMenu = document.getElementById('combat-pause-menu');
        if (pauseMenu) {
            pauseMenu.classList.add('hidden');
        }
        // Retomar áudio de combate
        this.audioManager?.retomarMusica?.();
    }

    /**
     * Confirma saída do combate e volta ao menu
     */
    confirmarSaidaCombate() {
        // Fechar menu de pausa
        this.fecharMenuPausa();

        // Parar música de combate
        this.audioManager.pararMusica();

        // Limpar estado do combate
        if (this.combatManager) {
            this.combatManager.finalizarCombateManual?.();
        }

        // Limpar cena 3D
        if (this.sceneManager) {
            this.sceneManager.limparInimigos?.();
        }

        // Parar narração do GM
        this.gameMaster.stop();

        // Limpar estado do AR se ativo
        if (this.isARMode && this.arSceneManager) {
            this.arSceneManager.stopAR?.();
            this.isARMode = false;
        }

        // Voltar para home
        this.irParaTela('home');

        console.log('[Game] Saiu do combate via menu');
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

        // Aplicar configurações ao AudioManager IMEDIATAMENTE
        this.aplicarConfiguracoesAudio();

        // Salvar no localStorage
        this.saveManager.salvarConfiguracoes(this.settings);

        // Também salvar configurações do GameMaster
        this.salvarConfiguracoesGameMaster();

        console.log('[Game] Configurações de áudio salvas e aplicadas:', this.settings.audio);
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
    async salvarProgressoVitoria(recompensas) {
        // Adicionar XP a todos os heróis e coletar level ups
        const xpPorHeroi = Math.floor(recompensas.xp / 4);
        const todosLevelUps = [];

        ['guerreiro', 'mago', 'ladino', 'clerigo'].forEach(heroiId => {
            const resultado = this.saveManager.adicionarXP(heroiId, xpPorHeroi, this.saveData);
            this.saveData = resultado.saveData;
            if (resultado.levelUps.length > 0) {
                todosLevelUps.push(...resultado.levelUps);
            }
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

        // Mostrar modais de level up sequencialmente
        if (todosLevelUps.length > 0) {
            await this.mostrarLevelUps(todosLevelUps);
        }
    }

    /**
     * Mostra modais de level up sequencialmente
     */
    async mostrarLevelUps(levelUps) {
        for (const levelUp of levelUps) {
            await this.mostrarModalLevelUp(levelUp);
        }
    }

    /**
     * Mostra modal de level up para um herói específico
     */
    mostrarModalLevelUp(levelUp) {
        return new Promise((resolve) => {
            const modal = document.getElementById('level-up-modal');
            if (!modal) {
                resolve();
                return;
            }

            // Dados dos heróis
            const heroiInfo = {
                guerreiro: { nome: 'Guerreiro', icon: '⚔️' },
                mago: { nome: 'Mago', icon: '🔮' },
                ladino: { nome: 'Ladino', icon: '🗡️' },
                clerigo: { nome: 'Clérigo', icon: '✝️' }
            };

            // Dados das cartas desbloqueáveis
            const cartasInfo = {
                // Guerreiro
                shield_bash: { nome: 'Bater com Escudo', icon: '🛡️', desc: 'Golpeia com o escudo, atordoando o inimigo' },
                whirlwind: { nome: 'Redemoinho', icon: '🌀', desc: 'Ataca todos os inimigos próximos' },
                second_wind: { nome: 'Segundo Fôlego', icon: '💨', desc: 'Recupera parte da vida em combate' },
                berserker_rage: { nome: 'Fúria Berserker', icon: '😤', desc: 'Aumenta massivamente o dano por 2 turnos' },
                // Mago
                ice_wall: { nome: 'Muralha de Gelo', icon: '🧊', desc: 'Cria barreira que absorve dano' },
                teleport: { nome: 'Teleporte', icon: '✨', desc: 'Evade o próximo ataque automaticamente' },
                arcane_explosion: { nome: 'Explosão Arcana', icon: '💥', desc: 'Dano massivo em área' },
                time_stop: { nome: 'Parar o Tempo', icon: '⏱️', desc: 'Pula o turno de todos os inimigos' },
                // Ladino
                smoke_bomb: { nome: 'Bomba de Fumaça', icon: '💨', desc: 'Todos os heróis ganham evasão' },
                shadow_step: { nome: 'Passo Sombrio', icon: '👤', desc: 'Aumenta chance de crítico drasticamente' },
                fan_of_knives: { nome: 'Leque de Facas', icon: '🔪', desc: 'Atinge todos os inimigos com veneno' },
                death_mark: { nome: 'Marca da Morte', icon: '💀', desc: 'Próximo ataque causa dano dobrado' },
                // Clérigo
                holy_smite: { nome: 'Golpe Sagrado', icon: '⚡', desc: 'Dano sagrado com bônus contra mortos-vivos' },
                mass_heal: { nome: 'Cura em Massa', icon: '💚', desc: 'Cura todos os heróis' },
                divine_intervention: { nome: 'Intervenção Divina', icon: '👼', desc: 'Protege um aliado de dano letal' },
                angel_summon: { nome: 'Invocar Anjo', icon: '😇', desc: 'Cura massiva e remove debuffs de todos' }
            };

            const heroi = heroiInfo[levelUp.heroiId] || { nome: 'Herói', icon: '🛡️' };
            const heroiSave = this.saveData.herois[levelUp.heroiId];

            // Atualizar elementos do modal
            document.getElementById('level-up-hero-icon').textContent = heroi.icon;
            document.getElementById('level-up-hero-name').textContent = heroi.nome;
            document.getElementById('level-up-old-level').textContent = `Nv ${levelUp.novoNivel - 1}`;
            document.getElementById('level-up-new-level').textContent = `Nv ${levelUp.novoNivel}`;

            // Stats ganhos
            const statsGrid = document.getElementById('level-up-stats-grid');
            const stats = levelUp.statsGanhos;
            let statsHtml = '';

            if (stats.pvMax > 0) {
                statsHtml += `<div class="stat-gained-item"><span class="stat-icon">❤️</span> Vida <span class="stat-gain">+${stats.pvMax}</span></div>`;
            }
            if (stats.paMax > 0) {
                statsHtml += `<div class="stat-gained-item"><span class="stat-icon">⚡</span> PA <span class="stat-gain">+${stats.paMax}</span></div>`;
            }
            if (stats.ataque > 0) {
                statsHtml += `<div class="stat-gained-item"><span class="stat-icon">⚔️</span> Ataque <span class="stat-gain">+${stats.ataque}</span></div>`;
            }
            if (stats.defesa > 0) {
                statsHtml += `<div class="stat-gained-item"><span class="stat-icon">🛡️</span> Defesa <span class="stat-gain">+${stats.defesa}</span></div>`;
            }

            statsGrid.innerHTML = statsHtml;

            // Nova carta (se houver)
            const cardSection = document.getElementById('level-up-card-section');
            if (levelUp.novaCarta && cartasInfo[levelUp.novaCarta]) {
                const carta = cartasInfo[levelUp.novaCarta];
                document.getElementById('new-card-icon').textContent = carta.icon;
                document.getElementById('new-card-name').textContent = carta.nome;
                document.getElementById('new-card-desc').textContent = carta.desc;
                cardSection.classList.remove('hidden');
            } else {
                cardSection.classList.add('hidden');
            }

            // Barra de XP
            const xpAtual = heroiSave.xp || 0;
            const xpParaProximo = levelUp.xpParaProximo;
            const xpPercent = (xpAtual / xpParaProximo) * 100;

            document.getElementById('level-up-xp-fill').style.width = `${xpPercent}%`;
            document.getElementById('level-up-xp-value').textContent = `${xpAtual} / ${xpParaProximo} XP`;

            // Tocar som de level up
            this.audioManager?.tocarAcao('buff');

            // Mostrar modal
            modal.classList.remove('hidden');

            // Handler para fechar
            const continueBtn = document.getElementById('level-up-continue');
            const closeHandler = () => {
                modal.classList.add('hidden');
                continueBtn.removeEventListener('click', closeHandler);
                resolve();
            };
            continueBtn.addEventListener('click', closeHandler);
        });
    }

    /**
     * Configura callbacks da tela de perfil
     */
    setupProfileCallbacks() {
        // Botão voltar
        document.getElementById('profile-back')?.addEventListener('click', () => {
            this.irParaTela('home');
        });
    }

    /**
     * Renderiza a tela de perfil com todos os dados do jogador
     */
    renderizarPerfil() {
        if (!this.saveData) {
            this.saveData = this.saveManager.carregar();
        }

        // Calcular nível geral do jogador (média dos heróis)
        const herois = this.saveData.herois;
        const nivelTotal = Object.values(herois).reduce((sum, h) => sum + (h.nivel || 1), 0);
        const nivelMedio = Math.floor(nivelTotal / 4);

        // Calcular XP médio (média do progresso de XP de cada herói)
        let xpProgressoTotal = 0;
        Object.values(herois).forEach(h => {
            const xpAtualHeroi = h.xp || 0;
            const xpParaProximoHeroi = this.saveManager.getXPParaProximoNivel(h.nivel || 1);
            xpProgressoTotal += (xpAtualHeroi / xpParaProximoHeroi);
        });
        const xpProgressoMedio = (xpProgressoTotal / 4) * 100; // Porcentagem média

        // XP para próximo nível do jogador é baseado no nível médio
        const xpParaProximo = this.saveManager.getXPParaProximoNivel(nivelMedio);
        const xpMedioAtual = Math.floor((xpProgressoMedio / 100) * xpParaProximo);

        // Atualizar card do jogador
        const playerLevel = document.getElementById('player-level');
        const playerXpFill = document.getElementById('player-xp-fill');
        const playerXpText = document.getElementById('player-xp-text');
        const playerTitle = document.getElementById('player-title');

        if (playerLevel) playerLevel.textContent = `Nv ${nivelMedio}`;
        if (playerXpFill) playerXpFill.style.width = `${xpProgressoMedio}%`;
        if (playerXpText) playerXpText.textContent = `${xpMedioAtual}/${xpParaProximo} XP`;

        // Definir título baseado no progresso
        const titulos = [
            { nivel: 1, titulo: 'Novato do Bairro Esquecido' },
            { nivel: 3, titulo: 'Explorador Iniciante' },
            { nivel: 5, titulo: 'Caçador de Monstros' },
            { nivel: 7, titulo: 'Guardião do Bairro' },
            { nivel: 10, titulo: 'Campeão do Bairro Esquecido' },
            { nivel: 15, titulo: 'Lenda Viva' }
        ];
        const tituloAtual = titulos.filter(t => nivelMedio >= t.nivel).pop() || titulos[0];
        if (playerTitle) playerTitle.textContent = tituloAtual.titulo;

        // Atualizar estatísticas
        const stats = this.saveData.estatisticas;
        const combatesTotal = stats.combatesVencidos + stats.combatesPerdidos;

        document.getElementById('stat-combats')?.textContent &&
            (document.getElementById('stat-combats').textContent = combatesTotal);
        document.getElementById('stat-victories')?.textContent &&
            (document.getElementById('stat-victories').textContent = stats.combatesVencidos);
        document.getElementById('stat-enemies')?.textContent &&
            (document.getElementById('stat-enemies').textContent = stats.inimigosDerotados);
        document.getElementById('stat-damage')?.textContent &&
            (document.getElementById('stat-damage').textContent = this.formatarNumero(stats.danoTotal));
        document.getElementById('stat-healing')?.textContent &&
            (document.getElementById('stat-healing').textContent = this.formatarNumero(stats.curaTotal));
        document.getElementById('stat-time')?.textContent &&
            (document.getElementById('stat-time').textContent = this.saveManager.formatarTempo(stats.tempoJogado));

        // Atualizar progresso da campanha
        const campanha = this.saveData.campanha;
        const missoesCompletas = campanha.missoesCompletas?.length || 0;

        document.getElementById('campaign-chapter')?.textContent &&
            (document.getElementById('campaign-chapter').textContent = `Capítulo ${campanha.capituloAtual}`);
        document.getElementById('campaign-mission')?.textContent &&
            (document.getElementById('campaign-mission').textContent = `Missão ${campanha.missaoAtual}`);
        document.getElementById('campaign-fill')?.style &&
            (document.getElementById('campaign-fill').style.width = `${(missoesCompletas / 5) * 100}%`);
        document.getElementById('campaign-text')?.textContent &&
            (document.getElementById('campaign-text').textContent = `${missoesCompletas}/5 missões completas`);

        // Renderizar heróis
        this.renderizarHeroisPerfil();

        // Renderizar conquistas
        this.renderizarConquistas();
    }

    /**
     * Formata números grandes para exibição
     */
    formatarNumero(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    /**
     * Renderiza os cards de heróis na tela de perfil
     */
    renderizarHeroisPerfil() {
        const container = document.getElementById('heroes-grid');
        if (!container) return;

        // Dados dos heróis
        const heroiData = [
            { id: 'guerreiro', nome: 'Guerreiro', icon: '⚔️', classe: 'guerreiro' },
            { id: 'mago', nome: 'Mago', icon: '🔮', classe: 'mago' },
            { id: 'ladino', nome: 'Ladino', icon: '🗡️', classe: 'ladino' },
            { id: 'clerigo', nome: 'Clérigo', icon: '✝️', classe: 'clerigo' }
        ];

        container.innerHTML = heroiData.map(heroi => {
            const save = this.saveData.herois[heroi.id] || { nivel: 1, pv: 20, pvMax: 20, xp: 0 };
            const pvPercent = (save.pv / save.pvMax) * 100;

            // Usar a mesma fórmula de XP do SaveManager
            const xpParaProximo = this.saveManager.getXPParaProximoNivel(save.nivel);
            const xpAtual = save.xp || 0;
            const xpPercent = (xpAtual / xpParaProximo) * 100;

            return `
                <div class="hero-card" data-class="${heroi.classe}">
                    <span class="hero-card-icon">${heroi.icon}</span>
                    <span class="hero-card-name">${heroi.nome}</span>
                    <span class="hero-card-class">${heroi.classe}</span>
                    <span class="hero-card-level">Nível ${save.nivel}</span>
                    <div class="hero-card-stats">
                        <div class="hero-stat-row">
                            <span class="hero-stat-icon">❤️</span>
                            <div class="stat-bar hp-bar">
                                <div class="stat-fill" style="width: ${pvPercent}%"></div>
                            </div>
                            <span>${save.pv}/${save.pvMax}</span>
                        </div>
                        <div class="hero-stat-row">
                            <span class="hero-stat-icon">⭐</span>
                            <div class="stat-bar pa-bar">
                                <div class="stat-fill" style="width: ${xpPercent}%"></div>
                            </div>
                            <span>${xpAtual}/${xpParaProximo} XP</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Renderiza as conquistas na tela de perfil
     */
    renderizarConquistas() {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        // Definir conquistas
        const conquistas = [
            { id: 'first_blood', icon: '🗡️', nome: 'Primeiro Sangue', desc: 'Vença seu primeiro combate', condicao: () => this.saveData.estatisticas.combatesVencidos >= 1 },
            { id: 'monster_hunter', icon: '💀', nome: 'Caçador', desc: 'Derrote 10 inimigos', condicao: () => this.saveData.estatisticas.inimigosDerotados >= 10 },
            { id: 'demon_slayer', icon: '👹', nome: 'Matador de Demônios', desc: 'Derrote 50 inimigos', condicao: () => this.saveData.estatisticas.inimigosDerotados >= 50 },
            { id: 'legendary', icon: '🐉', nome: 'Lendário', desc: 'Derrote 100 inimigos', condicao: () => this.saveData.estatisticas.inimigosDerotados >= 100 },
            { id: 'healer', icon: '💚', nome: 'Curandeiro', desc: 'Cure 100 de vida', condicao: () => this.saveData.estatisticas.curaTotal >= 100 },
            { id: 'destroyer', icon: '💥', nome: 'Destruidor', desc: 'Cause 500 de dano', condicao: () => this.saveData.estatisticas.danoTotal >= 500 },
            { id: 'unstoppable', icon: '🔥', nome: 'Imparável', desc: 'Vença 10 combates', condicao: () => this.saveData.estatisticas.combatesVencidos >= 10 },
            { id: 'champion', icon: '🏆', nome: 'Campeão', desc: 'Complete o Capítulo 1', condicao: () => (this.saveData.campanha.missoesCompletas?.length || 0) >= 5 }
        ];

        container.innerHTML = conquistas.map(conquista => {
            const desbloqueada = conquista.condicao();
            return `
                <div class="achievement-badge ${desbloqueada ? 'unlocked' : 'locked'}" data-tooltip="${conquista.desc}">
                    <span class="achievement-icon">${conquista.icon}</span>
                    <span class="achievement-name">${conquista.nome}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Configura callbacks do inventário
     */
    setupInventoryCallbacks() {
        // Botão de inventário no menu
        document.getElementById('btn-inventory')?.addEventListener('click', () => {
            this.irParaTela('inventory');
            this.carregarInventario();
        });

        // Botão voltar
        document.getElementById('inventory-back')?.addEventListener('click', () => {
            this.irParaTela('home');
            this.atualizarOuroHome();
        });

        // Tabs do inventário
        document.querySelectorAll('.inv-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.trocarTabInventario(tabId);
            });
        });

        // Fechar painel de detalhes
        document.getElementById('close-item-details')?.addEventListener('click', () => {
            document.getElementById('item-details-panel')?.classList.add('hidden');
            this.itemSelecionado = null;
        });

        // Botão usar item
        document.getElementById('use-item-btn')?.addEventListener('click', () => {
            if (this.itemSelecionado) {
                this.usarItem(this.itemSelecionado);
            }
        });

        // Botão vender item
        document.getElementById('sell-item-btn')?.addEventListener('click', () => {
            if (this.itemSelecionado) {
                this.venderItem(this.itemSelecionado);
            }
        });

        // Botão comprar item
        document.getElementById('buy-item-btn')?.addEventListener('click', () => {
            if (this.itemSelecionado) {
                this.comprarItem(this.itemSelecionado);
            }
        });

        // Seleção de herói para equipar
        document.querySelectorAll('.hero-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.hero-select-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.heroiEquipSelecionado = e.target.dataset.hero;
                this.renderizarEquipamentos();
            });
        });
    }

    /**
     * Carrega os dados de itens e renderiza o inventário
     */
    async carregarInventario() {
        // Carregar dados de itens se ainda não carregou
        if (!this.itemsData) {
            try {
                const response = await fetch('/data/items.json');
                this.itemsData = await response.json();
            } catch (error) {
                console.error('[Game] Erro ao carregar itens:', error);
                this.itemsData = { items: [] };
            }
        }

        // Atualizar ouro
        this.atualizarDisplayOuro();

        // Renderizar aba ativa
        this.renderizarInventario();
        this.renderizarLoja();
        this.renderizarEquipamentos();

        // Setup filtros
        this.setupFiltros();
    }

    /**
     * Atualiza displays de ouro
     */
    atualizarDisplayOuro() {
        const ouro = this.saveData?.inventario?.ouro || 0;
        document.getElementById('inventory-gold')?.textContent &&
            (document.getElementById('inventory-gold').textContent = ouro);
        document.getElementById('home-gold-display')?.textContent &&
            (document.getElementById('home-gold-display').textContent = `${ouro} 🪙`);
    }

    /**
     * Atualiza ouro na home
     */
    atualizarOuroHome() {
        const ouro = this.saveData?.inventario?.ouro || 0;
        const display = document.getElementById('home-gold-display');
        if (display) display.textContent = `${ouro} 🪙`;
    }

    /**
     * Troca entre as tabs do inventário
     */
    trocarTabInventario(tabId) {
        // Atualizar tabs
        document.querySelectorAll('.inv-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Mostrar/esconder conteúdo
        document.getElementById('inventory-items-tab')?.classList.toggle('hidden', tabId !== 'items');
        document.getElementById('inventory-equip-tab')?.classList.toggle('hidden', tabId !== 'equip');
        document.getElementById('inventory-shop-tab')?.classList.toggle('hidden', tabId !== 'shop');

        // Resetar seleção
        this.itemSelecionado = null;
        document.getElementById('item-details-panel')?.classList.add('hidden');
        document.getElementById('shop-preview')?.classList.add('hidden');
    }

    /**
     * Configura filtros de itens
     */
    setupFiltros() {
        document.querySelectorAll('.item-filters').forEach(filterGroup => {
            filterGroup.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filtroAtual = e.target.dataset.filter;

                    // Verificar qual grid precisa atualizar
                    if (filterGroup.closest('#inventory-items-tab')) {
                        this.renderizarInventario();
                    } else if (filterGroup.closest('#inventory-shop-tab')) {
                        this.renderizarLoja();
                    }
                });
            });
        });
    }

    /**
     * Renderiza os itens do inventário
     */
    renderizarInventario() {
        const container = document.getElementById('inventory-grid');
        if (!container) return;

        const itens = this.saveData?.inventario?.itens || [];
        const filtro = this.filtroAtual;

        // Mapear itens com dados completos
        const itensComDados = itens.map(item => {
            const dadosItem = this.itemsData?.items?.find(i => i.id === item.id);
            return { ...dadosItem, quantidade: item.quantidade };
        }).filter(item => item && item.id);

        // Aplicar filtro
        const itensFiltrados = filtro === 'todos'
            ? itensComDados
            : itensComDados.filter(item => item.tipo === filtro);

        if (itensFiltrados.length === 0) {
            container.innerHTML = `
                <div class="empty-inventory" style="grid-column: 1/-1;">
                    <span class="empty-inventory-icon">📦</span>
                    <span class="empty-inventory-text">Nenhum item encontrado</span>
                </div>
            `;
            return;
        }

        container.innerHTML = itensFiltrados.map(item => {
            const equipado = this.verificarItemEquipado(item.id);
            return `
                <div class="item-slot" data-id="${item.id}" data-rarity="${item.raridade}">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-name">${item.nome}</span>
                    ${item.quantidade > 1 ? `<span class="item-quantity">x${item.quantidade}</span>` : ''}
                    ${equipado ? `<span class="item-equipped-badge">✓</span>` : ''}
                </div>
            `;
        }).join('');

        // Adicionar event listeners
        container.querySelectorAll('.item-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const itemId = slot.dataset.id;
                this.selecionarItem(itemId, 'inventario');
            });
        });
    }

    /**
     * Verifica se um item está equipado em algum herói
     */
    verificarItemEquipado(itemId) {
        if (!this.saveData?.equipamentos) return false;

        for (const heroi of Object.values(this.saveData.equipamentos)) {
            if (Object.values(heroi).includes(itemId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Seleciona um item e mostra detalhes
     */
    selecionarItem(itemId, contexto = 'inventario') {
        const item = this.itemsData?.items?.find(i => i.id === itemId);
        if (!item) return;

        this.itemSelecionado = item;

        if (contexto === 'inventario') {
            // Mostrar painel de detalhes do inventário
            const panel = document.getElementById('item-details-panel');
            if (panel) {
                panel.classList.remove('hidden');
                document.getElementById('item-detail-icon').textContent = item.icon;
                document.getElementById('item-detail-name').textContent = item.nome;

                const rarityEl = document.getElementById('item-detail-rarity');
                rarityEl.textContent = item.raridade;
                rarityEl.className = `item-detail-rarity ${item.raridade}`;

                document.getElementById('item-detail-desc').textContent = item.descricao;

                // Stats
                const statsContainer = document.getElementById('item-detail-stats');
                statsContainer.innerHTML = this.renderizarStats(item.stats);

                // Configurar botões
                const useBtn = document.getElementById('use-item-btn');
                if (item.tipo === 'consumivel') {
                    useBtn.textContent = 'Usar';
                    useBtn.style.display = 'block';
                } else if (['arma', 'armadura', 'acessorio'].includes(item.tipo)) {
                    useBtn.textContent = 'Equipar';
                    useBtn.style.display = 'block';
                } else {
                    useBtn.style.display = 'none';
                }
            }

            // Destacar item selecionado
            document.querySelectorAll('#inventory-grid .item-slot').forEach(slot => {
                slot.classList.toggle('selected', slot.dataset.id === itemId);
            });
        } else if (contexto === 'loja') {
            // Mostrar preview da loja
            const preview = document.getElementById('shop-preview');
            if (preview) {
                preview.classList.remove('hidden');
                document.getElementById('shop-preview-icon').textContent = item.icon;
                document.getElementById('shop-preview-name').textContent = item.nome;

                const rarityEl = document.getElementById('shop-preview-rarity');
                rarityEl.textContent = item.raridade;
                rarityEl.className = `shop-preview-rarity ${item.raridade}`;

                document.getElementById('shop-preview-desc').textContent = item.descricao;
                document.getElementById('shop-preview-stats').innerHTML = this.renderizarStats(item.stats);
                document.getElementById('shop-preview-price').textContent = item.preco;

                // Verificar se pode comprar
                const buyBtn = document.getElementById('buy-item-btn');
                const ouro = this.saveData?.inventario?.ouro || 0;
                buyBtn.disabled = ouro < item.preco;
            }

            // Destacar item selecionado
            document.querySelectorAll('#shop-grid .item-slot').forEach(slot => {
                slot.classList.toggle('selected', slot.dataset.id === itemId);
            });
        }
    }

    /**
     * Renderiza stats de um item
     */
    renderizarStats(stats) {
        if (!stats) return '<span class="stat-tag">Sem bônus</span>';

        const statNames = {
            ataque: '⚔️ Ataque',
            defesa: '🛡️ Defesa',
            magia: '🔮 Magia',
            cura: '💚 Cura',
            pvMax: '❤️ Vida',
            paMax: '⚡ PA',
            critico: '💥 Crítico',
            evasao: '💨 Evasão'
        };

        return Object.entries(stats).map(([key, value]) => {
            const nome = statNames[key] || key;
            return `<span class="stat-tag positive">+${value} ${nome}</span>`;
        }).join('');
    }

    /**
     * Usa um item consumível ou equipa um equipamento
     */
    usarItem(item) {
        if (item.tipo === 'consumivel') {
            // Aplicar efeito do consumível
            if (item.efeito?.tipo === 'cura') {
                // Curar todos os heróis proporcionalmente
                Object.keys(this.saveData.herois).forEach(heroiId => {
                    const heroi = this.saveData.herois[heroiId];
                    heroi.pv = Math.min(heroi.pvMax, heroi.pv + Math.floor(item.efeito.valor / 4));
                });
                this.mostrarMensagem(`Usou ${item.nome}! Heróis curados.`);
            }

            // Remover item do inventário
            const itemIndex = this.saveData.inventario.itens.findIndex(i => i.id === item.id);
            if (itemIndex !== -1) {
                this.saveData.inventario.itens[itemIndex].quantidade--;
                if (this.saveData.inventario.itens[itemIndex].quantidade <= 0) {
                    this.saveData.inventario.itens.splice(itemIndex, 1);
                }
            }

            // Salvar e atualizar
            this.saveManager.salvar(this.saveData);
            this.renderizarInventario();
            document.getElementById('item-details-panel')?.classList.add('hidden');
        } else if (['arma', 'armadura', 'acessorio'].includes(item.tipo)) {
            // Equipar item
            this.equiparItem(item);
        }
    }

    /**
     * Equipa um item em um herói
     */
    equiparItem(item) {
        const heroiId = this.heroiEquipSelecionado;

        // Verificar se o herói pode usar o item
        if (item.classes && !item.classes.includes(heroiId)) {
            this.mostrarMensagem(`${this.capitalize(heroiId)} não pode usar este item!`);
            return;
        }

        // Desequipar item anterior se houver
        const slotTipo = item.tipo;
        const itemAnterior = this.saveData.equipamentos[heroiId][slotTipo];

        // Equipar novo item
        this.saveData.equipamentos[heroiId][slotTipo] = item.id;

        // Salvar e atualizar
        this.saveManager.salvar(this.saveData);
        this.renderizarInventario();
        this.renderizarEquipamentos();

        this.mostrarMensagem(`${item.nome} equipado em ${this.capitalize(heroiId)}!`);
        document.getElementById('item-details-panel')?.classList.add('hidden');
    }

    /**
     * Vende um item
     */
    venderItem(item) {
        const precoVenda = Math.floor(item.preco * 0.5);

        // Verificar se item está equipado
        if (this.verificarItemEquipado(item.id)) {
            this.mostrarMensagem('Desequipe o item antes de vender!');
            return;
        }

        // Remover item do inventário
        const itemIndex = this.saveData.inventario.itens.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
            this.saveData.inventario.itens[itemIndex].quantidade--;
            if (this.saveData.inventario.itens[itemIndex].quantidade <= 0) {
                this.saveData.inventario.itens.splice(itemIndex, 1);
            }
        }

        // Adicionar ouro
        this.saveData.inventario.ouro += precoVenda;

        // Salvar e atualizar
        this.saveManager.salvar(this.saveData);
        this.atualizarDisplayOuro();
        this.renderizarInventario();
        document.getElementById('item-details-panel')?.classList.add('hidden');

        this.mostrarMensagem(`Vendeu ${item.nome} por ${precoVenda} 🪙`);
    }

    /**
     * Compra um item da loja
     */
    comprarItem(item) {
        const ouro = this.saveData?.inventario?.ouro || 0;

        if (ouro < item.preco) {
            this.mostrarMensagem('Ouro insuficiente!');
            return;
        }

        // Remover ouro
        this.saveData.inventario.ouro -= item.preco;

        // Adicionar item ao inventário
        const itemExistente = this.saveData.inventario.itens.find(i => i.id === item.id);
        if (itemExistente) {
            itemExistente.quantidade++;
        } else {
            this.saveData.inventario.itens.push({ id: item.id, quantidade: 1 });
        }

        // Salvar e atualizar
        this.saveManager.salvar(this.saveData);
        this.atualizarDisplayOuro();
        this.renderizarInventario();

        // Atualizar botão de compra
        const buyBtn = document.getElementById('buy-item-btn');
        if (buyBtn) {
            buyBtn.disabled = this.saveData.inventario.ouro < item.preco;
        }

        this.mostrarMensagem(`Comprou ${item.nome}!`);
    }

    /**
     * Renderiza a loja
     */
    renderizarLoja() {
        const container = document.getElementById('shop-grid');
        if (!container || !this.itemsData) return;

        const itens = this.itemsData.items || [];
        const filtro = this.filtroAtual;

        // Aplicar filtro
        const itensFiltrados = filtro === 'todos'
            ? itens
            : itens.filter(item => item.tipo === filtro);

        container.innerHTML = itensFiltrados.map(item => `
            <div class="item-slot" data-id="${item.id}" data-rarity="${item.raridade}">
                <span class="item-icon">${item.icon}</span>
                <span class="item-name">${item.nome}</span>
                <span class="item-quantity">🪙${item.preco}</span>
            </div>
        `).join('');

        // Adicionar event listeners
        container.querySelectorAll('.item-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const itemId = slot.dataset.id;
                this.selecionarItem(itemId, 'loja');
            });
        });
    }

    /**
     * Renderiza a aba de equipamentos
     */
    renderizarEquipamentos() {
        const heroiId = this.heroiEquipSelecionado;
        const equipamentos = this.saveData?.equipamentos?.[heroiId] || {};
        const heroiStats = this.saveData?.herois?.[heroiId] || {};

        // Atualizar slots de equipamento
        ['arma', 'armadura', 'acessorio'].forEach(slot => {
            const slotElement = document.getElementById(`slot-${slot}`);
            if (!slotElement) return;

            const itemId = equipamentos[slot];
            const item = itemId ? this.itemsData?.items?.find(i => i.id === itemId) : null;

            if (item) {
                slotElement.classList.remove('empty');
                slotElement.classList.add('equipped');
                slotElement.innerHTML = `
                    <span class="slot-icon">${item.icon}</span>
                    <span class="slot-text">${item.nome}</span>
                `;
                // Adicionar click para desequipar
                slotElement.onclick = () => this.desequiparItem(heroiId, slot);
            } else {
                slotElement.classList.add('empty');
                slotElement.classList.remove('equipped');
                const defaultIcons = { arma: '🗡️', armadura: '🛡️', acessorio: '💍' };
                slotElement.innerHTML = `
                    <span class="slot-icon">${defaultIcons[slot]}</span>
                    <span class="slot-text">Vazio</span>
                `;
                slotElement.onclick = null;
            }
        });

        // Calcular e exibir stats do herói
        this.atualizarStatsHeroi(heroiId);

        // Renderizar itens equipáveis
        this.renderizarItensEquipaveis(heroiId);
    }

    /**
     * Desequipa um item de um herói
     */
    desequiparItem(heroiId, slot) {
        if (this.saveData.equipamentos[heroiId][slot]) {
            this.saveData.equipamentos[heroiId][slot] = null;
            this.saveManager.salvar(this.saveData);
            this.renderizarEquipamentos();
            this.renderizarInventario();
            this.mostrarMensagem('Item desequipado!');
        }
    }

    /**
     * Atualiza as stats exibidas do herói
     */
    atualizarStatsHeroi(heroiId) {
        const heroi = this.saveData?.herois?.[heroiId] || {};
        const equipamentos = this.saveData?.equipamentos?.[heroiId] || {};

        let bonusAtaque = 0;
        let bonusDefesa = 0;
        let bonusPv = 0;

        // Calcular bônus dos equipamentos
        Object.values(equipamentos).forEach(itemId => {
            if (!itemId) return;
            const item = this.itemsData?.items?.find(i => i.id === itemId);
            if (item?.stats) {
                bonusAtaque += item.stats.ataque || 0;
                bonusDefesa += item.stats.defesa || 0;
                bonusPv += item.stats.pvMax || 0;
            }
        });

        // Exibir stats
        const pvTotal = (heroi.pvMax || 20) + bonusPv;
        document.getElementById('equip-stat-pv')?.textContent &&
            (document.getElementById('equip-stat-pv').textContent = pvTotal);
        document.getElementById('equip-stat-ataque')?.textContent &&
            (document.getElementById('equip-stat-ataque').textContent = bonusAtaque);
        document.getElementById('equip-stat-defesa')?.textContent &&
            (document.getElementById('equip-stat-defesa').textContent = bonusDefesa);
    }

    /**
     * Renderiza itens equipáveis para o herói selecionado
     */
    renderizarItensEquipaveis(heroiId) {
        const container = document.getElementById('equip-items-grid');
        if (!container) return;

        const itensInventario = this.saveData?.inventario?.itens || [];
        const tiposEquipaveis = ['arma', 'armadura', 'acessorio'];

        // Filtrar itens equipáveis
        const itensEquipaveis = itensInventario
            .map(item => {
                const dados = this.itemsData?.items?.find(i => i.id === item.id);
                return dados ? { ...dados, quantidade: item.quantidade } : null;
            })
            .filter(item => {
                if (!item) return false;
                if (!tiposEquipaveis.includes(item.tipo)) return false;
                if (item.classes && !item.classes.includes(heroiId)) return false;
                return true;
            });

        if (itensEquipaveis.length === 0) {
            container.innerHTML = `
                <div class="empty-inventory" style="grid-column: 1/-1;">
                    <span class="empty-inventory-text">Nenhum item para equipar</span>
                </div>
            `;
            return;
        }

        container.innerHTML = itensEquipaveis.map(item => {
            const equipado = this.saveData.equipamentos[heroiId][item.tipo] === item.id;
            return `
                <div class="item-slot ${equipado ? 'selected' : ''}" data-id="${item.id}" data-rarity="${item.raridade}">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-name">${item.nome}</span>
                    ${equipado ? `<span class="item-equipped-badge">✓</span>` : ''}
                </div>
            `;
        }).join('');

        // Adicionar event listeners
        container.querySelectorAll('.item-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const itemId = slot.dataset.id;
                const item = this.itemsData?.items?.find(i => i.id === itemId);
                if (item) {
                    this.equiparItem(item);
                }
            });
        });
    }

    /**
     * Capitaliza a primeira letra
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();

    // Expor para debug
    window.game = game;
});
