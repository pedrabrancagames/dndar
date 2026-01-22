/**
 * Turn Manager
 * Gerencia a ordem e fluxo de turnos no combate
 */
export class TurnManager {
    constructor() {
        this.round = 0;
        this.turnoAtual = 0;
        this.ordemTurnos = []; // Array de IDs na ordem de turno
        this.fase = 'herois'; // 'herois' ou 'inimigos'
        this.heroiAtivo = null;
        this.callbacks = {};
    }

    /**
     * Registra callbacks para eventos de turno
     */
    on(evento, callback) {
        this.callbacks[evento] = callback;
    }

    /**
     * Dispara um callback se registrado
     */
    emit(evento, data) {
        if (this.callbacks[evento]) {
            this.callbacks[evento](data);
        }
    }

    /**
     * Inicializa um novo combate
     */
    iniciarCombate(herois, inimigos) {
        this.round = 1;
        this.turnoAtual = 0;
        this.fase = 'herois';

        // Ordem fixa: Guerreiro, Mago, Ladino, Clérigo
        this.ordemTurnos = herois.map(h => h.id);

        // Definir primeiro herói ativo
        this.heroiAtivo = this.ordemTurnos[0];

        // Restaurar PA de todos os heróis
        herois.forEach(h => h.restaurarPA());

        this.emit('combateIniciado', { round: this.round, heroiAtivo: this.heroiAtivo });
        this.emit('turnoIniciado', {
            fase: this.fase,
            heroiId: this.heroiAtivo,
            round: this.round
        });

        console.log(`[TurnManager] Combate iniciado - Round ${this.round}`);
    }

    /**
     * Finaliza o turno do herói atual e passa para o próximo
     */
    finalizarTurno(herois) {
        this.turnoAtual++;

        // Verificar se ainda há heróis para jogar nesta fase
        if (this.turnoAtual < this.ordemTurnos.length) {
            // Próximo herói
            this.heroiAtivo = this.ordemTurnos[this.turnoAtual];

            // Encontrar o herói e verificar se pode ter turno
            const heroi = herois.find(h => h.id === this.heroiAtivo);

            if (heroi && !heroi.podeTerTurno()) {
                // Pular turno deste herói
                console.log(`[TurnManager] ${heroi.nome} não pode ter turno - pulando`);
                this.emit('turnoPulado', {
                    heroiId: this.heroiAtivo,
                    motivo: heroi.incapacitado ? 'incapacitado' : 'status'
                });

                // Recursivamente tentar próximo turno
                return this.finalizarTurno(herois);
            }

            // Restaurar PA do herói
            if (heroi) {
                // Processar status de início de turno
                const statusResults = heroi.processarStatusTurno();
                if (statusResults.length > 0) {
                    this.emit('statusProcessado', { heroiId: this.heroiAtivo, resultados: statusResults });
                }

                heroi.restaurarPA();
            }

            this.emit('turnoIniciado', {
                fase: this.fase,
                heroiId: this.heroiAtivo,
                round: this.round
            });

            return { fase: 'herois', heroiAtivo: this.heroiAtivo };
        }

        // Todos os heróis jogaram - passar para fase de inimigos
        return this.iniciarFaseInimigos();
    }

    /**
     * Inicia a fase de turnos dos inimigos
     */
    iniciarFaseInimigos() {
        this.fase = 'inimigos';
        this.heroiAtivo = null;

        this.emit('faseInimigosIniciada', { round: this.round });

        return { fase: 'inimigos' };
    }

    /**
     * Finaliza a fase de inimigos e inicia novo round
     */
    finalizarFaseInimigos(herois) {
        // Verificar condição de fim de combate antes de novo round
        const heroiosVivos = herois.filter(h => !h.incapacitado);
        if (heroiosVivos.length === 0) {
            this.emit('combateFinalizado', { resultado: 'derrota' });
            return { fimCombate: true, resultado: 'derrota' };
        }

        // Novo round
        this.round++;
        this.turnoAtual = 0;
        this.fase = 'herois';
        this.heroiAtivo = this.ordemTurnos[0];

        // Encontrar primeiro herói que pode jogar
        const primeiroHeroi = herois.find(h => h.id === this.heroiAtivo);
        if (primeiroHeroi && !primeiroHeroi.podeTerTurno()) {
            // Buscar próximo herói válido
            return this.finalizarTurno(herois);
        }

        // Processar status e restaurar PA
        if (primeiroHeroi) {
            const statusResults = primeiroHeroi.processarStatusTurno();
            if (statusResults.length > 0) {
                this.emit('statusProcessado', { heroiId: this.heroiAtivo, resultados: statusResults });
            }
            primeiroHeroi.restaurarPA();
        }

        this.emit('novoRound', { round: this.round });
        this.emit('turnoIniciado', {
            fase: this.fase,
            heroiId: this.heroiAtivo,
            round: this.round
        });

        console.log(`[TurnManager] Novo round: ${this.round}`);

        return { fase: 'herois', heroiAtivo: this.heroiAtivo, round: this.round };
    }

    /**
     * Processa os turnos de todos os inimigos
     */
    processarTurnosInimigos(inimigos, herois) {
        const resultados = [];

        for (const inimigo of inimigos) {
            if (inimigo.derrotado) continue;

            // Processar status do inimigo
            const statusResults = inimigo.processarStatusTurno();
            if (statusResults.length > 0) {
                resultados.push({
                    tipo: 'status',
                    inimigo: inimigo.nome,
                    resultados: statusResults
                });

                // Verificar se morreu por status
                if (inimigo.derrotado) {
                    resultados.push({
                        tipo: 'derrotado_status',
                        inimigo: inimigo.nome
                    });
                    continue;
                }
            }

            // Executar turno
            const resultado = inimigo.executarTurno(herois);
            resultado.inimigo = inimigo.nome;
            resultados.push(resultado);
        }

        this.emit('turnosInimigosProcessados', { resultados });

        return resultados;
    }

    /**
     * Obtém o estado atual do sistema de turnos
     */
    getEstado() {
        return {
            round: this.round,
            turnoAtual: this.turnoAtual,
            fase: this.fase,
            heroiAtivo: this.heroiAtivo,
            ordemTurnos: this.ordemTurnos
        };
    }

    /**
     * Obtém dados para exibição no HUD
     */
    getHUDData(herois) {
        const heroi = herois.find(h => h.id === this.heroiAtivo);

        return {
            round: this.round,
            fase: this.fase,
            heroiAtivoId: this.heroiAtivo,
            heroiAtivoNome: heroi?.nome || '',
            heroiAtivoIcon: heroi?.icon || ''
        };
    }

    /**
     * Reseta o estado do sistema de turnos
     */
    resetar() {
        this.round = 0;
        this.turnoAtual = 0;
        this.ordemTurnos = [];
        this.fase = 'herois';
        this.heroiAtivo = null;
    }
}
