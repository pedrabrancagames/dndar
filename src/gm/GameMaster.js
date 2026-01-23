/**
 * Game Master Virtual
 * Gerencia narrativa, diálogos e narração por voz
 */
export class GameMaster {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.voiceEnabled = true;
        this.speechRate = 0.9;
        this.volume = 1.0;

        this.estadoNarrativo = {
            capituloAtual: 1,
            missaoAtual: 1,
            estadoBairro: 'estavel',
            decisoes: []
        };

        this.filaDialogos = [];
        this.dialogoAtivo = null;

        this.callbacks = {};

        // Inicializar vozes
        this.initVoice();
    }

    /**
     * Inicializa o sistema de voz
     */
    initVoice() {
        // Carregar vozes pode ser assíncrono
        if (this.synth.getVoices().length > 0) {
            this.loadVoice();
        } else {
            this.synth.addEventListener('voiceschanged', () => this.loadVoice());
        }
    }

    /**
     * Carrega a voz preferida (português do Brasil)
     */
    loadVoice() {
        const voices = this.synth.getVoices();

        // Tentar encontrar voz PT-BR
        this.voice = voices.find(v => v.lang === 'pt-BR');

        // Fallback para qualquer voz em português
        if (!this.voice) {
            this.voice = voices.find(v => v.lang.startsWith('pt'));
        }

        // Fallback para primeira voz disponível
        if (!this.voice && voices.length > 0) {
            this.voice = voices[0];
        }

        console.log('[GameMaster] Voz carregada:', this.voice?.name || 'Nenhuma');
    }

    /**
     * Obtém lista de vozes disponíveis
     */
    getVoicesDisponiveis() {
        return this.synth.getVoices().map(v => ({
            name: v.name,
            lang: v.lang,
            local: v.localService
        }));
    }

    /**
     * Define a voz ativa
     */
    setVoice(voiceName) {
        const voices = this.synth.getVoices();
        const novaVoz = voices.find(v => v.name === voiceName);
        if (novaVoz) {
            this.voice = novaVoz;
            console.log('[GameMaster] Voz alterada para:', voiceName);
        }
    }

    /**
     * Configura velocidade da fala
     */
    setSpeechRate(rate) {
        this.speechRate = Math.max(0.5, Math.min(1.5, rate));
    }

    /**
     * Configura volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Ativa/desativa narração por voz
     */
    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
        if (!enabled) {
            this.stop();
        }
    }

    /**
     * Narra um texto
     */
    narrate(text, options = {}) {
        return new Promise((resolve) => {
            if (!this.voiceEnabled || !this.synth) {
                resolve();
                return;
            }

            // Cancelar fala anterior
            this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.voice;
            utterance.rate = options.rate || this.speechRate;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || this.volume;

            utterance.onend = () => {
                resolve();
                if (options.onEnd) options.onEnd();
            };

            utterance.onerror = (event) => {
                console.warn('[GameMaster] Erro na narração:', event.error);
                resolve();
            };

            this.synth.speak(utterance);
        });
    }

    /**
     * Para a narração atual
     */
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    /**
     * Pausa a narração
     */
    pause() {
        if (this.synth) {
            this.synth.pause();
        }
    }

    /**
     * Resume a narração pausada
     */
    resume() {
        if (this.synth) {
            this.synth.resume();
        }
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
     * Exibe um diálogo do Game Master
     */
    async mostrarDialogo(texto, options = {}) {
        this.dialogoAtivo = { texto, options };

        this.emit('dialogoIniciado', { texto, ...options });

        // Narrar se voz estiver ativada
        if (this.voiceEnabled && !options.semVoz) {
            await this.narrate(texto, {
                rate: options.rate || this.speechRate * 0.95,
                pitch: options.pitch || 0.95
            });
        }

        // Aguardar interação do usuário se não for auto-continuar
        if (!options.autoContinuar) {
            return new Promise(resolve => {
                this.resolverDialogo = resolve;
            });
        }
    }

    /**
     * Continua/fecha o diálogo atual
     */
    continuarDialogo() {
        if (this.resolverDialogo) {
            this.resolverDialogo();
            this.resolverDialogo = null;
        }
        this.dialogoAtivo = null;
        this.emit('dialogoFechado');
    }

    /**
     * Apresenta briefing de missão
     */
    async apresentarBriefing(missao) {
        // Se tiver um texto personalizado da missão, usar ele
        if (missao.texto) {
            await this.mostrarDialogo(missao.texto, {
                tipo: 'briefing',
                autoContinuar: true,
                duracao: 5000
            });
            return;
        }

        const briefings = {
            1: {
                1: "Se você está ouvindo isso, significa que algo respondeu ao seu chamado. O bairro mudou. Coisas que dormiam sob o concreto agora se movem. Este é apenas o começo.",
                2: "Eles deixaram marcas. Símbolos que não pertencem a este mundo. Siga os ecos.",
                3: "Algo foi aberto aqui. Não foi acidente. Foi um ritual.",
                4: "Agora ele sabe que você existe. Não recue."
            },
            2: {
                1: "Não é mais um ponto isolado. Eles estão se espalhando. E estão aprendendo.",
                2: "Eles se comunicam. Sussurram. Alguns escutam.",
                3: "A fenda não está mais instável. Está sendo mantida.",
                4: "Você não pode salvar tudo. Decida rápido.",
                5: "Ele não é o mestre. É apenas o anúncio."
            },
            3: {
                1: "Este lugar foi marcado antes de você nascer. As camadas do tempo estão se abrindo.",
                2: "Ela vê através deles. E agora, através de você.",
                3: "Nem todos resistem ao chamado. Alguns se tornam portais vivos.",
                4: "Você queria respostas. Agora sabe demais."
            },
            4: {
                1: "Ela não está escondida. Está observando. Cada passo seu ecoa.",
                2: "As regras estão falhando. Não confie no que vê.",
                3: "Ela fala agora. Não com palavras. Com consequências."
            },
            5: {
                1: "Tudo levou a este momento. Os pontos estão ativos. As escolhas acabaram.",
                2: "Não é um feitiço. É um acordo.",
                3: "Ela responde agora. Não com palavras."
            }
        };

        const capitulo = missao.capitulo || this.estadoNarrativo.capituloAtual;
        const missaoNum = missao.numero || this.estadoNarrativo.missaoAtual;

        const texto = briefings[capitulo]?.[missaoNum] || "Preparem-se. O desconhecido aguarda.";

        // Em modo AR, usar autoContinuar para não bloquear
        await this.mostrarDialogo(texto, {
            tipo: 'briefing',
            autoContinuar: true,
            duracao: 4000
        });
    }

    /**
     * Narra início de combate
     */
    async anunciarCombate(inimigos) {
        let texto;

        if (inimigos.length === 1) {
            texto = `Cuidado! Um ${inimigos[0].nome} apareceu!`;
        } else if (inimigos.length <= 3) {
            texto = "Preparem-se. Vocês não estão sozinhos.";
        } else {
            texto = "Muitos se aproximam. Fiquem em formação!";
        }

        await this.mostrarDialogo(texto, {
            tipo: 'combate',
            autoContinuar: true,
            duracao: 2000
        });
    }

    /**
     * Narra resultado de ação
     */
    async narrarAcao(acao) {
        const narracoes = {
            dano_alto: [
                "Um golpe devastador!",
                "O ataque encontra seu alvo com força brutal!",
                "Impressionante!"
            ],
            critico: [
                "Golpe crítico!",
                "Um acerto perfeito!",
                "Direto no ponto fraco!"
            ],
            cura: [
                "A luz divina restaura as feridas.",
                "Energia vital flui pelo grupo."
            ],
            buff: [
                "O poder cresce dentro de vocês.",
                "Uma aura protetora se forma."
            ],
            derrota_inimigo: [
                "A criatura sucumbe.",
                "Mais um cai.",
                "A ameaça foi neutralizada."
            ],
            heroi_incapacitado: [
                "Não! Um de vocês caiu!",
                "Mantenham a formação! Protejam o caído!"
            ]
        };

        const tipo = this.classificarAcao(acao);
        const opcoes = narracoes[tipo] || [];

        if (opcoes.length > 0) {
            const texto = opcoes[Math.floor(Math.random() * opcoes.length)];
            await this.narrate(texto, { rate: 1.0 });
        }
    }

    /**
     * Classifica uma ação para narração
     */
    classificarAcao(acao) {
        if (acao.critico) return 'critico';
        if (acao.derrotado) return 'derrota_inimigo';
        if (acao.alvoIncapacitado) return 'heroi_incapacitado';
        if (acao.tipo === 'dano' && acao.valor >= 10) return 'dano_alto';
        if (acao.tipo === 'cura') return 'cura';
        if (acao.tipo === 'buff') return 'buff';
        return null;
    }

    /**
     * Narra vitória no combate
     */
    async anunciarVitoria(autoContinuar = false) {
        const frases = [
            "A ameaça foi contida. Por enquanto.",
            "Vitória! Mas não baixem a guarda.",
            "Isso foi apenas um presságio. Preparem-se para o que vem.",
            "Bem feito! Mas o bairro ainda precisa de vocês."
        ];

        const texto = frases[Math.floor(Math.random() * frases.length)];
        await this.mostrarDialogo(texto, { tipo: 'vitoria', autoContinuar });
    }

    /**
     * Narra derrota no combate
     */
    async anunciarDerrota(autoContinuar = false) {
        await this.mostrarDialogo(
            "A escuridão venceu desta vez. Mas ainda há esperança. Tentem novamente.",
            { tipo: 'derrota', autoContinuar }
        );
    }

    /**
     * Narra transição de fase de boss
     */
    async anunciarFaseBoss(boss, fase) {
        const texto = fase === 2
            ? `${boss.nome} enfurece! A batalha intensifica!`
            : `${boss.nome} revela sua forma verdadeira!`;

        await this.narrate(texto, { rate: 0.85, pitch: 0.9 });
    }

    /**
     * Obtém configurações atuais
     */
    getConfig() {
        return {
            voiceEnabled: this.voiceEnabled,
            speechRate: this.speechRate,
            volume: this.volume,
            voiceName: this.voice?.name
        };
    }

    /**
     * Carrega configurações
     */
    loadConfig(config) {
        if (config.voiceEnabled !== undefined) this.voiceEnabled = config.voiceEnabled;
        if (config.speechRate !== undefined) this.speechRate = config.speechRate;
        if (config.volume !== undefined) this.volume = config.volume;
        if (config.voiceName) this.setVoice(config.voiceName);
    }
}
