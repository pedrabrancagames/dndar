/**
 * Enemy Entity Class
 * Representa um inimigo com IA de combate
 */
export class Enemy {
    constructor(data, instanceId) {
        this.id = data.id;
        this.instanceId = instanceId || `${data.id}_${Date.now()}`;
        this.nome = data.nome;
        this.tipo = data.tipo;
        this.modelo = data.modelo;
        this.escala = data.escala || 1.0;

        // Stats
        this.pvMax = data.stats.pvMax;
        this.pv = data.stats.pv;
        this.defesa = data.stats.defesa;
        this.ataque = data.stats.ataque;
        this.regeneracao = data.stats.regeneracao || 0;

        // Ataques disponíveis
        this.ataques = data.ataques || [];

        // Comportamento IA
        this.comportamento = data.comportamento || {
            prioridade: 'aleatorio',
            agressividade: 'normal'
        };

        // Status e efeitos
        this.status = [];
        this.debuffs = [];

        // Flags especiais
        this.isBoss = data.isBoss || false;
        this.fases = data.fases || 1;
        this.faseAtual = 1;
        this.vulnerabilidades = data.vulnerabilidades || [];
        this.resistencias = data.resistencias || [];

        // Posição 3D (será definida pelo SceneManager)
        this.posicao = { x: 0, y: 0, z: -3 };
        this.rotacao = { x: 0, y: 0, z: 0 };

        // Referência ao modelo 3D
        this.mesh = null;

        // Recompensas
        this.recompensas = data.recompensas || { xp: 10 };

        // Estado
        this.derrotado = false;
        this.selecionado = false;
        this.marcado = false; // Debuff de marca do Ladino
    }

    /**
     * Recebe dano
     */
    receberDano(dano, tipo = 'fisico') {
        let danoFinal = dano;

        // Verificar vulnerabilidades (dano dobrado)
        if (this.vulnerabilidades.includes(tipo)) {
            danoFinal *= 2;
        }

        // Verificar resistências (dano reduzido pela metade)
        if (this.resistencias.includes(tipo)) {
            danoFinal = Math.floor(danoFinal / 2);
        }

        // Verificar se marcado (bônus de dano)
        if (this.marcado) {
            const marcaDebuff = this.debuffs.find(d => d.tipo === 'marcado');
            if (marcaDebuff) {
                danoFinal += marcaDebuff.bonusDano || 4;
            }
        }

        // Aplicar defesa
        danoFinal = Math.max(1, danoFinal - this.defesa);

        // Aplicar dano
        this.pv = Math.max(0, this.pv - danoFinal);

        // Verificar derrota
        if (this.pv <= 0) {
            // Bosses podem ter fases
            if (this.isBoss && this.faseAtual < this.fases) {
                this.faseAtual++;
                this.pv = Math.floor(this.pvMax * 0.5); // Restaura 50% na próxima fase
                return {
                    dano: danoFinal,
                    novaFase: true,
                    fase: this.faseAtual
                };
            } else {
                this.derrotado = true;
            }
        }

        return {
            dano: danoFinal,
            pvAtual: this.pv,
            derrotado: this.derrotado,
            vulneravel: this.vulnerabilidades.includes(tipo),
            resistente: this.resistencias.includes(tipo)
        };
    }

    /**
     * Adiciona debuff ao inimigo
     */
    adicionarDebuff(debuff) {
        const existente = this.debuffs.findIndex(d => d.tipo === debuff.tipo);
        if (existente >= 0) {
            if (debuff.duracao > this.debuffs[existente].duracao) {
                this.debuffs[existente].duracao = debuff.duracao;
            }
        } else {
            this.debuffs.push({ ...debuff });

            // Atualizar flags especiais
            if (debuff.tipo === 'marcado') {
                this.marcado = true;
            }
        }
    }

    /**
     * Verifica se pode agir neste turno
     */
    podeAgir() {
        if (this.derrotado) return false;

        const congelado = this.debuffs.find(d => d.tipo === 'congelado');
        const paralisado = this.debuffs.find(d => d.tipo === 'paralisado');
        const amedrontado = this.debuffs.find(d => d.tipo === 'amedrontado');

        if (congelado || paralisado) return false;

        // Inimigos amedrontados têm 50% de chance de não agir
        if (amedrontado && Math.random() < 0.5) return false;

        return true;
    }

    /**
     * Escolhe um alvo baseado no comportamento
     */
    escolherAlvo(herois) {
        const alvosValidos = herois.filter(h => !h.incapacitado);
        if (alvosValidos.length === 0) return null;

        // Verificar se está provocado
        const provocado = this.debuffs.find(d => d.tipo === 'provocado');
        if (provocado && provocado.provocador) {
            const provocador = alvosValidos.find(h => h.id === provocado.provocador);
            if (provocador) return provocador;
        }

        switch (this.comportamento.prioridade) {
            case 'menor_pv':
                return alvosValidos.reduce((min, h) => h.pv < min.pv ? h : min);

            case 'maior_dano':
                return alvosValidos.reduce((max, h) => h.danoTotal > max.danoTotal ? h : max);

            case 'mais_proximo':
                // Por enquanto, retorna o primeiro (Guerreiro geralmente)
                return alvosValidos[0];

            case 'aleatorio':
            default:
                return alvosValidos[Math.floor(Math.random() * alvosValidos.length)];
        }
    }

    /**
     * Escolhe um ataque
     */
    escolherAtaque() {
        if (this.ataques.length === 0) {
            return { nome: 'Ataque Básico', dano: this.ataque + 2, dados: '1d4' };
        }

        // Por enquanto, escolhe aleatoriamente entre os ataques disponíveis
        // Futuramente, pode implementar lógica mais complexa baseada na situação
        return this.ataques[Math.floor(Math.random() * this.ataques.length)];
    }

    /**
     * Executa o turno do inimigo
     */
    executarTurno(herois) {
        if (!this.podeAgir()) {
            return { pulou: true, motivo: this.getMotivoPulo() };
        }

        const alvo = this.escolherAlvo(herois);
        if (!alvo) {
            return { semAlvo: true };
        }

        const ataque = this.escolherAtaque();
        const danoBase = ataque.dano || this.ataque;

        // Calcular dano com variação
        const variacao = Math.floor(Math.random() * 3) - 1; // -1, 0, ou +1
        const danoFinal = Math.max(1, danoBase + variacao);

        // Aplicar dano ao alvo
        const resultado = alvo.receberDano(danoFinal);

        // Aplicar status se o ataque tiver
        if (ataque.status && !resultado.evadido) {
            alvo.adicionarDebuff({
                tipo: ataque.status,
                duracao: 2,
                dano: ataque.tipo === 'envenenado' ? 2 : 0
            });
        }

        // Lifesteal
        if (ataque.lifesteal && !resultado.evadido) {
            this.pv = Math.min(this.pvMax, this.pv + ataque.lifesteal);
        }

        return {
            atacante: this.nome,
            ataque: ataque.nome,
            alvo: alvo.nome,
            dano: resultado.dano,
            evadido: resultado.evadido,
            alvoIncapacitado: resultado.incapacitado,
            status: ataque.status || null,
            lifesteal: ataque.lifesteal || 0
        };
    }

    /**
     * Retorna motivo por não poder agir
     */
    getMotivoPulo() {
        if (this.debuffs.find(d => d.tipo === 'congelado')) return 'congelado';
        if (this.debuffs.find(d => d.tipo === 'paralisado')) return 'paralisado';
        if (this.debuffs.find(d => d.tipo === 'amedrontado')) return 'amedrontado';
        return 'desconhecido';
    }

    /**
     * Processa efeitos de status no início do turno
     */
    processarStatusTurno() {
        const resultados = [];

        // Regeneração (se tiver)
        if (this.regeneracao > 0 && this.pv < this.pvMax) {
            const cura = Math.min(this.regeneracao, this.pvMax - this.pv);
            this.pv += cura;
            resultados.push({ tipo: 'regeneracao', valor: cura });
        }

        // Processar debuffs com dano (queimando, envenenado)
        for (const debuff of this.debuffs) {
            if (debuff.dano) {
                this.pv = Math.max(0, this.pv - debuff.dano);
                resultados.push({ tipo: debuff.tipo, dano: debuff.dano });

                if (this.pv <= 0) {
                    this.derrotado = true;
                }
            }
        }

        // Reduzir duração de debuffs
        this.debuffs = this.debuffs.filter(d => {
            d.duracao--;
            if (d.duracao <= 0 && d.tipo === 'marcado') {
                this.marcado = false;
            }
            return d.duracao > 0;
        });

        return resultados;
    }

    /**
     * Retorna dados para exibição no HUD/AR
     */
    getDisplayData() {
        return {
            instanceId: this.instanceId,
            nome: this.nome,
            pv: this.pv,
            pvMax: this.pvMax,
            pvPercent: (this.pv / this.pvMax) * 100,
            isBoss: this.isBoss,
            faseAtual: this.faseAtual,
            fases: this.fases,
            derrotado: this.derrotado,
            debuffs: this.debuffs.map(d => d.tipo),
            selecionado: this.selecionado,
            marcado: this.marcado,
            posicao: this.posicao,
            escala: this.escala,
            modelo: this.modelo
        };
    }
}

/**
 * Cria instâncias de inimigos a partir de uma lista de IDs
 */
export function criarGrupoInimigos(enemyData, inimigosConfig) {
    return inimigosConfig.map((config, index) => {
        const template = enemyData.find(e => e.id === config.id);
        if (!template) {
            console.error(`Inimigo não encontrado: ${config.id}`);
            return null;
        }

        const enemy = new Enemy(template, `${config.id}_${index}`);

        // Posição customizada se fornecida
        if (config.posicao) {
            enemy.posicao = config.posicao;
        } else {
            // Posição padrão em arco na frente do jogador
            const angulo = (index - (inimigosConfig.length - 1) / 2) * 0.5;
            enemy.posicao = {
                x: Math.sin(angulo) * 2,
                y: 0,
                z: -3 - Math.abs(angulo)
            };
        }

        return enemy;
    }).filter(e => e !== null);
}
