/**
 * Campaign Manager
 * Gerencia a progressão da campanha e missões
 */
export class CampaignManager {
    constructor() {
        this.campaignData = null;
        this.missaoAtual = null;
    }

    /**
     * Carrega dados da campanha
     */
    async carregarCampanha() {
        try {
            const response = await fetch('/data/campaign.json');
            this.campaignData = await response.json();
            console.log('[CampaignManager] Campanha carregada');
            return true;
        } catch (error) {
            console.error('[CampaignManager] Erro ao carregar campanha:', error);
            return false;
        }
    }

    /**
     * Obtém dados de um capítulo
     */
    getCapitulo(numero) {
        return this.campaignData?.[`capitulo${numero}`] || null;
    }

    /**
     * Obtém dados de uma missão
     */
    getMissao(capitulo, missao) {
        const cap = this.getCapitulo(capitulo);
        if (!cap) return null;

        return cap.missoes.find(m => m.id === missao) || null;
    }

    /**
     * Obtém a missão atual baseada no save
     */
    getMissaoAtual(saveData) {
        const { capituloAtual, missaoAtual } = saveData.campanha;
        return this.getMissao(capituloAtual, missaoAtual);
    }

    /**
     * Define a missão que será jogada
     */
    setMissaoAtual(missao) {
        this.missaoAtual = missao;
    }

    /**
     * Obtém configuração de inimigos para a missão atual
     */
    getInimigosParaCombate() {
        if (!this.missaoAtual) return [];
        return this.missaoAtual.inimigos || [];
    }

    /**
     * Verifica se a missão é boss
     */
    isBossFight() {
        return this.missaoAtual?.boss === true;
    }

    /**
     * Obtém recompensas da missão
     */
    getRecompensas() {
        return this.missaoAtual?.recompensas || { xp: 0, ouro: 0 };
    }

    /**
     * Obtém diálogo de vitória
     */
    getDialogoVitoria() {
        return this.missaoAtual?.dialogoVitoria || 'Vitória!';
    }

    /**
     * Obtém diálogo de derrota
     */
    getDialogoDerrota() {
        return this.missaoAtual?.dialogoDerrota || 'Derrota...';
    }

    /**
     * Obtém briefing da missão
     */
    getBriefing() {
        return this.missaoAtual?.briefing || '';
    }

    /**
     * Obtém lista de missões disponíveis para seleção
     */
    getMissoesDisponiveis(saveData) {
        const capitulo = this.getCapitulo(saveData.campanha.capituloAtual);
        if (!capitulo) return [];

        return capitulo.missoes.map(missao => {
            const missaoId = `${saveData.campanha.capituloAtual}-${missao.id}`;
            const completa = saveData.campanha.missoesCompletas.includes(missaoId);
            const disponivel = missao.id <= saveData.campanha.missaoAtual;

            return {
                ...missao,
                completa,
                disponivel,
                capituloId: saveData.campanha.capituloAtual
            };
        });
    }

    /**
     * Obtém progresso do capítulo
     */
    getProgressoCapitulo(saveData) {
        const capitulo = this.getCapitulo(saveData.campanha.capituloAtual);
        if (!capitulo) return { completas: 0, total: 0, percent: 0 };

        const total = capitulo.missoes.length;
        const completas = capitulo.missoes.filter(m => {
            const missaoId = `${saveData.campanha.capituloAtual}-${m.id}`;
            return saveData.campanha.missoesCompletas.includes(missaoId);
        }).length;

        return {
            completas,
            total,
            percent: Math.round((completas / total) * 100)
        };
    }

    /**
     * Verifica se o capítulo está completo
     */
    isCapituloCompleto(saveData) {
        const progresso = this.getProgressoCapitulo(saveData);
        return progresso.completas === progresso.total;
    }
}
