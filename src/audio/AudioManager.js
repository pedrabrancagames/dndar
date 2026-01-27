/**
 * Audio Manager
 * Gerencia todos os sons e músicas do jogo
 */
export class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = null;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.7;
        this.isMuted = false;
        this.isLoaded = false;
        this.musicPlaying = false;
        // Guardar TODAS as instâncias de música para garantir que podemos parar todas
        this.warnedSounds = new Set();
        this.allMusicInstances = [];
    }

    /**
     * Carrega todos os sons do jogo
     */
    async carregarSons() {
        const sonsList = [
            // Combate
            { id: 'sword_hit', path: '/sounds/sword_hit.mp3' },
            { id: 'magic_attack', path: '/sounds/magic_attack.mp3' },
            { id: 'fireball', path: '/sounds/fireball.mp3' },
            { id: 'ice_spell', path: '/sounds/ice_spell.mp3' },
            { id: 'lightning', path: '/sounds/lightning.mp3' },
            { id: 'bow_shot', path: '/sounds/bow_shot.mp3' },

            // Dano/Reações
            { id: 'enemy_hurt', path: '/sounds/enemy_hurt.mp3' },
            { id: 'hero_hurt', path: '/sounds/hero_hurt.mp3' },
            { id: 'critical_hit', path: '/sounds/critical_hit.mp3' },
            { id: 'enemy_death', path: '/sounds/enemy_death.mp3' },
            { id: 'hero_down', path: '/sounds/hero_down.mp3' },

            // Cura/Buff
            { id: 'heal', path: '/sounds/heal.mp3' },
            { id: 'buff_apply', path: '/sounds/buff_apply.mp3' },
            { id: 'debuff_apply', path: '/sounds/debuff_apply.mp3' },
            { id: 'shield_up', path: '/sounds/shield_up.mp3' },

            // UI/Sistema
            { id: 'card_select', path: '/sounds/card_select.mp3' },
            { id: 'turn_start', path: '/sounds/turn_start.mp3' },
            { id: 'victory', path: '/sounds/victory.mp3' },
            { id: 'defeat', path: '/sounds/defeat.mp3' },
            { id: 'enemy_turn', path: '/sounds/enemy_turn.mp3' },
            { id: 'ui_hover', path: '/sounds/card_select.mp3' }, // Alias para hover

            // AR
            // { id: 'ar_placement', path: '/sounds/ar_placement.mp3' } // Agora é música
        ];

        // Carregar todos os sons em paralelo
        const loadPromises = sonsList.map(async (som) => {
            try {
                const audio = new Audio(som.path);
                audio.preload = 'auto';
                audio.volume = this.sfxVolume;

                // Esperar o áudio carregar
                await new Promise((resolve, reject) => {
                    audio.oncanplaythrough = resolve;
                    audio.onerror = reject;
                    // Timeout de 5 segundos
                    setTimeout(resolve, 5000);
                });

                this.sounds.set(som.id, audio);
            } catch (error) {
                console.warn(`[AudioManager] Erro ao carregar ${som.id}:`, error);
            }
        });

        await Promise.all(loadPromises);

        // Música de combate será criada dinamicamente ao iniciar combate
        // Isso evita problemas de instâncias duplicadas

        this.isLoaded = true;
        console.log(`[AudioManager] ${this.sounds.size} sons carregados`);
    }

    /**
     * Toca um som de efeito
     */
    tocar(soundId) {
        if (this.isMuted || !this.isLoaded) return;

        const audio = this.sounds.get(soundId);
        if (!audio) {
            if (!this.warnedSounds.has(soundId)) {
                console.warn(`[AudioManager] Som não encontrado: ${soundId}`);
                this.warnedSounds.add(soundId);
            }
            return;
        }

        // Clonar para permitir múltiplas reproduções simultâneas
        const clone = audio.cloneNode();
        clone.volume = this.sfxVolume;
        clone.play().catch(() => {
            // Ignorar erro de autoplay bloqueado
        });
    }

    /**
     * Toca som baseado no tipo de ação
     */
    tocarAcao(tipoAcao, extra = {}) {
        switch (tipoAcao) {
            // Ataques
            case 'dano':
            case 'ataque':
                if (extra.critico) {
                    this.tocar('critical_hit');
                } else {
                    this.tocar('sword_hit');
                }
                break;
            case 'fogo':
            case 'fireball':
                this.tocar('fireball');
                break;
            case 'gelo':
            case 'ice':
                this.tocar('ice_spell');
                break;
            case 'raio':
            case 'lightning':
                this.tocar('lightning');
                break;
            case 'magia':
                this.tocar('magic_attack');
                break;
            case 'arco':
                this.tocar('bow_shot');
                break;

            // Dano
            case 'enemy_hurt':
                this.tocar('enemy_hurt');
                break;
            case 'hero_hurt':
                this.tocar('hero_hurt');
                break;
            case 'enemy_death':
                this.tocar('enemy_death');
                break;
            case 'hero_down':
                this.tocar('hero_down');
                break;

            // Cura/Buff
            case 'cura':
            case 'heal':
                this.tocar('heal');
                break;
            case 'buff':
                this.tocar('buff_apply');
                break;
            case 'debuff':
                this.tocar('debuff_apply');
                break;
            case 'escudo':
                this.tocar('shield_up');
                break;

            // UI
            case 'card_select':
                this.tocar('card_select');
                break;
            case 'turn_start':
                this.tocar('turn_start');
                break;
            case 'enemy_turn':
                this.tocar('enemy_turn');
                break;
            case 'victory':
                this.tocar('victory');
                break;
            case 'defeat':
                this.tocar('defeat');
                break;
            // case 'ar_placement':
            //     this.tocar('ar_placement');
            //     break;
        }
    }

    /**
     * Toca uma música (loop)
     * Para qualquer música anterior
     */
    tocarMusica(path) {
        if (this.isMuted) return;

        console.log(`[AudioManager] Trocando música para: ${path}`);

        // SEMPRE parar todas as músicas anteriores
        this.pararMusica();

        // Criar nova instância
        this.music = new Audio(path);
        this.music.loop = true;
        this.music.volume = this.musicVolume;

        // Adicionar à lista de controle
        this.allMusicInstances.push(this.music);

        this.music.play().then(() => {
            this.musicPlaying = true;
            console.log('[AudioManager] Música iniciada com sucesso');
        }).catch((err) => {
            console.warn('[AudioManager] Erro ao iniciar música:', err);
            this.musicPlaying = false;
        });
    }

    /**
     * Inicia a música de combate
     */
    iniciarMusicaCombate() {
        this.tocarMusica('/sounds/combat_music.mp3');
    }

    /**
     * Inicia a música de placement AR
     */
    tocarMusicaArPlacement() {
        this.tocarMusica('/sounds/ar_placement.mp3');
    }

    /**
     * Para a música completamente - TODAS as instâncias
     */
    pararMusica() {
        console.log('[AudioManager] Parando TODAS as músicas...', this.allMusicInstances.length, 'instâncias');

        // Parar TODAS as instâncias de música que foram criadas
        this.allMusicInstances.forEach((audioInstance, index) => {
            try {
                if (audioInstance) {
                    audioInstance.pause();
                    audioInstance.currentTime = 0;
                    audioInstance.src = ''; // Release memory
                    // audioInstance.load(); // Can cause errors if src is empty
                    console.log(`[AudioManager] Instância ${index} parada e limpa`);
                }
            } catch (err) {
                console.error(`[AudioManager] Erro ao parar instância ${index}:`, err);
            }
        });

        // Limpar o array
        this.allMusicInstances = [];
        this.music = null;
        this.musicPlaying = false;
    }

    /**
     * Para toda mídia de áudio (emergência)
     */
    pararTudo() {
        this.pararMusica();
        this.gameMaster?.stop?.();

        // Parar todos os sons ativos
        this.sounds.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (err) { }
        });
    }

    /**
     * Pausa a música
     */
    pausarMusica() {
        if (this.music) {
            this.music.pause();
        }
    }

    /**
     * Retoma a música
     */
    retomarMusica() {
        if (this.music && !this.isMuted) {
            this.music.play().catch(() => { });
        }
    }

    /**
     * Define volume dos efeitos sonoros
     */
    setVolumeSFX(valor) {
        this.sfxVolume = Math.max(0, Math.min(1, valor));
        this.sounds.forEach(audio => {
            audio.volume = this.sfxVolume;
        });
    }

    /**
     * Define volume da música
     */
    setVolumeMusica(valor) {
        this.musicVolume = Math.max(0, Math.min(1, valor));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }

    /**
     * Alterna mudo
     */
    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.isMuted) {
            this.pausarMusica();
        } else {
            this.retomarMusica();
        }

        return this.isMuted;
    }

    /**
     * Define estado de mudo
     */
    setMute(muted) {
        this.isMuted = muted;

        if (this.isMuted) {
            this.pausarMusica();
        }
    }
}
