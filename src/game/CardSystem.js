/**
 * Card System
 * Gerencia o sistema de cartas, deck e efeitos
 */
export class CardSystem {
    constructor() {
        this.cardsData = [];
        this.cardIndex = new Map(); // Cache para busca rápida por ID
    }

    /**
     * Carrega os dados das cartas
     */
    async carregarCartas() {
        try {
            const response = await fetch('/data/cards.json');
            const data = await response.json();
            this.cardsData = data.cards;

            // Criar índice para busca rápida
            this.cardsData.forEach(card => {
                this.cardIndex.set(card.id, card);
            });

            console.log(`[CardSystem] ${this.cardsData.length} cartas carregadas`);
            return true;
        } catch (error) {
            console.error('[CardSystem] Erro ao carregar cartas:', error);
            return false;
        }
    }

    /**
     * Obtém uma carta pelo ID
     */
    getCard(cardId) {
        return this.cardIndex.get(cardId) || null;
    }

    /**
     * Obtém o deck de um herói
     */
    getDeck(deckIds) {
        return deckIds.map(id => this.getCard(id)).filter(c => c !== null);
    }

    /**
     * Obtém cartas de uma classe específica
     */
    getCardsByClass(classe) {
        return this.cardsData.filter(card => card.classe === classe);
    }

    /**
     * Rola dados no formato "XdY" ou "XdY+Z"
     */
    rolarDados(dadosStr) {
        if (!dadosStr) return 0;

        // Parse: "2d6", "3d8+2", "1d4-1"
        const match = dadosStr.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!match) return 0;

        const quantidade = parseInt(match[1]);
        const lados = parseInt(match[2]);
        const modificador = match[3] ? parseInt(match[3]) : 0;

        let total = 0;
        for (let i = 0; i < quantidade; i++) {
            total += Math.floor(Math.random() * lados) + 1;
        }

        return Math.max(0, total + modificador);
    }

    /**
     * Calcula o dano de uma carta
     */
    calcularDano(carta, atacante, alvo) {
        if (!carta.efeitos?.dano) return 0;

        const { base, dados } = carta.efeitos.dano;
        let dano = base || 0;

        // Rolar dados se houver
        if (dados) {
            dano += this.rolarDados(dados);
        }

        // Adicionar bônus de ataque do atacante
        if (atacante.ataque) {
            dano += atacante.ataque;
        }

        // Adicionar bônus de buffs
        if (atacante.getBuffValor) {
            dano += atacante.getBuffValor('ataque');
        }

        // Verificar crítico
        if (carta.efeitos.critico) {
            const { chance, multiplicador } = carta.efeitos.critico;
            if (Math.random() * 100 < chance) {
                dano = Math.floor(dano * multiplicador);
                return { dano, critico: true };
            }
        }

        // Verificar condicional
        if (carta.efeitos.condicional) {
            const { se, bonus } = carta.efeitos.condicional;

            if (se === 'alvo_pv_baixo' && alvo.pv <= alvo.pvMax * 0.3) {
                dano += bonus;
            }

            if (se === 'alvo_marcado' && alvo.marcado) {
                dano += bonus;
            }
        }

        return { dano, critico: false };
    }

    /**
     * Calcula a cura de uma carta
     */
    calcularCura(carta) {
        if (!carta.efeitos?.cura) return 0;

        const { base, dados } = carta.efeitos.cura;
        let cura = base || 0;

        if (dados) {
            cura += this.rolarDados(dados);
        }

        return cura;
    }

    /**
     * Aplica os efeitos de uma carta
     */
    aplicarEfeitos(carta, usuario, alvo, combatContext) {
        const resultados = [];
        const efeitos = carta.efeitos;

        // Dano
        if (efeitos.dano) {
            const { dano, critico } = this.calcularDano(carta, usuario, alvo);
            const resultado = alvo.receberDano(dano);

            resultados.push({
                tipo: 'dano',
                valor: resultado.dano,
                critico,
                alvo: alvo.nome,
                alvoId: alvo.instanceId || alvo.id, // ID para identificar unicamente quem sofreu o dano
                derrotado: resultado.derrotado
            });

            // Registrar dano causado
            if (usuario.danoTotal !== undefined) {
                usuario.danoTotal += resultado.dano;
            }
        }

        // Cura
        if (efeitos.cura) {
            const cura = this.calcularCura(carta);
            const resultado = alvo.receberCura(cura);

            resultados.push({
                tipo: 'cura',
                valor: resultado.cura,
                alvo: alvo.nome
            });
        }

        // Reviver
        if (efeitos.reviver) {
            const sucesso = alvo.reviver(efeitos.reviver.pv_percent);

            resultados.push({
                tipo: 'reviver',
                sucesso,
                alvo: alvo.nome
            });
        }

        // Escudo
        if (efeitos.escudo) {
            alvo.escudoTemp = (alvo.escudoTemp || 0) + efeitos.escudo.valor;

            resultados.push({
                tipo: 'escudo',
                valor: efeitos.escudo.valor,
                alvo: alvo.nome
            });
        }

        // Buff
        if (efeitos.buff) {
            alvo.adicionarBuff({
                tipo: efeitos.buff.tipo,
                valor: efeitos.buff.valor,
                duracao: efeitos.buff.duracao
            });

            resultados.push({
                tipo: 'buff',
                buff: efeitos.buff.tipo,
                valor: efeitos.buff.valor,
                duracao: efeitos.buff.duracao,
                alvo: alvo.nome
            });
        }

        // Status/Debuff
        if (efeitos.status) {
            const debuff = {
                tipo: efeitos.status.tipo,
                duracao: efeitos.status.duracao,
                dano: efeitos.status.dano || 0,
                bonusDano: efeitos.status.bonusDano || 0
            };

            // Provocar inclui referência ao provocador
            if (efeitos.status.tipo === 'provocado') {
                debuff.provocador = usuario.id;
            }

            alvo.adicionarDebuff(debuff);

            resultados.push({
                tipo: 'debuff',
                debuff: efeitos.status.tipo,
                duracao: efeitos.status.duracao,
                alvo: alvo.nome
            });
        }

        // Remover debuffs
        if (efeitos.remover_debuffs) {
            alvo.limparDebuffs();

            resultados.push({
                tipo: 'purificar',
                alvo: alvo.nome
            });
        }

        return resultados;
    }

    /**
     * Verifica se o alvo é válido para a carta
     */
    validarAlvo(carta, usuario, alvo, herois, inimigos) {
        switch (carta.alvo) {
            case 'self':
                return alvo.id === usuario.id;

            case 'heroi':
                return herois.some(h => h.id === alvo.id && !h.incapacitado);

            case 'heroi_incapacitado':
                return herois.some(h => h.id === alvo.id && h.incapacitado);

            case 'inimigo':
                return inimigos.some(e => e.instanceId === alvo.instanceId && !e.derrotado);

            case 'todos_inimigos':
            case 'todos_herois':
                return true; // Não precisa de alvo específico

            case 'objeto':
                return alvo.tipo === 'objeto';

            default:
                return false;
        }
    }

    /**
     * Obtém os alvos válidos para uma carta
     */
    getAlvosPossiveis(carta, usuario, herois, inimigos) {
        switch (carta.alvo) {
            case 'self':
                return [usuario];

            case 'heroi':
                return herois.filter(h => !h.incapacitado);

            case 'heroi_incapacitado':
                return herois.filter(h => h.incapacitado);

            case 'inimigo':
                return inimigos.filter(e => !e.derrotado);

            case 'todos_inimigos':
                return inimigos.filter(e => !e.derrotado);

            case 'todos_herois':
                return herois.filter(h => !h.incapacitado);

            default:
                return [];
        }
    }

    /**
     * Renderiza os dados de uma carta para o HUD
     */
    getCardDisplayData(carta, usuarioPA) {
        return {
            id: carta.id,
            nome: carta.nome,
            classe: carta.classe,
            custoPA: carta.custoPA,
            tipo: carta.tipo,
            alvo: carta.alvo,
            icon: carta.icon,
            descricao: carta.descricao,
            disponivel: usuarioPA >= carta.custoPA,
            efeitos: this.getEfeitosTexto(carta)
        };
    }

    /**
     * Gera texto descritivo dos efeitos
     */
    getEfeitosTexto(carta) {
        const textos = [];
        const e = carta.efeitos;

        if (e.dano) {
            textos.push(`Dano: ${e.dano.dados || e.dano.base}`);
        }

        if (e.cura) {
            textos.push(`Cura: ${e.cura.dados || e.cura.base}`);
        }

        if (e.buff) {
            textos.push(`+${e.buff.valor} ${e.buff.tipo} (${e.buff.duracao} turnos)`);
        }

        if (e.status) {
            textos.push(`${e.status.tipo} (${e.status.duracao} turnos)`);
        }

        if (e.escudo) {
            textos.push(`Escudo: ${e.escudo.valor}`);
        }

        if (e.critico) {
            textos.push(`${e.critico.chance}% chance de crítico`);
        }

        return textos.join(' | ');
    }
}
