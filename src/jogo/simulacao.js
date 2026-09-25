import { PERSONALIZACAO_PADRAO, validarPersonalizacao } from './personalizacao.js';
import { PAREDES_LOJA, MOBILIARIO_LOJA, MOBILIARIO_CALCADA, PAREDES_ESCRITORIO, PORTA_ESCRITORIO } from './bairro.js';
import { CONFIG, PRODUTOS, MELHORIAS, MISSOES } from './configuracao.js';
import { buscarCaminho } from './navegacao.js';
import { APARENCIAS_CLIENTES } from './aparencias-clientes.js';

export const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

// Mede a distância à borda do objeto, permitindo interagir por qualquer lado.
function pertoEstacao(ator, centro, largura, profundidade) {
  return Math.hypot(
    Math.max(0, Math.abs(ator.x - centro.x) - largura / 2),
    Math.max(0, Math.abs(ator.z - centro.z) - profundidade / 2)
  ) < CONFIG.raioInteracao;
}

export function estadoInicial() {
  return {
    versao: CONFIG.versaoSalvamento, dinheiro: CONFIG.dinheiroInicial,
    lojaAberta: true,
    jogador: { ...CONFIG.inicio, inventario: [] },
    personalizacao: { ...PERSONALIZACAO_PADRAO },
    melhorias: Object.fromEntries(MELHORIAS.map(m => [m.id, 0])),
    produtos: Object.fromEntries(Object.entries(PRODUTOS).map(([id, p]) => [id, {
      liberado: p.liberado, horta: p.liberado ? p.capacidadeHorta : 0, prateleira: 0, crescimento: 0
    }])),
    estatisticas: { colhidos: 0, repostos: 0, clientes: 0, faturamento: 0 },
    som: false
  };
}

// O estado persistente contém apenas números, booleanos e listas pequenas.
// Clientes e animações são transitórios; inventário e estoque são preservados.
export function validarEstado(dados) {
  const base = estadoInicial();
  if (!dados || dados.versao !== CONFIG.versaoSalvamento) return base;
  const numero = (v, max = 1e9) => Number.isFinite(v) ? limitar(Math.floor(v), 0, max) : 0;
  base.dinheiro = numero(dados.dinheiro);
  base.lojaAberta = dados.lojaAberta !== false;
  base.personalizacao = validarPersonalizacao(dados.personalizacao);
  for (const m of MELHORIAS) base.melhorias[m.id] = numero(dados.melhorias?.[m.id], m.max);
  for (const [id, p] of Object.entries(PRODUTOS)) {
    const salvo = dados.produtos?.[id];
    const liberado = p.liberado || base.melhorias[id] > 0;
    base.produtos[id] = {
      liberado, horta: liberado ? numero(salvo?.horta ?? p.capacidadeHorta, p.capacidadeHorta) : 0,
      prateleira: liberado ? numero(salvo?.prateleira, p.capacidadePrateleira) : 0, crescimento: 0
    };
  }
  for (const id of Object.keys(base.estatisticas)) base.estatisticas[id] = numero(dados.estatisticas?.[id]);
  base.jogador.inventario = Array.isArray(dados.jogador?.inventario)
    ? dados.jogador.inventario.filter(id => base.produtos[id]?.liberado).slice(0, CONFIG.capacidadeInicial + 4 * base.melhorias.mochila) : [];
  // Retomar em um ponto livre evita que mudanças futuras no mapa prendam o jogador.
  base.som = dados.som === true;
  return base;
}

export class Simulacao {
  constructor(salvo) {
    this.estado = validarEstado(salvo);
    this.clientes = [];
    this.aparenciasDisponiveis = [];
    this.ultimaAparenciaCliente = null;
    this.eventos = [];
    this.reposicoes = new WeakMap();
    this.caminhosClientes = new WeakMap();
    this.tempo = 0;
    this.proximoCliente = 2;
    this.proximaInteracao = 0;
    this.proximaId = 1;
    this.proximaOrdemFila = 1;
    this.proximoLadoEntrada = Math.random() < 0.5 ? 0 : 1;
    this.proximoLadoSaida = Math.random() < 0.5 ? 0 : 1;
    this.aberturaPortaEscritorio = 0;
    this.progressoCaixa = 0;
    this.atividade = '';
    this.pausado = false;
    this.ajudante = { x: -1.8, z: 1, inventario: [], destino: 'horta', produto: 'tomate', temporizador: 0, andando: false };
    this.missaoAnterior = this.missao().indice;
  }
  get capacidade() { return CONFIG.capacidadeInicial + this.estado.melhorias.mochila * 4; }
  get velocidade() { return CONFIG.velocidadeInicial * (1 + this.estado.melhorias.velocidade * 0.2); }
  get nivel() { return 1 + Math.floor(this.estado.estatisticas.clientes / 100); }
  get cestasEmUso() { return this.clientes.filter(c => c.cestaReservada).length; }
  get cestasDisponiveis() { return Math.max(0, CONFIG.quantidadeCestas - this.cestasEmUso); }
  get cestasNoSuporte() { return Math.max(0, CONFIG.quantidadeCestas - this.clientes.filter(c => c.temCesta).length); }
  emitir(tipo, dados = {}) { this.eventos.push({ tipo, ...dados }); }
  consumirEventos() { const eventos = this.eventos; this.eventos = []; return eventos; }
  custoMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    return m ? Math.round(m.custo * Math.pow(m.multiplicador || 1, this.estado.melhorias[id])) : Infinity;
  }
  comprarMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    if (!m) return { sucesso: false, motivo: 'Melhoria desconhecida.' };
    if (this.estado.melhorias[id] >= m.max) return { sucesso: false, motivo: 'Essa melhoria já está completa.' };
    const custo = this.custoMelhoria(id);
    if (this.estado.dinheiro < custo) return { sucesso: false, motivo: 'Você ainda não tem dinheiro suficiente.' };
    this.estado.dinheiro -= custo;
    this.estado.melhorias[id]++;
    if (m.tipo === 'produto') {
      this.estado.produtos[id].liberado = true;
      this.estado.produtos[id].horta = PRODUTOS[id].capacidadeHorta;
    }
    this.emitir('melhoria', { id, texto: m.titulo });
    return { sucesso: true, dinheiro: this.estado.dinheiro };
  }
  missao() {
    const recorrente = MISSOES.find(m => m.intervalo);
    if (recorrente) {
      const valor = this.estado.estatisticas[recorrente.chave] ?? 0;
      return { ...recorrente, indice: 0, valor, alvo: this.nivel * recorrente.intervalo };
    }
    const indice = MISSOES.findIndex(m => (this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) < m.alvo);
    if (indice === -1) return { indice: MISSOES.length, completa: true, titulo: 'O bairro é seu!', texto: 'Continue cuidando da loja e descubra todas as melhorias.', valor: 1, alvo: 1 };
    const m = MISSOES[indice];
    return { ...m, indice, valor: Math.min(m.alvo, this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) };
  }
  obstaculos() {
    const caixas = [
      { x: -6.6, z: -2.8, w: 2.2, d: 3.3 },
      { ...PRODUTOS.tomate.prateleira, w: 2.2, d: 1.7 },
      { ...CONFIG.balcao, w: 2.7, d: 1.35 },
      { ...CONFIG.cestas, w: 0.9, d: 1.25 },
      ...PAREDES_LOJA, ...PAREDES_ESCRITORIO, ...MOBILIARIO_LOJA
    ];
    if (this.estado.produtos.milho.liberado) caixas.push({ x: -6.6, z: 3.4, w: 2.2, d: 3.3 }, { ...PRODUTOS.milho.prateleira, w: 2.2, d: 1.7 });
    if (this.aberturaPortaEscritorio < 0.85) caixas.push(PORTA_ESCRITORIO);
    return caixas;
  }
  obstaculosCliente(ator) {
    const caixas = [...this.obstaculos(), ...MOBILIARIO_CALCADA];
    // O corredor imediatamente atrás da cadeira é reservado ao caixa.
    // Outros atores ainda podem acessá-lo, mas clientes devem passar
    // pela frente ou pelas laterais do atendente.
    if (this.clientes.includes(ator)) caixas.push(CONFIG.areaFuncionarioCaixa);
    return caixas;
  }
  mover(ator, dx, dz, dt, velocidade, colisao = true) {
    const limites = CONFIG.limiteMundo;
    const testar = (x, z) => !colisao || !this.obstaculos().some(o => Math.abs(x - o.x) < o.w / 2 + 0.27 && Math.abs(z - o.z) < o.d / 2 + 0.27);
    const nx = limitar(ator.x + dx * dt * velocidade, limites.minX, limites.maxX);
    if (testar(nx, ator.z)) ator.x = nx;
    const nz = limitar(ator.z + dz * dt * velocidade, limites.minZ, limites.maxZ);
    if (testar(ator.x, nz)) ator.z = nz;
    if (Math.hypot(dx, dz) > 0.05) ator.angulo = Math.atan2(dx, dz);
    ator.andando = Math.hypot(dx, dz) > 0.05;
  }
  caminhar(ator, ponto, dt, velocidade = 2.4) {
    const d = distancia(ator, ponto);
    if (d < velocidade * dt + 0.03) { ator.x = ponto.x; ator.z = ponto.z; ator.andando = false; return true; }
    this.mover(ator, (ponto.x - ator.x) / d, (ponto.z - ator.z) / d, dt, velocidade, false);
    return false;
  }
  caminharCliente(ator, ponto, dt, velocidade = 2.4) {
    ator.andando = false;
    if (distancia(ator, ponto) < 0.025) return true;
    if (!dt) return false;
    const obstaculos = this.obstaculosCliente(ator);
    const livre = (inicio, fim) => {
      const dx = fim.x - inicio.x, dz = fim.z - inicio.z, comprimento = dx * dx + dz * dz;
      if (this.clientes.some(outro => {
        if (outro === ator) return false;
        const emFila = pessoa => pessoa.fase === 'fila';
        // Fora das filas os clientes podem se atravessar, evitando desvios
        // artificiais. Ao chegar ao ponto do caixa, voltam a manter espaço.
        if (!emFila(ator) || !emFila(outro)) return false;
        // Quem estava sobreposto em movimento pode sair sem ficar preso ao parar o outro.
        if (distancia(inicio, outro) < CONFIG.distanciaClientes && distancia(fim, outro) > distancia(inicio, outro)) return false;
        const t = comprimento ? limitar(((outro.x - inicio.x) * dx + (outro.z - inicio.z) * dz) / comprimento, 0, 1) : 0;
        return Math.hypot(inicio.x + t * dx - outro.x, inicio.z + t * dz - outro.z) < CONFIG.distanciaClientes - 1e-6;
      })) return false;
      for (const o of obstaculos) {
        let entrada = 0, saida = 1;
        for (const [pos, delta, centro, metade] of [[inicio.x, dx, o.x, o.w / 2 + 0.3], [inicio.z, dz, o.z, o.d / 2 + 0.3]]) {
          if (Math.abs(delta) < 1e-9) {
            if (Math.abs(pos - centro) >= metade) { entrada = 2; break; }
          } else {
            const a = (centro - metade - pos) / delta, b = (centro + metade - pos) / delta;
            entrada = Math.max(entrada, Math.min(a, b)); saida = Math.min(saida, Math.max(a, b));
          }
        }
        if (entrada <= saida) return false;
      }
      return true;
    };
    let alvo = ponto;
    if (!livre(ator, ponto)) {
      let rota = this.caminhosClientes.get(ator);
      if (!rota || distancia(rota.destino, ponto) > 0.1 || this.tempo >= rota.recalcular) {
        rota = { destino: { ...ponto }, pontos: buscarCaminho(ator, ponto, livre, CONFIG.limiteMundo), recalcular: this.tempo + 0.6 };
        this.caminhosClientes.set(ator, rota);
      }
      while (rota.pontos.length && distancia(ator, rota.pontos[0]) < 0.025) rota.pontos.shift();
      if (!rota.pontos.length) return false;
      alvo = rota.pontos[0];
    } else this.caminhosClientes.delete(ator);
    const d = distancia(ator, alvo), passo = Math.min(d, velocidade * dt);
    const proximo = { x: ator.x + (alvo.x - ator.x) / d * passo, z: ator.z + (alvo.z - ator.z) / d * passo };
    if (!livre(ator, proximo)) return false;
    ator.angulo = Math.atan2(proximo.x - ator.x, proximo.z - ator.z);
    ator.x = proximo.x; ator.z = proximo.z; ator.andando = true;
    return distancia(ator, ponto) < 0.025;
  }
  atualizar(dt, entrada = { x: 0, y: 0 }) {
    if (this.pausado) return;
    dt = limitar(dt, 0, 0.05);
    this.tempo += dt;
    const atoresPorta = [this.estado.jogador, ...this.clientes];
    if (this.estado.melhorias.ajudante) atoresPorta.push(this.ajudante);
    const abrirPorta = atoresPorta.some(ator => distancia(ator, PORTA_ESCRITORIO) < 1.8);
    this.aberturaPortaEscritorio = limitar(this.aberturaPortaEscritorio + (abrirPorta ? 1 : -1) * dt * 2.5, 0, 1);
    const a = CONFIG.anguloCamera;
    this.mover(this.estado.jogador, entrada.x * Math.cos(a) + entrada.y * Math.sin(a), -entrada.x * Math.sin(a) + entrada.y * Math.cos(a), dt, this.velocidade);
    const jogador = this.estado.jogador;
    const estavaNoEscritorio = !!jogador.sentadoEscritorio;
    jogador.sentadoEscritorio = !jogador.andando && distancia(jogador, CONFIG.cadeiraEscritorio) < 0.65;
    jogador.sentadoCaixa = !jogador.sentadoEscritorio && !this.estado.melhorias.caixa && !jogador.andando && distancia(jogador, CONFIG.cadeiraCaixa) < 0.65;
    jogador.sentado = jogador.sentadoEscritorio || jogador.sentadoCaixa;
    if (jogador.sentadoEscritorio) {
      jogador.x = CONFIG.cadeiraEscritorio.x; jogador.z = CONFIG.cadeiraEscritorio.z;
      jogador.angulo = CONFIG.anguloEscritorio;
      this.atividade = 'Usando o computador…';
      if (!estavaNoEscritorio) this.emitir('escritorio');
    } else if (jogador.sentadoCaixa) {
      jogador.x = CONFIG.cadeiraCaixa.x; jogador.z = CONFIG.cadeiraCaixa.z;
      jogador.angulo = CONFIG.anguloCaixa;
    }
    for (const [id, estoque] of Object.entries(this.estado.produtos)) {
      const p = PRODUTOS[id];
      if (estoque.liberado && estoque.horta < p.capacidadeHorta) {
        estoque.crescimento += dt;
        if (estoque.crescimento >= p.tempoCrescimento) { estoque.horta++; estoque.crescimento = 0; }
      }
    }
    this.interagir();
    this.atualizarClientes(dt);
    this.atualizarCaixa(dt);
    if (this.estado.melhorias.ajudante) this.atualizarAjudante(dt);
    const missao = this.missao();
    if (missao.indice > this.missaoAnterior) { this.emitir('missao', { texto: 'Objetivo concluído!' }); this.missaoAnterior = missao.indice; }
  }
  interagir() {
    const jogador = this.estado.jogador;
    this.atividade = jogador.sentadoEscritorio ? 'Usando o computador…' : '';
    for (const [id, p] of Object.entries(PRODUTOS)) {
      const e = this.estado.produtos[id];
      if (!e.liberado) continue;
      if (pertoEstacao(jogador, p.prateleira, 2.45, 1.8)) {
        const indice = jogador.inventario.indexOf(id);
        if (indice >= 0 && e.prateleira < p.capacidadePrateleira) {
          this.atividade = 'Abastecendo a prateleira…';
          if (this.tempo >= this.proximaInteracao) {
            jogador.inventario.splice(indice, 1); e.prateleira++; this.estado.estatisticas.repostos++;
            this.reposicoes.set(jogador, { id, indice, lugar: e.prateleira - 1 });
            this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
            this.emitir('reposicao', { id, ponto: p.prateleira });
          }
        } else if (e.prateleira >= p.capacidadePrateleira && indice >= 0) this.atividade = 'Prateleira cheia';
      }
      if (pertoEstacao(jogador, p.horta, 2.5, 3.6)) {
        if (jogador.inventario.length >= this.capacidade) { this.atividade = 'Inventário cheio · leve os produtos à prateleira'; continue; }
        if (!e.horta) { this.atividade = 'A colheita está crescendo…'; continue; }
        this.atividade = `Colhendo ${p.plural.toLocaleLowerCase('pt-BR')}…`;
        if (this.tempo >= this.proximaInteracao) {
          e.horta--; jogador.inventario.push(id); this.estado.estatisticas.colhidos++;
          this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
          this.emitir('colheita', { id, ponto: p.coleta });
        }
      }
    }
  }
  criarCliente() {
    if (this.cestasDisponiveis <= 0) return false;
    const disponiveis = Object.keys(PRODUTOS).filter(id => this.estado.produtos[id].liberado);
    const inicioProdutos = (this.proximaId - 1) % disponiveis.length;
    const produtosDesejados = Array.from({ length: Math.min(disponiveis.length, CONFIG.capacidadeCestaCliente) }, (_, i) => disponiveis[(inicioProdutos + i) % disponiveis.length]);
    const totalDesejado = 1 + (this.proximaId + 3) % CONFIG.capacidadeCestaCliente;
    const compras = produtosDesejados.slice(0, totalDesejado).map((produto, indice, lista) => ({
      produto,
      desejado: Math.floor(totalDesejado / lista.length) + (indice < totalDesejado % lista.length ? 1 : 0),
      quantidade: 0
    }));
    const produto = compras[0].produto;
    const ordemEntradas = [this.proximoLadoEntrada, 1 - this.proximoLadoEntrada];
    const ladoEntrada = ordemEntradas.find(indice => !this.clientes.some(c => distancia(c, CONFIG.extremosCalcada[indice]) < CONFIG.distanciaClientes));
    if (ladoEntrada === undefined) return false;
    this.proximoLadoEntrada = 1 - ladoEntrada;
    const ladoSaida = this.proximoLadoSaida;
    this.proximoLadoSaida = 1 - this.proximoLadoSaida;
    const pontosOcupados = new Set(this.clientes
      .filter(c => c.produto === produto && !['indoCaixa', 'fila', 'saindo', 'fim'].includes(c.fase))
      .map(c => c.pontoCompra));
    const pontoCompra = PRODUTOS[produto].pontosCompra.findIndex((_, indice) => !pontosOcupados.has(indice));
    if (!this.aparenciasDisponiveis.length) {
      this.aparenciasDisponiveis = Array.from(APARENCIAS_CLIENTES.keys());
      for (let i = this.aparenciasDisponiveis.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.aparenciasDisponiveis[i], this.aparenciasDisponiveis[j]] = [this.aparenciasDisponiveis[j], this.aparenciasDisponiveis[i]];
      }
      const ultimo = this.aparenciasDisponiveis.length - 1;
      if (this.aparenciasDisponiveis[ultimo] === this.ultimaAparenciaCliente) {
        [this.aparenciasDisponiveis[0], this.aparenciasDisponiveis[ultimo]] = [this.aparenciasDisponiveis[ultimo], this.aparenciasDisponiveis[0]];
      }
    }
    const aparencia = this.aparenciasDisponiveis.pop();
    this.ultimaAparenciaCliente = aparencia;
    this.clientes.push({ id: this.proximaId++, ...CONFIG.extremosCalcada[ladoEntrada], produto, quantidade: 0, desejado: compras[0].desejado, compras, compraAtual: 0, itens: [], fase: 'chegando', etapa: 0, espera: 0, aparencia, ladoEntrada, ladoSaida, pontoCompra: Math.max(0, pontoCompra), andando: false, cestaReservada: true, temCesta: false, levaSacolas: false });
    return true;
  }
  normalizarComprasCliente(c) {
    if (!Array.isArray(c.compras) || !c.compras.length) {
      c.compras = [{ produto: c.produto, desejado: c.desejado ?? c.quantidade ?? 1, quantidade: c.quantidade ?? 0 }];
      c.compraAtual = 0;
    }
    c.compraAtual = Math.min(c.compraAtual ?? 0, c.compras.length - 1);
    const compra = c.compras[c.compraAtual];
    c.produto = compra.produto;
    c.desejado = compra.desejado;
    if (!Array.isArray(c.itens)) c.itens = c.compras.flatMap(item => Array(item.quantidade ?? 0).fill(item.produto));
    c.quantidade = c.itens.length;
    return compra;
  }
  escolherPontoCompra(c, produto) {
    const ocupados = new Set(this.clientes
      .filter(outro => outro !== c && outro.produto === produto && !['indoCaixa', 'fila', 'saindo', 'fim'].includes(outro.fase))
      .map(outro => outro.pontoCompra));
    const livre = PRODUTOS[produto].pontosCompra.findIndex((_, indice) => !ocupados.has(indice));
    return Math.max(0, livre);
  }
  concluirCompraAtual(c) {
    if (c.compraAtual + 1 < c.compras.length && c.quantidade < CONFIG.capacidadeCestaCliente) {
      c.compraAtual++;
      const proxima = c.compras[c.compraAtual];
      c.produto = proxima.produto; c.desejado = proxima.desejado;
      c.pontoCompra = this.escolherPontoCompra(c, proxima.produto);
      c.fase = 'chegando'; c.etapa = 2; c.espera = 0; c.esperaSemEstoque = 0;
      return;
    }
    if (c.quantidade > 0) {
      c.fase = 'indoCaixa'; c.etapa = 0; c.ordemFila = this.proximaOrdemFila++;
    } else {
      c.fase = 'saindo'; c.etapa = 0; c.temCesta = false; c.cestaReservada = false;
    }
  }
  portaEntradaDeveAbrir() {
    return this.clientes.some(c => {
      if (c.recusado || !['chegando', 'saindo'].includes(c.fase)) return false;
      if (c.fase === 'chegando' && !this.estado.lojaAberta) return false;
      return distancia(c, CONFIG.portaEntrada) < 2.35;
    });
  }
  atualizarClientes(dt) {
    this.proximoCliente -= dt;
    if (this.proximoCliente <= 0 && this.cestasDisponiveis > 0 && this.criarCliente()) this.proximoCliente = CONFIG.intervaloClientes;
    const fila = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0));
    for (const c of this.clientes) {
      const compra = this.normalizarComprasCliente(c);
      const p = PRODUTOS[c.produto], e = this.estado.produtos[c.produto];
      if (!this.estado.lojaAberta && c.fase === 'chegando' && c.etapa > 0 && c.z >= 6.7) {
        c.fase = 'saindo'; c.etapa = 1; c.temCesta = false; c.cestaReservada = false; c.ladoSaida = c.ladoEntrada; c.recusado = true;
      }
      if (c.fase === 'chegando') {
        if (c.etapa === 0) {
          if (this.caminharCliente(c, CONFIG.entrada, dt)) c.etapa = 1;
          continue;
        }
        if (c.etapa === 1 && c.cestaReservada === true) {
          if (this.caminharCliente(c, CONFIG.pontoCestasCliente, dt)) {
            c.fase = 'pegandoCesta'; c.espera = 0; c.temCesta = true;
            c.acaoCesta = 'pegando'; c.progressoCesta = 0;
            c.angulo = Math.atan2(CONFIG.cestas.x - c.x, CONFIG.cestas.z - c.z);
          }
          continue;
        }
        const destino = p.pontosCompra[c.pontoCompra] ?? p.cliente;
        const chegou = this.caminharCliente(c, destino, dt);
        if (chegou) {
          c.angulo = Math.atan2(p.prateleira.x - c.x, p.prateleira.z - c.z);
          c.fase = 'comprando'; c.espera = 0; c.esperaSemEstoque = 0; c.andando = false;
        }
      } else if (c.fase === 'pegandoCesta') {
        c.andando = false; c.espera += dt;
        c.progressoCesta = Math.min(1, c.espera / CONFIG.tempoAnimacaoCesta);
        if (c.progressoCesta >= 1) {
          c.fase = 'chegando'; c.etapa = 2; c.acaoCesta = null; c.espera = 0;
        }
      } else if (c.fase === 'comprando') {
        c.andando = false; c.espera += dt;
        c.esperaSemEstoque = e.prateleira > 0 ? 0 : (c.esperaSemEstoque ?? 0) + dt;
        if (e.prateleira > 0 && c.quantidade < CONFIG.capacidadeCestaCliente && c.espera > 0.65) {
          e.prateleira--; compra.quantidade++; c.itens.push(c.produto); c.quantidade = c.itens.length; c.espera = 0; c.esperaSemEstoque = 0;
          this.emitir('pegou', { id: c.produto });
        }
        if (compra.quantidade >= compra.desejado || c.quantidade >= CONFIG.capacidadeCestaCliente || c.esperaSemEstoque >= CONFIG.tempoEsperaCliente) this.concluirCompraAtual(c);
      } else if (c.fase === 'indoCaixa') {
        const indice = fila.indexOf(c), x = CONFIG.clienteCaixa.x + indice * CONFIG.espacoClientes;
        if (this.caminharCliente(c, { x, z: CONFIG.clienteCaixa.z }, dt)) c.fase = 'fila';
      } else if (c.fase === 'fila') {
        const indice = Math.max(0, fila.indexOf(c));
        if (this.caminharCliente(c, { x: CONFIG.clienteCaixa.x + indice * CONFIG.espacoClientes, z: CONFIG.clienteCaixa.z }, dt)) { c.andando = false; c.angulo = CONFIG.anguloCaixa + Math.PI; }
      } else if (c.fase === 'saindo') {
        if (c.etapa === 0) {
          if (this.caminharCliente(c, CONFIG.entrada, dt)) c.etapa = 1;
        } else if (this.caminharCliente(c, CONFIG.extremosCalcada[c.ladoSaida ?? 1], dt)) c.fase = 'fim';
      }
    }
    this.clientes = this.clientes.filter(c => c.fase !== 'fim');
  }
  atualizarCaixa(dt) {
    const primeiro = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0))[0];
    const jogadorNoCaixa = this.estado.jogador.sentadoCaixa
      && distancia(this.estado.jogador, CONFIG.cadeiraCaixa) < 0.01;
    const atendendo = this.estado.melhorias.caixa || jogadorNoCaixa;
    if (primeiro?.fase === 'fila' && atendendo && distancia(primeiro, CONFIG.clienteCaixa) < 0.2) {
      this.progressoCaixa += dt;
      if (!this.estado.melhorias.caixa) this.atividade = 'Atendendo no caixa…';
      if (this.progressoCaixa >= CONFIG.tempoCaixa) {
        this.normalizarComprasCliente(primeiro);
        const valor = primeiro.itens.reduce((total, id) => total + PRODUTOS[id].preco, 0);
        this.estado.dinheiro += valor; this.estado.estatisticas.faturamento += valor; this.estado.estatisticas.clientes++;
        primeiro.embalado = true; primeiro.temCesta = false; primeiro.cestaReservada = false; primeiro.levaSacolas = true;
        primeiro.fase = 'saindo'; primeiro.etapa = 0;
        this.progressoCaixa = 0;
        this.emitir('venda', { valor, ponto: CONFIG.caixa });
      }
    } else this.progressoCaixa = 0;
  }
  atualizarAjudante(dt) {
    const a = this.ajudante;
    const p = PRODUTOS[a.produto], e = this.estado.produtos[a.produto];
    a.temporizador -= dt;
    if (a.destino === 'horta') {
      // O corredor entre a horta e a loja permanece livre.
      if (this.caminharCliente(a, p.coleta, dt, 2.8)) {
        if (e.horta && a.inventario.length < 4 && a.temporizador <= 0) {
          e.horta--; a.inventario.push(a.produto); a.temporizador = 0.5;
        }
        if (a.inventario.length >= 4 || (!e.horta && a.inventario.length)) a.destino = 'prateleira';
      }
    } else if (this.caminharCliente(a, p.reposicao, dt, 2.8) && a.temporizador <= 0) {
      if (a.inventario.length && e.prateleira < p.capacidadePrateleira) {
        const indice = a.inventario.length - 1;
        e.prateleira++; a.inventario.pop(); a.temporizador = 0.4;
        this.reposicoes.set(a, { id: a.produto, indice, lugar: e.prateleira - 1 });
      }
      if (!a.inventario.length) {
        a.destino = 'horta';
        const ids = Object.keys(PRODUTOS).filter(id => this.estado.produtos[id].liberado);
        a.produto = ids[(ids.indexOf(a.produto) + 1) % ids.length];
      }
    }
  }
  resumo() {
    return { dinheiro: this.estado.dinheiro, capacidade: this.capacidade, nivel: this.nivel,
      lojaAberta: this.estado.lojaAberta,
      inventario: [...this.estado.jogador.inventario], melhorias: { ...this.estado.melhorias },
      produtos: structuredClone(this.estado.produtos), clientesAtendidos: this.estado.estatisticas.clientes,
      objetivo: this.missao().titulo, pausado: this.pausado };
  }
}
