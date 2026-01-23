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
     * Atualiza XP e verifica level up
     */
    adicionarXP(heroiId, xp, saveData) {
        const heroi = saveData.herois[heroiId];
        if (!heroi) return saveData;

        heroi.xp += xp;

        // Verificar level up (100 XP por nível)
        const xpParaProximoNivel = heroi.nivel * 100;
        while (heroi.xp >= xpParaProximoNivel) {
            heroi.xp -= xpParaProximoNivel;
            heroi.nivel += 1;

            // Aumentar stats por nível
            heroi.pvMax += 2;
            heroi.pv = heroi.pvMax;

            console.log(`[SaveManager] ${heroiId} subiu para nível ${heroi.nivel}!`);
        }

        return saveData;
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
