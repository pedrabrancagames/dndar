import { describe, it, expect, beforeEach } from 'vitest';
import { TurnManager } from '../game/TurnManager.js';

describe('TurnManager', () => {
    let turnManager;
    let mockCombatManager;

    beforeEach(() => {
        // Mock CombatManager dependency (simplificado)
        mockCombatManager = {
            on: () => { },
            emit: () => { }
        };
        turnManager = new TurnManager();
    });

    it('deve inicializar com turno 0 e round 0', () => {
        expect(turnManager.turnoAtual).toBe(0); // Index 0
        expect(turnManager.round).toBe(0);
    });

    it('deve respeitar a ordem dos participantes fornecida', () => {
        // TurnManager apenas usa a ordem do array fornecido (não ordena por iniciativa internamente)
        const participantes = [
            { id: 'p2', iniciativa: 20, nome: 'Rápido', restaurarPA: () => { } },
            { id: 'p3', iniciativa: 15, nome: 'Médio', restaurarPA: () => { } },
            { id: 'p1', iniciativa: 10, nome: 'Lento', restaurarPA: () => { } }
        ];

        turnManager.iniciarCombate(participantes);

        expect(turnManager.ordemTurnos[0]).toBe('p2');
        expect(turnManager.ordemTurnos[1]).toBe('p3');
        expect(turnManager.ordemTurnos[2]).toBe('p1');
    });

    it('deve avançar para o próximo turno', () => {
        const participantes = [
            { id: 'p1', iniciativa: 20, podeTerTurno: () => true, restaurarPA: () => { }, processarStatusTurno: () => [] },
            { id: 'p2', iniciativa: 10, podeTerTurno: () => true, restaurarPA: () => { }, processarStatusTurno: () => [] }
        ];
        turnManager.iniciarCombate(participantes);

        expect(turnManager.heroiAtivo).toBe('p1');

        turnManager.finalizarTurno(participantes);

        expect(turnManager.heroiAtivo).toBe('p2');
    });

    it('deve incrementar round após todos agirem', () => {
        const participantes = [
            { id: 'p1', iniciativa: 20, podeTerTurno: () => true, restaurarPA: () => { }, processarStatusTurno: () => [] },
            { id: 'p2', iniciativa: 10, podeTerTurno: () => true, restaurarPA: () => { }, processarStatusTurno: () => [] }
        ];

        turnManager.iniciarCombate(participantes);
        expect(turnManager.round).toBe(1);

        // Turno p1 -> p2
        turnManager.finalizarTurno(participantes);
        expect(turnManager.heroiAtivo).toBe('p2');

        // Turno p2 -> Fase Inimigos
        const result = turnManager.finalizarTurno(participantes);
        expect(result.fase).toBe('inimigos');

        // Fase Inimigos -> Novo Round (p1)
        turnManager.finalizarFaseInimigos(participantes);

        expect(turnManager.round).toBe(2);
        expect(turnManager.heroiAtivo).toBe('p1');
    });
});
