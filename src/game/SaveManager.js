/**
 * Save Manager
 * Gerencia salvamento e carregamento de progresso do jogo
 * Usa LocalStorage para persistência simples
 */
export class SaveManager {
    constructor() {
        this.SAVE_KEY = 'dnd_demeo_save';
        this.SETTINGS_KEY = 'dnd_demeo_settings';
    }

    /**
     * Estrutura padrão de save
     */
    getDefaultSave() {
        return {
            version: '1.0.0',
            createdAt: Date.now(),
            updatedAt: Date.now(),

            // Progresso da campanha
            campanha: {
                capituloAtual: 1,
                missaoAtual: 1,
                missoesCompletas: [],
                checkpointId: null
            },

            // Estado dos heróis
            herois: {
                guerreiro: {
                    nivel: 1,
                    xp: 0,
                    pvMax: 24,
                    pv: 24,
                    paMax: 4,
                    cartasDesbloqueadas: ['heavy_strike', 'shield_wall', 'taunt', 'cleave', 'rally_cry', 'execute']
                },
                mago: {
                    nivel: 1,
                    xp: 0,
                    pvMax: 14,
                    pv: 14,
                    paMax: 5,
                    cartasDesbloqueadas: ['fireball', 'arcane_bolt', 'freeze', 'mana_shield', 'chain_lightning', 'meteor']
                },
                ladino: {
                    nivel: 1,
                    xp: 0,
                    pvMax: 16,
                    pv: 16,
                    paMax: 5,
                    cartasDesbloqueadas: ['backstab', 'poison_blade', 'disarm_trap', 'evasion', 'mark_target', 'assassinate']
                },
                clerigo: {
                    nivel: 1,
                    xp: 0,
                    pvMax: 18,
                    pv: 18,
                    paMax: 4,
                    cartasDesbloqueadas: ['heal', 'bless', 'turn_undead', 'divine_shield', 'purify', 'resurrection']
                }
            },

            // Estatísticas
            estatisticas: {
                combatesVencidos: 0,
                combatesPerdidos: 0,
                inimigosDerotados: 0,
                danoTotal: 0,
                curaTotal: 0,
                tempoJogado: 0
            },

            // Inventário
            inventario: {
                ouro: 100, // Ouro inicial
                itens: [
                    // Itens iniciais para teste
                    { id: 'pocao_cura_pequena', quantidade: 3 },
                    { id: 'espada_ferro', quantidade: 1 }
                ]
            },

            // Equipamentos por herói
            equipamentos: {
                guerreiro: { arma: null, armadura: null, acessorio: null },
                mago: { arma: null, armadura: null, acessorio: null },
                ladino: { arma: null, armadura: null, acessorio: null },
                clerigo: { arma: null, armadura: null, acessorio: null }
            }
        };
    }

    /**
     * Estrutura padrão de configurações
     */
    getDefaultSettings() {
        return {
            audio: {
                musicaVolume: 0.3,
                sfxVolume: 0.7,
                vozVolume: 0.8,
                mudo: false
            },
            gameplay: {
                velocidadeAnimacao: 'normal',
                mostrarDicas: true,
                autoPassarTurno: false
            },
            acessibilidade: {
                tamanhoFonte: 'normal',
                altoContraste: false
            }
        };
    }

    /**
     * Salva o progresso do jogo
     */
    salvar(saveData) {
        try {
            saveData.updatedAt = Date.now();
            const json = JSON.stringify(saveData);
            localStorage.setItem(this.SAVE_KEY, json);
            console.log('[SaveManager] Jogo salvo com sucesso');
            return true;
        } catch (error) {
            console.error('[SaveManager] Erro ao salvar:', error);
            return false;
        }
    }

    /**
     * Carrega o progresso do jogo
     */
    carregar() {
        try {
            const json = localStorage.getItem(this.SAVE_KEY);
            if (!json) {
                console.log('[SaveManager] Nenhum save encontrado, criando novo');
                return this.getDefaultSave();
            }

            const saveData = JSON.parse(json);
            console.log('[SaveManager] Save carregado com sucesso');

            // Merge com valores padrão para garantir compatibilidade
            return this.mergeSave(saveData);
        } catch (error) {
            console.error('[SaveManager] Erro ao carregar:', error);
            return this.getDefaultSave();
        }
    }

    /**
     * Merge save antigo com estrutura atual
     */
    mergeSave(oldSave) {
        const defaultSave = this.getDefaultSave();
        return {
            ...defaultSave,
            ...oldSave,
            campanha: { ...defaultSave.campanha, ...oldSave.campanha },
            herois: {
                guerreiro: { ...defaultSave.herois.guerreiro, ...oldSave.herois?.guerreiro },
                mago: { ...defaultSave.herois.mago, ...oldSave.herois?.mago },
                ladino: { ...defaultSave.herois.ladino, ...oldSave.herois?.ladino },
                clerigo: { ...defaultSave.herois.clerigo, ...oldSave.herois?.clerigo }
            },
            estatisticas: { ...defaultSave.estatisticas, ...oldSave.estatisticas },
            inventario: { ...defaultSave.inventario, ...oldSave.inventario },
            equipamentos: {
                guerreiro: { ...defaultSave.equipamentos.guerreiro, ...oldSave.equipamentos?.guerreiro },
                mago: { ...defaultSave.equipamentos.mago, ...oldSave.equipamentos?.mago },
                ladino: { ...defaultSave.equipamentos.ladino, ...oldSave.equipamentos?.ladino },
                clerigo: { ...defaultSave.equipamentos.clerigo, ...oldSave.equipamentos?.clerigo }
            }
        };
    }

    /**
     * Salva configurações
     */
    salvarConfiguracoes(settings) {
        try {
            const json = JSON.stringify(settings);
            localStorage.setItem(this.SETTINGS_KEY, json);
            console.log('[SaveManager] Configurações salvas');
            return true;
        } catch (error) {
            console.error('[SaveManager] Erro ao salvar configurações:', error);
            return false;
        }
    }

    /**
     * Carrega configurações
     */
    carregarConfiguracoes() {
        try {
            const json = localStorage.getItem(this.SETTINGS_KEY);
            if (!json) {
                return this.getDefaultSettings();
            }

            const settings = JSON.parse(json);
            const defaults = this.getDefaultSettings();

            // Deep merge para garantir que todas as propriedades existam
            return {
                ...defaults,
                audio: { ...defaults.audio, ...settings.audio },
                gameplay: { ...defaults.gameplay, ...settings.gameplay },
                acessibilidade: { ...defaults.acessibilidade, ...settings.acessibilidade }
            };
        } catch (error) {
            console.error('[SaveManager] Erro ao carregar configurações:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Reseta o save (novo jogo)
     */
    resetar() {
        try {
            localStorage.removeItem(this.SAVE_KEY);
            console.log('[SaveManager] Save resetado');
            return true;
        } catch (error) {
            console.error('[SaveManager] Erro ao resetar:', error);
            return false;
        }
    }

    /**
     * Verifica se existe save
     */
    existeSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    /**
     * Define cartas desbloqueáveis por nível para cada classe
     */
    getCartasPorNivel() {
        return {
            guerreiro: {
                3: 'shield_bash',      // Bater com escudo
                5: 'whirlwind',        // Redemoinho
                7: 'second_wind',      // Segundo Fôlego
                10: 'berserker_rage'   // Fúria Berserker
            },
            mago: {
                3: 'ice_wall',         // Muralha de Gelo
                5: 'teleport',         // Teleporte
                7: 'arcane_explosion', // Explosão Arcana
                10: 'time_stop'        // Parar o Tempo
            },
            ladino: {
                3: 'smoke_bomb',       // Bomba de Fumaça
                5: 'shadow_step',      // Passo das Sombras
                7: 'fan_of_knives',    // Leque de Facas
                10: 'death_mark'       // Marca da Morte
            },
            clerigo: {
                3: 'holy_smite',       // Golpe Sagrado
                5: 'mass_heal',        // Cura em Massa
                7: 'divine_intervention', // Intervenção Divina
                10: 'angel_summon'     // Invocar Anjo
            }
        };
    }

    /**
     * Calcula XP necessário para o próximo nível
     */
    getXPParaProximoNivel(nivel) {
        // Fórmula: 100 XP base + 50 XP por nível adicional
        return 100 + (nivel - 1) * 50;
    }

    /**
     * Obtém os aumentos de stats por level up
     */
    getStatsPorNivel(heroiId, nivel) {
        // Aumentos base
        const base = {
            pvMax: 3,
            paMax: 0,
            defesa: 0,
            ataque: 0
        };

        // A cada 3 níveis, ganha +1 PA máximo
        if (nivel % 3 === 0) {
            base.paMax = 1;
        }

        // A cada 2 níveis, ganha +1 defesa ou ataque
        if (nivel % 2 === 0) {
            if (heroiId === 'guerreiro' || heroiId === 'clerigo') {
                base.defesa = 1;
            } else {
                base.ataque = 1;
            }
        }

        // Bonus específico por classe
        switch (heroiId) {
            case 'guerreiro':
                base.pvMax += 2; // Guerreiro ganha mais vida
                break;
            case 'mago':
                base.ataque += 1; // Mago ganha mais poder mágico
                break;
            case 'ladino':
                base.ataque += 1; // Ladino ganha mais dano
                break;
            case 'clerigo':
                base.pvMax += 1; // Clérigo equilibrado
                break;
        }

        return base;
    }

    /**
     * Atualiza XP e verifica level up
     * @returns {{ saveData: object, levelUps: Array }} Retorna saveData e array de level ups ocorridos
     */
    adicionarXP(heroiId, xp, saveData) {
        const heroi = saveData.herois[heroiId];
        if (!heroi) return { saveData, levelUps: [] };

        heroi.xp += xp;
        const levelUps = [];
        const cartasPorNivel = this.getCartasPorNivel();

        // Verificar level up
        let xpParaProximoNivel = this.getXPParaProximoNivel(heroi.nivel);

        while (heroi.xp >= xpParaProximoNivel) {
            heroi.xp -= xpParaProximoNivel;
            heroi.nivel += 1;

            // Obter aumentos de stats
            const statsGanhos = this.getStatsPorNivel(heroiId, heroi.nivel);

            // Aplicar aumentos de stats
            heroi.pvMax += statsGanhos.pvMax;
            heroi.pv = heroi.pvMax; // Restaurar vida ao subir de nível
            heroi.paMax = (heroi.paMax || 4) + statsGanhos.paMax;

            // Verificar se desbloqueia nova carta
            let novaCarta = null;
            if (cartasPorNivel[heroiId] && cartasPorNivel[heroiId][heroi.nivel]) {
                novaCarta = cartasPorNivel[heroiId][heroi.nivel];
                if (!heroi.cartasDesbloqueadas.includes(novaCarta)) {
                    heroi.cartasDesbloqueadas.push(novaCarta);
                }
            }

            // Registrar o level up
            levelUps.push({
                heroiId,
                novoNivel: heroi.nivel,
                statsGanhos,
                novaCarta,
                xpParaProximo: this.getXPParaProximoNivel(heroi.nivel)
            });

            console.log(`[SaveManager] ${heroiId} subiu para nível ${heroi.nivel}!`);

            // Calcular XP para o próximo nível
            xpParaProximoNivel = this.getXPParaProximoNivel(heroi.nivel);
        }

        return { saveData, levelUps };
    }

    /**
     * Marca missão como completa
     */
    completarMissao(capitulo, missao, saveData) {
        const missaoId = `${capitulo}-${missao}`;

        if (!saveData.campanha.missoesCompletas.includes(missaoId)) {
            saveData.campanha.missoesCompletas.push(missaoId);
        }

        // Avançar para próxima missão
        if (missao < 5) {
            saveData.campanha.missaoAtual = missao + 1;
        } else {
            // Próximo capítulo
            saveData.campanha.capituloAtual += 1;
            saveData.campanha.missaoAtual = 1;
        }

        return saveData;
    }

    /**
     * Registra estatísticas de combate
     */
    registrarCombate(resultado, stats, saveData) {
        if (resultado === 'vitoria') {
            saveData.estatisticas.combatesVencidos += 1;
        } else {
            saveData.estatisticas.combatesPerdidos += 1;
        }

        saveData.estatisticas.inimigosDerotados += stats.inimigosDerotados || 0;
        saveData.estatisticas.danoTotal += stats.danoTotal || 0;
        saveData.estatisticas.curaTotal += stats.curaTotal || 0;

        return saveData;
    }

    /**
     * Restaura PV dos heróis (após combate ou descanso)
     */
    restaurarHerois(saveData) {
        Object.keys(saveData.herois).forEach(heroiId => {
            saveData.herois[heroiId].pv = saveData.herois[heroiId].pvMax;
        });
        return saveData;
    }

    /**
     * Obtém resumo do save para exibição
     */
    getResumoSave(saveData) {
        return {
            capituloAtual: saveData.campanha.capituloAtual,
            missaoAtual: saveData.campanha.missaoAtual,
            combatesVencidos: saveData.estatisticas.combatesVencidos,
            tempoJogado: this.formatarTempo(saveData.estatisticas.tempoJogado),
            ultimoSave: new Date(saveData.updatedAt).toLocaleDateString('pt-BR')
        };
    }

    /**
     * Formata tempo em formato legível
     */
    formatarTempo(segundos) {
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);

        if (horas > 0) {
            return `${horas}h ${minutos}m`;
        }
        return `${minutos}m`;
    }
}
