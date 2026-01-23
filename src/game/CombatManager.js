/**
 * Combat Manager
 * Gerenciador principal de combate - orquestra todos os sistemas
 */
import { Hero } from '../entities/Hero.js';
import { Enemy, criarGrupoInimigos } from '../entities/Enemy.js';
import { CardSystem } from './CardSystem.js';
import { TurnManager } from './TurnManager.js';

export class CombatManager {
    constructor() {
        this.cardSystem = new CardSystem();
        this.turnManager = new TurnManager();

        this.herois = [];
        this.inimigos = [];
        this.heroesData = [];
        this.enemiesData = [];

        this.emCombate = false;
        this.modoSelecaoAlvo = false;
        this.cartaSelecionada = null;

        this.callbacks = {};

        this.setupTurnManagerCallbacks();
    }

    /**
     * Registra callbacks para eventos
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
     * Configura callbacks do TurnManager
     */
    setupTurnManagerCallbacks() {
        this.turnManager.on('turnoIniciado', (data) => {
            this.emit('turnoIniciado', data);
        });

        this.turnManager.on('novoRound', (data) => {
            this.emit('novoRound', data);
        });

        this.turnManager.on('combateFinalizado', (data) => {
            this.finalizarCombate(data.resultado);
        });

        this.turnManager.on('faseInimigosIniciada', () => {
            this.executarFaseInimigos();
        });

        this.turnManager.on('turnoPulado', (data) => {
            this.emit('turnoPulado', data);
        });

        this.turnManager.on('statusProcessado', (data) => {
            this.emit('statusProcessado', data);
        });
    }

    /**
     * Inicializa o sistema de combate
     */
    async inicializar() {
        try {
            // Carregar dados de cartas
            await this.cardSystem.carregarCartas();

            // Carregar dados de heróis
            const heroesResponse = await fetch('/data/heroes.json');
            const heroesJson = await heroesResponse.json();
            this.heroesData = heroesJson.heroes;

            // Carregar dados de inimigos
            const enemiesResponse = await fetch('/data/enemies.json');
            const enemiesJson = await enemiesResponse.json();
            this.enemiesData = enemiesJson.enemies;

            // Criar heróis
            this.herois = this.heroesData.map(data => {
                const hero = new Hero(data);
                // Carregar deck de cartas
                hero.deck = this.cardSystem.getDeck(hero.deckIds);
                hero.mao = [...hero.deck]; // Por enquanto, toda carta está na mão
                return hero;
            });

            console.log('[CombatManager] Inicializado com sucesso');
            console.log(`[CombatManager] ${this.herois.length} heróis criados`);

            return true;
        } catch (error) {
            console.error('[CombatManager] Erro na inicialização:', error);
            return false;
        }
    }

    /**
     * Inicia um novo combate
     */
    iniciarCombate(configInimigos, forcarReset = false) {
        if (this.emCombate) {
            if (forcarReset) {
                console.log('[CombatManager] Forçando reset do combate anterior');
                this.resetarCombate();
            } else {
                console.warn('[CombatManager] Já existe um combate em andamento');
                return false;
            }
        }

        // Criar inimigos
        this.inimigos = criarGrupoInimigos(this.enemiesData, configInimigos);

        if (this.inimigos.length === 0) {
            console.error('[CombatManager] Nenhum inimigo válido para o combate');
            return false;
        }

        // Resetar estado dos heróis para combate
        this.herois.forEach(h => {
            h.restaurarPA();
            h.buffs = [];
            h.debuffs = [];
            h.escudoTemp = 0;
            // Não resetar PV - mantém do combate anterior ou estado salvo
        });

        this.emCombate = true;
        this.modoSelecaoAlvo = false;
        this.cartaSelecionada = null;

        // Iniciar sistema de turnos
        this.turnManager.iniciarCombate(this.herois, this.inimigos);

        this.emit('combateIniciado', {
            herois: this.herois.map(h => h.getHUDData()),
            inimigos: this.inimigos.map(e => e.getDisplayData()),
            turno: this.turnManager.getHUDData(this.herois)
        });

        console.log(`[CombatManager] Combate iniciado: ${this.inimigos.length} inimigos`);

        return true;
    }

    /**
     * Obtém o herói ativo atual
     */
    getHeroiAtivo() {
        const id = this.turnManager.heroiAtivo;
        return this.herois.find(h => h.id === id);
    }

    /**
     * Seleciona uma carta para usar
     */
    selecionarCarta(cardId) {
        const heroi = this.getHeroiAtivo();
        if (!heroi) return { sucesso: false, erro: 'Nenhum herói ativo' };

        const carta = heroi.mao.find(c => c.id === cardId);
        if (!carta) return { sucesso: false, erro: 'Carta não encontrada' };

        if (!heroi.podeUsarCarta(carta)) {
            return { sucesso: false, erro: 'PA insuficiente' };
        }

        this.cartaSelecionada = carta;

        // Verificar se precisa de alvo
        if (carta.alvo === 'self') {
            // Auto-alvo, executar imediatamente
            return this.usarCarta(heroi);
        }

        if (carta.alvo === 'todos_inimigos' || carta.alvo === 'todos_herois') {
            // Área de efeito, executar imediatamente
            return this.usarCartaAoE(heroi, carta);
        }

        // Precisa selecionar alvo
        this.modoSelecaoAlvo = true;
        const alvos = this.cardSystem.getAlvosPossiveis(carta, heroi, this.herois, this.inimigos);

        this.emit('modoSelecaoAlvo', {
            carta: this.cardSystem.getCardDisplayData(carta, heroi.pa),
            alvos: alvos.map(a => a.instanceId || a.id)
        });

        return { sucesso: true, modoSelecao: true, alvos };
    }

    /**
     * Cancela a seleção de carta
     */
    cancelarSelecao() {
        this.cartaSelecionada = null;
        this.modoSelecaoAlvo = false;

        this.emit('selecaoCancelada');
    }

    /**
     * Seleciona um alvo e usa a carta
     */
    selecionarAlvo(alvoId) {
        if (!this.modoSelecaoAlvo || !this.cartaSelecionada) {
            return { sucesso: false, erro: 'Nenhuma carta selecionada' };
        }

        const heroi = this.getHeroiAtivo();

        // Encontrar alvo
        let alvo = this.herois.find(h => h.id === alvoId);
        if (!alvo) {
            alvo = this.inimigos.find(e => e.instanceId === alvoId);
        }

        if (!alvo) {
            return { sucesso: false, erro: 'Alvo não encontrado' };
        }

        // Validar alvo
        if (!this.cardSystem.validarAlvo(this.cartaSelecionada, heroi, alvo, this.herois, this.inimigos)) {
            return { sucesso: false, erro: 'Alvo inválido' };
        }

        return this.usarCarta(heroi, alvo);
    }

    /**
     * Usa a carta selecionada em um alvo
     */
    usarCarta(usuario, alvo = null) {
        const carta = this.cartaSelecionada;

        // Se não tem alvo e é self, o alvo é o próprio usuário
        if (!alvo && carta.alvo === 'self') {
            alvo = usuario;
        }

        if (!alvo) {
            return { sucesso: false, erro: 'Alvo necessário' };
        }

        // Gastar PA
        usuario.gastarPA(carta.custoPA);

        // Aplicar efeitos
        const resultados = this.cardSystem.aplicarEfeitos(carta, usuario, alvo, {
            herois: this.herois,
            inimigos: this.inimigos
        });

        // Limpar estado de seleção
        this.cartaSelecionada = null;
        this.modoSelecaoAlvo = false;

        // Verificar condição de vitória
        const inimigosVivos = this.inimigos.filter(e => !e.derrotado);
        if (inimigosVivos.length === 0) {
            this.finalizarCombate('vitoria');
            return {
                sucesso: true,
                resultados,
                fimCombate: true,
                resultado: 'vitoria'
            };
        }

        // Emitir evento
        this.emit('cartaUsada', {
            carta: carta.nome,
            cartaData: carta, // Dados completos da carta para efeitos visuais
            usuario: usuario.nome,
            alvo: alvo.nome,
            resultados,
            heroiData: usuario.getHUDData(),
            alvoData: alvo.getDisplayData ? alvo.getDisplayData() : alvo.getHUDData()
        });

        return { sucesso: true, resultados };
    }

    /**
     * Usa uma carta de área de efeito
     */
    usarCartaAoE(usuario, carta) {
        // Gastar PA
        usuario.gastarPA(carta.custoPA);

        const todosResultados = [];
        const alvos = this.cardSystem.getAlvosPossiveis(carta, usuario, this.herois, this.inimigos);

        for (const alvo of alvos) {
            const resultados = this.cardSystem.aplicarEfeitos(carta, usuario, alvo, {
                herois: this.herois,
                inimigos: this.inimigos
            });
            todosResultados.push(...resultados);
        }

        // Limpar estado
        this.cartaSelecionada = null;
        this.modoSelecaoAlvo = false;

        // Verificar condição de vitória
        const inimigosVivos = this.inimigos.filter(e => !e.derrotado);
        if (inimigosVivos.length === 0) {
            this.finalizarCombate('vitoria');
            return {
                sucesso: true,
                resultados: todosResultados,
                fimCombate: true,
                resultado: 'vitoria'
            };
        }

        this.emit('cartaAoE', {
            carta: carta.nome,
            cartaData: carta, // Dados completos da carta para efeitos visuais
            usuario: usuario.nome,
            resultados: todosResultados
        });

        return { sucesso: true, resultados: todosResultados };
    }

    /**
     * Finaliza o turno do herói atual
     */
    finalizarTurno() {
        if (!this.emCombate) return;

        const resultado = this.turnManager.finalizarTurno(this.herois);

        this.emit('turnoFinalizado', {
            proximaFase: resultado.fase,
            heroiAtivo: resultado.heroiAtivo,
            round: resultado.round
        });

        return resultado;
    }

    /**
     * Executa a fase de turnos dos inimigos
     */
    async executarFaseInimigos() {
        const resultados = this.turnManager.processarTurnosInimigos(this.inimigos, this.herois);

        // Emitir cada ataque com delay para animação
        for (const resultado of resultados) {
            this.emit('ataqueInimigo', resultado);

            // Pequeno delay entre ataques (será usado para animações)
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Verificar derrota
        const heroisVivos = this.herois.filter(h => !h.incapacitado);
        if (heroisVivos.length === 0) {
            this.finalizarCombate('derrota');
            return;
        }

        // Iniciar próximo round
        this.turnManager.finalizarFaseInimigos(this.herois);

        // Atualizar HUD
        this.emit('faseInimigosTerminada', {
            herois: this.herois.map(h => h.getHUDData()),
            turno: this.turnManager.getHUDData(this.herois)
        });
    }

    /**
     * Finaliza o combate
     */
    finalizarCombate(resultado) {
        this.emCombate = false;

        const dados = {
            resultado,
            rounds: this.turnManager.round,
            herois: this.herois.map(h => ({
                nome: h.nome,
                pv: h.pv,
                pvMax: h.pvMax,
                incapacitado: h.incapacitado,
                danoTotal: h.danoTotal,
                curaTotal: h.curaTotal
            })),
            inimigos: this.inimigos.map(e => ({
                nome: e.nome,
                derrotado: e.derrotado
            }))
        };

        if (resultado === 'vitoria') {
            // Calcular recompensas
            dados.recompensas = {
                xp: this.inimigos.reduce((sum, e) => sum + e.recompensas.xp, 0),
                cartas: this.inimigos.filter(e => e.recompensas.carta).length > 0
            };
        }

        this.emit('combateFinalizado', dados);
        console.log(`[CombatManager] Combate finalizado: ${resultado}`);
    }

    /**
     * Reseta o combate (força finalização sem emitir eventos)
     */
    resetarCombate() {
        this.emCombate = false;
        this.modoSelecaoAlvo = false;
        this.cartaSelecionada = null;
        this.inimigos = [];
        this.turnManager.resetar();
        console.log('[CombatManager] Combate resetado');
    }

    /**
     * Obtém dados para renderização do HUD
     */
    getEstadoHUD() {
        const heroiAtivo = this.getHeroiAtivo();

        return {
            emCombate: this.emCombate,
            modoSelecaoAlvo: this.modoSelecaoAlvo,
            turno: this.turnManager.getHUDData(this.herois),
            herois: this.herois.map(h => h.getHUDData()),
            inimigos: this.inimigos.map(e => e.getDisplayData()),
            cartas: heroiAtivo ? heroiAtivo.mao.map(c =>
                this.cardSystem.getCardDisplayData(c, heroiAtivo.pa)
            ) : []
        };
    }

    /**
     * Obtém cartas do herói ativo
     */
    getCartasHeroiAtivo() {
        const heroi = this.getHeroiAtivo();
        if (!heroi) return [];

        return heroi.mao.map(c => this.cardSystem.getCardDisplayData(c, heroi.pa));
    }
}
