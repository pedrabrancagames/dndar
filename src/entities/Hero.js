/**
 * Hero Entity Class
 * Representa um herói jogável com stats, deck e status
 */
export class Hero {
  constructor(data) {
    this.id = data.id;
    this.nome = data.nome;
    this.classe = data.classe;
    this.icon = data.icon;
    this.descricao = data.descricao;
    
    // Stats
    this.pvMax = data.stats.pvMax;
    this.pv = data.stats.pv;
    this.paMax = data.stats.paMax;
    this.pa = data.stats.pa;
    this.defesa = data.stats.defesa;
    this.ataque = data.stats.ataque;
    
    // Deck
    this.deckIds = data.deckIds || [];
    this.deck = []; // Será preenchido pelo CardSystem
    this.mao = []; // Cartas na mão atual
    
    // Status
    this.status = [];
    this.buffs = [];
    this.debuffs = [];
    this.escudoTemp = 0;
    this.incapacitado = false;
    
    // Estatísticas de combate
    this.danoTotal = 0;
    this.curaTotal = 0;
  }
  
  /**
   * Verifica se o herói pode usar uma carta
   */
  podeUsarCarta(carta) {
    if (this.incapacitado) return false;
    if (this.pa < carta.custoPA) return false;
    return true;
  }
  
  /**
   * Consome PA ao usar uma carta
   */
  gastarPA(quantidade) {
    this.pa = Math.max(0, this.pa - quantidade);
  }
  
  /**
   * Restaura PA no início do turno
   */
  restaurarPA() {
    this.pa = this.paMax;
  }
  
  /**
   * Recebe dano (considerando defesa e escudo)
   */
  receberDano(dano) {
    // Verificar evasão
    const evasao = this.buffs.find(b => b.tipo === 'evasao');
    if (evasao) {
      this.removerBuff('evasao');
      return { evadido: true, dano: 0 };
    }
    
    // Calcular dano reduzido pela defesa
    const defesaTotal = this.defesa + this.getBuffValor('defesa');
    let danoFinal = Math.max(1, dano - defesaTotal);
    
    // Absorver com escudo temporário primeiro
    if (this.escudoTemp > 0) {
      if (this.escudoTemp >= danoFinal) {
        this.escudoTemp -= danoFinal;
        return { absorvido: true, dano: 0, escudoRestante: this.escudoTemp };
      } else {
        danoFinal -= this.escudoTemp;
        this.escudoTemp = 0;
      }
    }
    
    // Aplicar dano aos PV
    this.pv = Math.max(0, this.pv - danoFinal);
    
    // Verificar incapacitação
    if (this.pv <= 0) {
      this.incapacitado = true;
    }
    
    return { dano: danoFinal, pvAtual: this.pv, incapacitado: this.incapacitado };
  }
  
  /**
   * Recebe cura
   */
  receberCura(quantidade) {
    if (this.incapacitado) return { curado: false };
    
    const pvAntes = this.pv;
    this.pv = Math.min(this.pvMax, this.pv + quantidade);
    const curaReal = this.pv - pvAntes;
    this.curaTotal += curaReal;
    
    return { curado: true, cura: curaReal, pvAtual: this.pv };
  }
  
  /**
   * Revive o herói (desincapacita)
   */
  reviver(pvPercent = 30) {
    if (!this.incapacitado) return false;
    
    this.incapacitado = false;
    this.pv = Math.floor(this.pvMax * (pvPercent / 100));
    this.status = [];
    this.debuffs = [];
    
    return true;
  }
  
  /**
   * Adiciona um buff
   */
  adicionarBuff(buff) {
    // Verificar se já tem o mesmo tipo
    const existente = this.buffs.findIndex(b => b.tipo === buff.tipo);
    if (existente >= 0) {
      // Atualizar duração se maior
      if (buff.duracao > this.buffs[existente].duracao) {
        this.buffs[existente].duracao = buff.duracao;
      }
    } else {
      this.buffs.push({ ...buff });
    }
  }
  
  /**
   * Adiciona um debuff
   */
  adicionarDebuff(debuff) {
    const existente = this.debuffs.findIndex(d => d.tipo === debuff.tipo);
    if (existente >= 0) {
      if (debuff.duracao > this.debuffs[existente].duracao) {
        this.debuffs[existente].duracao = debuff.duracao;
      }
    } else {
      this.debuffs.push({ ...debuff });
    }
  }
  
  /**
   * Remove um buff específico
   */
  removerBuff(tipo) {
    this.buffs = this.buffs.filter(b => b.tipo !== tipo);
  }
  
  /**
   * Remove todos os debuffs
   */
  limparDebuffs() {
    this.debuffs = [];
  }
  
  /**
   * Obtém valor total de um tipo de buff
   */
  getBuffValor(tipo) {
    const buff = this.buffs.find(b => b.tipo === tipo);
    return buff ? buff.valor : 0;
  }
  
  /**
   * Processa efeitos de status no início do turno
   */
  processarStatusTurno() {
    const resultados = [];
    
    // Processar debuffs com dano
    for (const debuff of this.debuffs) {
      if (debuff.dano) {
        const resultado = this.receberDano(debuff.dano);
        resultados.push({
          tipo: debuff.tipo,
          dano: resultado.dano
        });
      }
    }
    
    // Reduzir duração de buffs e debuffs
    this.buffs = this.buffs.filter(b => {
      b.duracao--;
      return b.duracao > 0;
    });
    
    this.debuffs = this.debuffs.filter(d => {
      d.duracao--;
      return d.duracao > 0;
    });
    
    return resultados;
  }
  
  /**
   * Verifica se está congelado/paralisado (perde turno)
   */
  podeTerTurno() {
    if (this.incapacitado) return false;
    
    const congelado = this.debuffs.find(d => d.tipo === 'congelado');
    const paralisado = this.debuffs.find(d => d.tipo === 'paralisado');
    
    if (congelado || paralisado) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Retorna dados para renderização no HUD
   */
  getHUDData() {
    return {
      id: this.id,
      nome: this.nome,
      icon: this.icon,
      pv: this.pv,
      pvMax: this.pvMax,
      pvPercent: (this.pv / this.pvMax) * 100,
      pa: this.pa,
      paMax: this.paMax,
      paPercent: (this.pa / this.paMax) * 100,
      incapacitado: this.incapacitado,
      buffs: this.buffs.map(b => b.tipo),
      debuffs: this.debuffs.map(d => d.tipo),
      temEscudo: this.escudoTemp > 0
    };
  }
  
  /**
   * Serializa para salvamento
   */
  serialize() {
    return {
      id: this.id,
      pv: this.pv,
      pa: this.pa,
      escudoTemp: this.escudoTemp,
      incapacitado: this.incapacitado,
      buffs: this.buffs,
      debuffs: this.debuffs,
      danoTotal: this.danoTotal,
      curaTotal: this.curaTotal
    };
  }
  
  /**
   * Restaura estado de salvamento
   */
  deserialize(data) {
    this.pv = data.pv;
    this.pa = data.pa;
    this.escudoTemp = data.escudoTemp;
    this.incapacitado = data.incapacitado;
    this.buffs = data.buffs || [];
    this.debuffs = data.debuffs || [];
    this.danoTotal = data.danoTotal || 0;
    this.curaTotal = data.curaTotal || 0;
  }
}
