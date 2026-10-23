import { PERSONALIZACAO_PADRAO, validarPersonalizacao } from './personalizacao.js';
import { PLANTA_EXPANSAO, paredesExpansao, paredesOficinas, folhasPortasExpansao, PRATELEIRAS_IMPORTADOS, oficinasConstruidas, OBSTACULOS_ESTACIONAMENTO, volumesDoces, selecionarCompartimentoDoces, PLANTA_INICIAL, FOLHAS_PORTA_PRODUCAO, volumesHortifruti, selecionarCompartimentoHortifruti, selecionarExpositorPosterior, obstaculosDeposito, volumePortaoDeposito } from './planta.js';
import { PAREDES_LOJA, MOBILIARIO_LOJA, mobiliarioCalcada, volumesPortasEntrada } from './bairro.js';
import { produtosDaLoja, extremosCalcadaDaLoja, CONFIG, PRODUTOS, MELHORIAS, MISSOES, ALA_PRODUCAO, ALA_LEITE, ALA_TRIGO, ALA_PADARIA, ALA_ARTESANAL, OFICINAS } from './configuracao.js';
import { buscarCaminho, segmentoLivre } from './navegacao.js';
import { geometriaEstacao, pontoMaisProximo, distanciaEstacao } from './estacoes.js';
import { APARENCIAS_CLIENTES } from './aparencias-clientes.js';
import { BANCO, estadoBanco, validarBanco, atualizarBanco } from './banco.js';
import { ASSALTO } from './assalto.js';
import { EstacionamentoClientes, pontoPortaCarro, volumeCarro, SAIDA_PEDESTRES } from './estacionamento-clientes.js';
import { Entregas, estadoDeposito, validarDeposito, vagasDeposito, classeProduto, acomodarExcedentes, UNIDADES_PACOTE, volumeCaminhao } from './entregas.js';
import { CLASSES_PRODUTOS, PACOTES_POR_CLASSE } from './classes-produtos.js';
import { PLANTA_CARGA, obstaculosCarga } from './planta.js';

// A fila vira para o fundo após sete lugares, cabendo no salão anterior ao N9.
export function pontoFila(indice) {
  return { x: CONFIG.clienteCaixa.x + Math.min(indice, 6) * CONFIG.espacoClientes,
    z: CONFIG.clienteCaixa.z - Math.max(0, indice - 6) * CONFIG.espacoClientes };
}

export const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const capacidadeExtraAtiva = MELHORIAS.find(m => m.id === 'mochila')?.ativa !== false;
const fertilizanteAtivo = MELHORIAS.find(m => m.id === 'fertilizante')?.ativa !== false;
const velocidadeJogadorAtiva = MELHORIAS.find(m => m.id === 'velocidade')?.ativa !== false;
const ajudanteAtivo = MELHORIAS.find(m => m.id === 'ajudante')?.ativa !== false;
const velocidadeAjudanteAtiva = MELHORIAS.find(m => m.id === 'velocidadeAjudante')?.ativa !== false;
const estadoAjudanteInicial = () => ({
  x: 0.2, z: 1, inventario: [], destino: 'horta', produto: 'tomate', temporizador: 0, andando: false, angulo: 0
});

export function estadoInicial() {
  return {
    versao: CONFIG.versaoSalvamento, versaoLayout: CONFIG.versaoLayout, dinheiro: CONFIG.dinheiroInicial,
    banco: estadoBanco(),
    deposito: estadoDeposito(),
    lojaAberta: true,
    jogador: { ...CONFIG.inicio, inventario: [] },
    personalizacao: { ...PERSONALIZACAO_PADRAO },
    melhorias: Object.fromEntries(MELHORIAS.map(m => [m.id, 0])),
    estagioLoja: 0,
    oficinas: Object.fromEntries(Object.entries(OFICINAS).map(([id, receita]) => [id, {
      ingredientes: Object.fromEntries(Object.keys(receita.ingredientes).map(item => [item, 0])), progresso: 0, produzidos: 0
    }])),
    producao: { progressoOvo: 0, ovosProduzidos: 0, progressoLeite: 0, leitesProduzidos: 0,
      trigoPadaria: 0, farinha: 0, progressoMoagem: 0, progressoForno: 0, paesProduzidos: 0 },
    funcionarios: { ajudante: estadoAjudanteInicial() },
    produtos: Object.fromEntries(Object.entries(PRODUTOS).map(([id, p]) => [id, {
      liberado: p.liberado, horta: p.liberado ? p.capacidadeHorta : 0, prateleira: 0, crescimento: 0, crescimentoMelhorado: false, apresentado: false
    }])),
    melhoriaPendente: null,
    satisfacoesRecentes: [],
    estatisticas: { colhidos: 0, repostos: 0, clientes: 0, faturamento: 0, satisfacao: 0, clientesFelizes: 0, clientesNeutros: 0, clientesIrritados: 0, ovosVendidos: 0, leitesVendidos: 0 },
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
  base.banco = dados.banco ? validarBanco(dados.banco) : { ...estadoBanco(), noCaixa: base.dinheiro };
  base.lojaAberta = dados.lojaAberta !== false;
  base.personalizacao = validarPersonalizacao(dados.personalizacao);
  for (const id of Object.keys(base.estatisticas)) base.estatisticas[id] = numero(dados.estatisticas?.[id]);
  const nivelSalvo = 1 + Math.floor(base.estatisticas.clientes / CONFIG.clientesPorNivel);
  for (const m of MELHORIAS) {
    const liberada = m.ativa !== false && nivelSalvo >= (m.nivelMinimo || 1);
    const compradaAntes = m.nivelMinimoLegado && nivelSalvo >= m.nivelMinimoLegado && dados.melhorias?.[m.id] > 0;
    base.melhorias[m.id] = numero(dados.melhorias?.[m.id], liberada || compradaAntes ? m.max : 0);
  }
  // Migra o formato provisório que guardava cada prateleira em uma melhoria.
  if (nivelSalvo >= 17 && dados.melhorias?.prateleirasImportados === undefined) {
    base.melhorias.prateleirasImportados = numero(
      numero(dados.melhorias?.prateleiraImportados1, 1) + numero(dados.melhorias?.prateleiraImportados2, 1), 2
    );
  }
  // As novas construções dependem de instalações existentes, inclusive ao restaurar.
  for (const m of MELHORIAS.filter(m => m.nivelMinimo >= 10)) {
    if ([m.requisitoMelhoria, ...(m.requisitos || [])].filter(Boolean).some(id => !base.melhorias[id])) base.melhorias[m.id] = 0;
  }
  base.estagioLoja = base.melhorias[ALA_ARTESANAL.id] ? ALA_ARTESANAL.indice
    : base.melhorias[ALA_PADARIA.id] ? ALA_PADARIA.indice
    : base.melhorias[ALA_TRIGO.id] ? ALA_TRIGO.indice
    : base.melhorias[ALA_LEITE.id] ? ALA_LEITE.indice
    : base.melhorias[ALA_PRODUCAO.id] ? ALA_PRODUCAO.indice : 0;
  if (base.melhorias[ALA_PRODUCAO.id]) {
    base.producao.progressoOvo = Number.isFinite(dados.producao?.progressoOvo) ? limitar(dados.producao.progressoOvo, 0, ALA_PRODUCAO.tempoOvo) : 0;
    base.producao.ovosProduzidos = numero(dados.producao?.ovosProduzidos);
  }
  if (base.melhorias[ALA_LEITE.id]) {
    base.producao.progressoLeite = Number.isFinite(dados.producao?.progressoLeite) ? limitar(dados.producao.progressoLeite, 0, ALA_LEITE.tempoLeite) : 0;
    base.producao.leitesProduzidos = numero(dados.producao?.leitesProduzidos);
  }
  if (base.melhorias[ALA_PADARIA.id]) {
    for (const campo of ['trigoPadaria', 'farinha', 'paesProduzidos']) base.producao[campo] = numero(dados.producao?.[campo], campo === 'trigoPadaria' ? ALA_PADARIA.capacidadeTrigo : 1e9);
    for (const [campo, max] of [['progressoMoagem', ALA_PADARIA.tempoMoagem], ['progressoForno', ALA_PADARIA.tempoForno]]) {
      base.producao[campo] = Number.isFinite(dados.producao?.[campo]) ? limitar(dados.producao[campo], 0, max) : 0;
    }
  }
  for (const [id, p] of Object.entries(PRODUTOS)) {
    const salvo = dados.produtos?.[id];
    const liberado = Boolean(p.liberado || base.melhorias[id] > 0
      || (base.melhorias[ALA_PRODUCAO.id] && ALA_PRODUCAO.produtos.includes(id))
      || (base.melhorias[ALA_LEITE.id] && ALA_LEITE.produtos.includes(id))
      || (base.melhorias[ALA_TRIGO.id] && ALA_TRIGO.produtos.includes(id))
      || (base.melhorias[ALA_PADARIA.id] && ALA_PADARIA.produtos.includes(id))
      || (base.melhorias[ALA_ARTESANAL.id] && ALA_ARTESANAL.produtos.includes(id))
      || MELHORIAS.some(m => m.produto === id && base.melhorias[m.id]));
    base.produtos[id] = {
      liberado, horta: liberado ? numero(salvo?.horta ?? (p.origem === 'horta' ? p.capacidadeHorta : 0), p.capacidadeHorta) : 0,
      prateleira: liberado ? numero(salvo?.prateleira, p.capacidadePrateleira) : 0,
      apresentado: liberado && (salvo?.apresentado === true || salvo?.prateleira > 0),
      crescimento: liberado && p.tempoCrescimento && Number.isFinite(salvo?.crescimento) ? limitar(salvo.crescimento, 0, p.tempoCrescimento) : 0,
      crescimentoMelhorado: fertilizanteAtivo && p.origem === 'horta' && nivelSalvo >= 4 && salvo?.crescimentoMelhorado === true
    };
  }
  base.deposito = validarDeposito(dados.deposito, base.produtos);
  for (const [id, p] of Object.entries(PRODUTOS)) {
    if (p.origem === 'importado') base.produtos[id].horta = [...base.deposito.pacotes, ...base.deposito.excedentes].filter(p => p.produto === id).reduce((total, p) => total + p.unidades, 0);
  }
  for (const [id, receita] of Object.entries(OFICINAS)) {
    if (!base.produtos[id].liberado) continue;
    const salvo = dados.oficinas?.[id], oficina = base.oficinas[id];
    for (const ingrediente of Object.keys(receita.ingredientes)) oficina.ingredientes[ingrediente] = numero(salvo?.ingredientes?.[ingrediente], receita.capacidadeEntrada);
    oficina.progresso = Number.isFinite(salvo?.progresso) ? limitar(salvo.progresso, 0, receita.segundos) : 0;
    oficina.produzidos = numero(salvo?.produzidos);
  }
  base.melhorias.fertilizante = Object.values(base.produtos).filter(p => p.crescimentoMelhorado).length;
  if (fertilizanteAtivo && nivelSalvo >= 4 && dados.melhoriaPendente === 'fertilizante' && base.melhorias.fertilizante < MELHORIAS.find(m => m.id === 'fertilizante').max) base.melhoriaPendente = 'fertilizante';
  // Salvamentos anteriores não tinham satisfação. As vendas registradas
  // continuam alimentando o histórico de satisfação desses jogos.
  if (dados.estatisticas?.satisfacao === undefined) {
    base.estatisticas.satisfacao = base.estatisticas.clientes;
    base.estatisticas.clientesFelizes = base.estatisticas.clientes;
  }
  const satisfacoesValidas = Object.keys(CONFIG.valoresReputacao);
  base.satisfacoesRecentes = Array.isArray(dados.satisfacoesRecentes)
    ? dados.satisfacoesRecentes.filter(item => satisfacoesValidas.includes(item)).slice(-CONFIG.tamanhoHistoricoReputacao) : [];
  base.jogador.inventario = Array.isArray(dados.jogador?.inventario)
    ? dados.jogador.inventario.filter(id => base.produtos[id]?.liberado).slice(0, CONFIG.capacidadeInicial + 4 * base.melhorias.logistica + (capacidadeExtraAtiva ? 4 * base.melhorias.mochila : 0)) : [];
  const limitesSalvos = base.melhorias.expansao ? PLANTA_EXPANSAO.limites : CONFIG.limiteMundo;
  if (dados.versaoLayout === CONFIG.versaoLayout && Number.isFinite(dados.jogador?.x) && Number.isFinite(dados.jogador?.z)) {
    base.jogador.x = limitar(dados.jogador.x, limitesSalvos.minX, limitesSalvos.maxX);
    base.jogador.z = limitar(dados.jogador.z, limitesSalvos.minZ, limitesSalvos.maxZ);
  }
  const ajudanteSalvo = dados.funcionarios?.ajudante;
  if (base.melhorias.ajudante && ajudanteSalvo) {
    const produto = base.produtos[ajudanteSalvo.produto]?.liberado ? ajudanteSalvo.produto : 'tomate';
    const limites = limitesSalvos;
    const inicial = base.funcionarios.ajudante;
    base.funcionarios.ajudante = {
      ...inicial,
      x: Number.isFinite(ajudanteSalvo.x) ? limitar(ajudanteSalvo.x, limites.minX, limites.maxX) : inicial.x,
      z: Number.isFinite(ajudanteSalvo.z) ? limitar(ajudanteSalvo.z, limites.minZ, limites.maxZ) : inicial.z,
      produto,
      inventario: Array.isArray(ajudanteSalvo.inventario) ? ajudanteSalvo.inventario.filter(id => id === produto).slice(0, CONFIG.capacidadeAjudante) : [],
      destino: ajudanteSalvo.destino === 'prateleira' ? 'prateleira' : 'horta',
      temporizador: Number.isFinite(ajudanteSalvo.temporizador) ? limitar(ajudanteSalvo.temporizador, 0, 1) : 0,
      angulo: Number.isFinite(ajudanteSalvo.angulo) ? limitar(ajudanteSalvo.angulo, -Math.PI, Math.PI) : 0
    };
    if (!base.funcionarios.ajudante.inventario.length) base.funcionarios.ajudante.destino = 'horta';
    if (dados.versaoLayout !== CONFIG.versaoLayout) Object.assign(base.funcionarios.ajudante, produtosDaLoja(base)[produto].coleta);
  }
  // Retomar em um ponto livre evita que mudanças futuras no mapa prendam o jogador.
  base.som = dados.som === true;
  return base;
}

export class Simulacao {
  constructor(salvo) {
    this.estado = validarEstado(salvo);
    this.clientes = [];
    this.estacionamento = new EstacionamentoClientes();
    this.entregas = new Entregas();
    this.aparenciasDisponiveis = [];
    this.ultimaAparenciaCliente = null;
    this.eventos = [];
    this.reposicoes = new WeakMap();
    this.caminhosClientes = new WeakMap();
    this.trajetosProducao = new WeakMap();
    this.tempo = 0;
    this.proximoCliente = 2;
    this.proximaInteracao = 0;
    this.proximaId = 1;
    this.proximaOrdemFila = 1;
    this.proximoLadoEntrada = Math.random() < 0.5 ? 0 : 1;
    this.proximoLadoSaida = Math.random() < 0.5 ? 0 : 1;
    this.aberturaPortaEntrada = 0;
    this.progressoCaixa = 0;
    this.atividade = '';
    this.pausado = false;
    this.tempoEsperaAssalto = ASSALTO.espera;
    this.assaltosAtivos = true;
    this.temporizadorEntregaAtivo = true;
    this.aleatorio = Math.random;
    this.ajudante = this.estado.funcionarios.ajudante;
    this.liberarPosicao(this.estado.jogador);
    this.liberarPosicao(this.ajudante);
    if (this.estado.banco.assalto && Array.isArray(salvo?.clientesAssalto)) {
      const fases = ['chegando', 'pegandoCesta', 'comprando', 'indoCaixa', 'fila', 'saindo'];
      this.clientes = salvo.clientesAssalto.filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.z)
        && this.produtos[c.produto] && fases.includes(c.fase)).slice(0, 30).map((c, i) => {
        const itens = (Array.isArray(c.itens) ? c.itens : []).filter(id => this.produtos[id]).slice(0, CONFIG.capacidadeCestaCliente);
        const compras = (Array.isArray(c.compras) ? c.compras : []).filter(p => p && this.produtos[p.produto]).map(p => ({
          produto: p.produto, desejado: limitar(Number(p.desejado) || 1, 1, 5), quantidade: limitar(Number(p.quantidade) || 0, 0, 5)
        }));
        return { ...c, id: i + 1, carroId: null, noCarro: false,
          ...(salvo.versaoLayout === CONFIG.versaoLayout ? { x: limitar(c.x, this.limitesClientes.minX, this.limitesClientes.maxX), z: limitar(c.z, this.limitesClientes.minZ, this.limitesClientes.maxZ) } : CONFIG.inicio),
          itens, quantidade: itens.length, compras, compraAtual: 0,
          satisfacao: ['feliz', 'neutro', 'irritado'].includes(c.satisfacao) ? c.satisfacao : null,
          satisfacaoRegistrada: c.satisfacaoRegistrada === true && ['feliz', 'neutro', 'irritado'].includes(c.satisfacao),
          assustado: this.assaltoNaLoja && c.z <= CONFIG.portaEntrada.z, tempoAssusto: 0, andando: false };
      });
      this.proximaId = this.clientes.length + 1;
      this.proximaOrdemFila = Math.max(0, ...this.clientes.map(c => Number(c.ordemFila) || 0)) + 1;
      for (const cliente of this.clientes) this.liberarPosicao(cliente);
    }
    this.missaoAnterior = this.missao().indice;
  }
  get produtos() { return produtosDaLoja(this.estado); }
  get extremosCalcada() { return extremosCalcadaDaLoja(this.estado); }
  get portaProducao() { return this.estado.melhorias.expansao ? PLANTA_EXPANSAO.portaProducao : CONFIG.portaProducao; }
  get limitesMundo() { return this.estado.melhorias.expansao ? PLANTA_EXPANSAO.limites : this.estado.estagioLoja >= ALA_TRIGO.indice ? ALA_TRIGO.limites : this.estado.estagioLoja >= ALA_LEITE.indice ? ALA_LEITE.limites : this.estado.estagioLoja ? ALA_PRODUCAO.limites : CONFIG.limiteMundo; }
  get capacidade() { return CONFIG.capacidadeInicial + 4 * this.estado.melhorias.logistica + (capacidadeExtraAtiva ? this.estado.melhorias.mochila * 4 : 0); }
  get velocidade() { return CONFIG.velocidadeInicial * (1 + 0.15 * this.estado.melhorias.logistica + (velocidadeJogadorAtiva ? this.estado.melhorias.velocidade * 0.2 : 0)); }
  get ajudanteContratado() { return ajudanteAtivo && !!this.estado.melhorias.ajudante; }
  get velocidadeAjudante() { return 2.8 * (1 + 0.3 * this.estado.melhorias.equipeAgil) * (velocidadeAjudanteAtiva && this.estado.melhorias.velocidadeAjudante ? CONFIG.multiplicadorVelocidadeAjudante : 1); }
  get nivel() { return 1 + Math.floor(this.estado.estatisticas.clientes / CONFIG.clientesPorNivel); }
  get progressoClientes() { return this.estado.estatisticas.clientes % CONFIG.clientesPorNivel; }
  get reputacao() {
    const valores = this.estado.satisfacoesRecentes.map(item => CONFIG.valoresReputacao[item]);
    const faltantes = CONFIG.tamanhoHistoricoReputacao - valores.length;
    return Math.round((valores.reduce((total, valor) => total + valor, 0) + faltantes * CONFIG.reputacaoInicial) / CONFIG.tamanhoHistoricoReputacao);
  }
  get faixaReputacao() { return this.reputacao <= 40 ? 'ruim' : this.reputacao <= 60 ? 'media' : 'boa'; }
  aumentarNivelDev() {
    this.estado.estatisticas.clientes = this.nivel * CONFIG.clientesPorNivel;
    this.estado.dinheiro += CONFIG.bonusNivel;
    this.emitir('nivel', { nivel: this.nivel });
    return this.nivel;
  }
  aumentarReputacaoDev() {
    if (this.reputacao >= 100) return 100;
    const alvo = Math.min(100, Math.ceil((this.reputacao + 1) / 10) * 10);
    const tamanho = CONFIG.tamanhoHistoricoReputacao;
    if (alvo >= 50) {
      const felizes = (alvo - 50) / 5;
      this.estado.satisfacoesRecentes = [
        ...Array(tamanho - felizes).fill('neutro'), ...Array(felizes).fill('feliz')
      ];
    } else {
      const neutros = alvo / 5;
      this.estado.satisfacoesRecentes = [
        ...Array(tamanho - neutros).fill('irritado'), ...Array(neutros).fill('neutro')
      ];
    }
    return this.reputacao;
  }
  get intervaloClientes() {
    const r = this.reputacao;
    const pontos = CONFIG.intervaloClientesReputacao;
    for (let i = 1; i < pontos.length; i++) {
      const anterior = pontos[i - 1], atual = pontos[i];
      if (r <= atual.reputacao) {
        return anterior.segundos + (atual.segundos - anterior.segundos) *
          (r - anterior.reputacao) / (atual.reputacao - anterior.reputacao);
      }
    }
    return pontos[pontos.length - 1].segundos;
  }
  get limitePedidoCliente() {
    const { ruim, media, boa } = CONFIG.limitePedidoReputacao;
    return this.reputacao < 45 ? ruim : this.reputacao < 75 || this.estado.estatisticas.clientes < 10 ? media : this.reputacao < 90 ? boa - 1 : boa;
  }
  get cestasEmUso() { return this.clientes.filter(c => c.cestaReservada).length; }
  get totalCestas() { return CONFIG.quantidadeCestas + CONFIG.cestasPorMelhoria * this.estado.melhorias.cestasExtras; }
  get cestasDisponiveis() { return Math.max(0, this.totalCestas - this.cestasEmUso); }
  get cestasNoSuporte() { return Math.max(0, this.totalCestas - this.clientes.filter(c => c.temCesta).length); }
  get clienteEmAtendimento() {
    const primeiro = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0))[0];
    const jogadorNoCaixa = this.estado.jogador.sentadoCaixa && distancia(this.estado.jogador, CONFIG.cadeiraCaixa) < 0.01;
    const caixaAtivo = this.estado.melhorias.caixa || jogadorNoCaixa;
    return primeiro?.fase === 'fila' && caixaAtivo && distancia(primeiro, CONFIG.clienteCaixa) < 0.2 ? primeiro : null;
  }
  emitir(tipo, dados = {}) { this.eventos.push({ tipo, ...dados }); }
  definirTempoEsperaAssalto(segundos) {
    if (![5, 60].includes(segundos)) return false;
    this.tempoEsperaAssalto = segundos;
    return true;
  }
  definirTemporizadorEntregaAtivo(ativo) {
    this.temporizadorEntregaAtivo = ativo !== false;
    return this.temporizadorEntregaAtivo;
  }
  preencherPrateleirasDev() {
    let quantidade = 0;
    for (const [id, estoque] of Object.entries(this.estado.produtos)) {
      if (!estoque.liberado) continue;
      quantidade += Math.max(0, this.produtos[id].capacidadePrateleira - estoque.prateleira);
      estoque.prateleira = this.produtos[id].capacidadePrateleira;
      estoque.apresentado = true;
    }
    for (const id of this.ajudante.inventario) {
      const estoque = this.estado.produtos[id];
      if (estoque && this.produtos[id].origem !== 'importado') estoque.horta = Math.min(this.produtos[id].capacidadeHorta, estoque.horta + 1);
    }
    Object.assign(this.ajudante, estadoAjudanteInicial());
    this.trajetosProducao.delete(this.ajudante);
    this.reposicoes.delete(this.ajudante);
    return quantidade;
  }
  esvaziarPrateleirasDev() {
    let quantidade = 0;
    for (const estoque of Object.values(this.estado.produtos)) {
      quantidade += estoque.prateleira;
      estoque.prateleira = 0;
    }
    this.clientes = [];
    this.estacionamento.carros = [];
    this.caminhosClientes = new WeakMap();
    this.proximoCliente = this.tempo + 2;
    Object.assign(this.ajudante, estadoAjudanteInicial());
    this.trajetosProducao.delete(this.ajudante);
    this.reposicoes.delete(this.ajudante);
    return quantidade;
  }
  definirAssaltosAtivos(ativo) {
    this.assaltosAtivos = ativo;
    if (!ativo) {
      this.estado.banco.tempoRisco = 0;
      this.estado.banco.assalto = null;
      for (const cliente of this.clientes) {
        cliente.assustado = false;
        cliente.tempoAssusto = 0;
      }
    }
  }
  consumirEventos() { const eventos = this.eventos; this.eventos = []; return eventos; }
  solicitarDeposito() {
    const banco = this.estado.banco;
    if (banco.assalto) return { sucesso: false, motivo: 'Aguarde o fim do assalto para chamar o banco.' };
    if (banco.coleta) return { sucesso: false, motivo: 'Já existe uma coleta em andamento.' };
    if (banco.noCaixa < BANCO.limite) return { sucesso: false, motivo: 'O depósito fica disponível a partir de R$ 1.000 no caixa.' };
    banco.coleta = { valor: banco.noCaixa, tempo: -1, retirado: false };
    banco.tempoRisco = 0;
    return { sucesso: true, valor: banco.coleta.valor };
  }
  get assaltoNaLoja() {
    const a = this.estado.banco.assalto;
    return !!a && a.invadiu && !a.encerrado;
  }
  atualizarAssalto(dt) {
    const banco = this.estado.banco;
    if (!this.assaltosAtivos) return;
    if (!banco.assalto) {
      banco.tempoRisco = !banco.coleta && banco.noCaixa >= BANCO.limite ? banco.tempoRisco + dt : 0;
      if (banco.tempoRisco >= this.tempoEsperaAssalto) {
        banco.tempoRisco = 0;
        banco.assalto = { tempo: -1, invadiu: false, roubado: false, encerrado: false, valor: 0 };
        this.emitir('assaltoChegando');
      }
      return;
    }
    const a = banco.assalto;
    if (a.tempo < 0) return; // O carro espera a faixa de trânsito esvaziar.
    a.tempo += dt;
    if (!a.invadiu && a.tempo >= ASSALTO.entrada) {
      a.invadiu = true;
      this.progressoCaixa = 0;
      for (const c of this.clientes) if (!c.noCarro && c.x >= PLANTA_INICIAL.limites.minX && c.z <= CONFIG.portaEntrada.z && c.fase !== 'fim') {
        c.assustado = true; c.andando = false; c.tempoAssusto = this.tempo;
      }
      this.emitir('assaltoIniciado');
    }
    if (!a.roubado && a.tempo >= ASSALTO.retirada) {
      a.valor = banco.noCaixa;
      banco.noCaixa = 0;
      this.estado.dinheiro = Math.max(0, this.estado.dinheiro - a.valor);
      a.roubado = true;
      this.emitir('dinheiroRoubado', { valor: a.valor });
    }
    if (!a.encerrado && a.tempo >= ASSALTO.saida) {
      for (const c of this.clientes.filter(c => c.assustado)) {
        if (c.satisfacaoRegistrada) {
          const contador = { feliz: 'clientesFelizes', neutro: 'clientesNeutros', irritado: 'clientesIrritados' }[c.satisfacao];
          this.estado.estatisticas[contador] = Math.max(0, this.estado.estatisticas[contador] - 1);
          this.estado.estatisticas.satisfacao = Math.max(0, this.estado.estatisticas.satisfacao - CONFIG.pontosSatisfacao[c.satisfacao]);
          c.satisfacaoRegistrada = false;
        }
        this.registrarSatisfacao(c, 'neutro');
        if (!c.embalado) {
          for (const id of c.itens ?? []) {
            const estoque = this.estado.produtos[id];
            estoque.prateleira = Math.min(this.produtos[id].capacidadePrateleira, estoque.prateleira + 1);
          }
          c.itens = []; c.quantidade = 0;
        }
        c.assustado = false; c.temCesta = false; c.cestaReservada = false; c.acaoCesta = null;
        c.fase = 'saindo'; c.etapa = 0; c.recusado = false;
        this.caminhosClientes.delete(c);
      }
      // As avaliações neutras são contabilizadas antes da penalidade do assalto.
      this.estado.satisfacoesRecentes = Array(CONFIG.tamanhoHistoricoReputacao).fill('irritado');
      a.encerrado = true;
      this.emitir('assaltoEncerrado', { valor: a.valor });
    }
    if (a.tempo >= ASSALTO.fim) { banco.assalto = null; this.emitir('assaltoConcluido'); }
  }
  custoMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    return m ? Math.round(m.custo * Math.pow(m.multiplicador || 1, this.estado.melhorias[id])) : Infinity;
  }
  disponibilidadeMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    if (!m) return { disponivel: false, motivo: 'Melhoria desconhecida.' };
    if (m.ativa === false) return { disponivel: false, motivo: 'Essa melhoria estará disponível em breve.' };
    const nivelMinimo = m.nivelMinimo || 1;
    if (this.nivel < nivelMinimo) return { disponivel: false, motivo: `Essa melhoria é liberada no nível ${nivelMinimo}.`, nivelMinimo };
    const requisito = [m.requisitoMelhoria, ...(m.requisitos || [])].filter(Boolean).find(item => !this.estado.melhorias[item]);
    if (requisito) {
      const titulo = MELHORIAS.find(item => item.id === requisito).titulo;
      return { disponivel: false, motivo: `Compre ${titulo} antes de ${m.titulo}.`, requisitoMelhoria: requisito };
    }
    if (id === ALA_PADARIA.id && !this.estado.melhorias.alaProducao) {
      return { disponivel: false, motivo: 'Construa a ala dos ovos antes de abrir a padaria.', requisitoMelhoria: 'alaProducao' };
    }
    if (m.tipo === 'importacao') {
      if (!this.estado.melhorias.expansao) return { disponivel: false, motivo: 'Compre Expansão para receber entregas no pátio exclusivo.', requisitoMelhoria: 'expansao' };
      if (this.estado.deposito.pedidos.length || this.entregas?.caminhao) return { disponivel: false, motivo: 'Aguarde o caminhão concluir a entrega e ir embora antes de fazer outro pedido.' };
      if (vagasDeposito(this.estado.deposito, classeProduto(m.produto)) < 1) return { disponivel: false, motivo: `A classe ${CLASSES_PRODUTOS[classeProduto(m.produto)]?.nome || ''} está cheia: limite de ${PACOTES_POR_CLASSE} pacotes, incluindo pedidos a caminho.` };
    }
    return { disponivel: true };
  }
  comprarMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    if (!m) return { sucesso: false, motivo: 'Melhoria desconhecida.' };
    if (m.tipo === 'importacao') return this.encomendarImportacoes({ [id]: 1 });
    const disponibilidade = this.disponibilidadeMelhoria(id);
    if (!disponibilidade.disponivel) return { sucesso: false, motivo: disponibilidade.motivo };
    if (this.estado.melhorias[id] >= m.max) return { sucesso: false, motivo: 'Essa melhoria já está completa.' };
    if (m.tipo === 'selecaoProduto' && this.estado.melhoriaPendente) return { sucesso: false, motivo: 'Escolha primeiro a horta que receberá o produto.' };
    if (m.tipo === 'selecaoProduto' && !Object.entries(this.estado.produtos).some(([id, p]) => this.produtos[id].origem === 'horta' && p.liberado && !p.crescimentoMelhorado)) return { sucesso: false, motivo: 'Não há uma horta disponível para receber essa melhoria.' };
    const custo = this.custoMelhoria(id);
    if (this.estado.dinheiro < custo) return { sucesso: false, motivo: 'Você ainda não tem dinheiro suficiente.' };
    this.estado.dinheiro -= custo;
    if (m.tipo === 'selecaoProduto') {
      this.estado.melhoriaPendente = id;
      return { sucesso: true, dinheiro: this.estado.dinheiro, selecionarProduto: true };
    }
    if (id === 'expansao') {
      for (const ator of [this.estado.jogador, this.ajudante, ...this.clientes.filter(c => !c.noCarro)]) {
        if (ator.z < PLANTA_INICIAL.limites.minZ && (ator.x < 12.3 || ator.z < -14.3)) ator.z -= PLANTA_EXPANSAO.profundidade;
      }
      this.reposicoes = new WeakMap();
    }
    this.estado.melhorias[id]++;
    if (id === 'expansao') {
      this.emitir('expansao', { texto: 'Expansão pronta! O novo anexo fica atrás da loja e da cozinha. Use a porta de produção para acessá-lo e a nova saída dos fundos para chegar à fazenda.' });
    }
    if (m.tipo === 'expansao') {
      const ala = id === ALA_ARTESANAL.id ? ALA_ARTESANAL : id === ALA_PADARIA.id ? ALA_PADARIA : id === ALA_TRIGO.id ? ALA_TRIGO : id === ALA_LEITE.id ? ALA_LEITE : ALA_PRODUCAO;
      this.estado.estagioLoja = Math.max(this.estado.estagioLoja, ala.indice);
      for (const produto of ala.produtos) {
        this.estado.produtos[produto].liberado = true;
        if (this.produtos[produto].origem === 'horta') this.estado.produtos[produto].horta = this.produtos[produto].capacidadeHorta;
      }
      this.emitir('expansao', { texto: id === ALA_ARTESANAL.id
        ? 'Estufa aberta! Colha morangos ao fundo e abasteça a nova seção do hortifruti junto à parede esquerda.'
        : id === ALA_PADARIA.id
        ? `Padaria aberta! Cada trigo rende ${ALA_PADARIA.paesPorTrigo} pães de R$ ${this.produtos.pao.preco}. Entregue trigo na caixa ao fundo da padaria, junto à parede direita.`
        : id === ALA_TRIGO.id
        ? 'Plantação de trigo pronta! Colha o trigo atrás do milho e abasteça sua seção na banca de hortifruti.'
        : id === ALA_LEITE.id
        ? 'Curral pronto atrás da loja, ao lado do galinheiro! Recolha as garrafas e abasteça o refrigerador junto aos ovos, pela frente.'
        : 'Galinheiro pronto atrás da loja! Saia pela porta dos fundos para coletar ovos e abasteça a estante na parede do fundo, à direita da porta.' });
    }
    if (m.tipo === 'produto') {
      this.estado.produtos[id].liberado = true;
      this.estado.produtos[id].horta = this.produtos[id].capacidadeHorta;
    }
    if (m.tipo === 'construcao') this.estado.produtos[m.produto].liberado = true;
    this.emitir('melhoria', { id, texto: id === ALA_PADARIA.id
      ? `Padaria: cada trigo rende ${ALA_PADARIA.paesPorTrigo} pães de R$ ${this.produtos.pao.preco}.`
      : id === 'milho'
      ? 'Milho liberado! Saia pela porta dos fundos. O novo canteiro fica atrás dos tomates; abasteça sua seção na banca de hortifruti.'
      : m.titulo });
    if (id === 'estacionamento') this.estacionamento.prontoEm = this.tempo + 4;
    for (const ator of [this.estado.jogador, this.ajudante, ...this.clientes.filter(c => !c.noCarro)]) this.liberarPosicao(ator);
    this.caminhosClientes = new WeakMap();
    this.trajetosProducao = new WeakMap();
    return { sucesso: true, dinheiro: this.estado.dinheiro };
  }
  aplicarFertilizante(id) {
    if (this.estado.melhoriaPendente !== 'fertilizante') return { sucesso: false, motivo: 'Compre primeiro o produto de crescimento.' };
    const produto = this.estado.produtos[id];
    if (!produto?.liberado || this.produtos[id]?.origem !== 'horta') return { sucesso: false, motivo: 'Essa horta ainda não está disponível.' };
    if (produto.crescimentoMelhorado) return { sucesso: false, motivo: 'Essa horta já recebeu o produto.' };
    produto.crescimentoMelhorado = true;
    this.estado.melhorias.fertilizante++;
    this.estado.melhoriaPendente = null;
    this.emitir('hortaMelhorada', { id, texto: `${this.produtos[id].nome}: crescimento acelerado!`, ponto: this.produtos[id].horta });
    return { sucesso: true, produto: id };
  }
  missao() {
    const s = this.estado.estatisticas;
    if (!s.clientes) {
      if (s.colhidos < 4) return { indice: 0, titulo: 'Colha seus primeiros tomates', texto: 'Saia pela porta dos fundos e vá à horta atrás da loja. Pegue 4 tomates.', valor: s.colhidos, alvo: 4, destino: 'horta' };
      if (s.repostos < 4) return { indice: 1, titulo: 'Abasteça a banca', texto: 'Leve 4 tomates à banca de madeira junto à parede esquerda da loja. Aproxime-se pelo corredor.', valor: s.repostos, alvo: 4, destino: 'prateleira' };
      return { indice: 2, titulo: 'Faça a primeira venda', texto: 'Sente-se no caixa quando um cliente chegar.', valor: 0, alvo: 1, destino: 'caixa' };
    }
    const recorrente = MISSOES.find(m => m.intervalo);
    if (recorrente) {
      const valor = this.estado.estatisticas[recorrente.chave] ?? 0;
      if (this.nivel >= 18 && !this.estado.melhorias.expansao) {
        return { ...recorrente, indice: 4, valor, alvo: this.nivel * recorrente.intervalo,
          titulo: 'Amplie os fundos da loja', texto: 'No celular, compre Expansão por R$ 10.000 para construir um anexo atrás da loja e da cozinha e recuar a fazenda. Exige a padaria.',
          destino: 'celular', exibir: true };
      }
      if (this.nivel >= 19 && !this.estado.produtos.enlatado.liberado) {
        return { ...recorrente, indice: 4, valor, alvo: this.nivel * recorrente.intervalo,
          titulo: 'Importe os primeiros produtos', texto: 'Com a expansão comprada, peça caixas de 9 enlatados por R$ 270 pelo celular. O caminhão usa o pátio exclusivo à esquerda e entrega no depósito; depois abasteça a gôndola.',
          destino: 'celular', exibir: true };
      }
      if (this.nivel >= 19 && this.estado.produtos.enlatado.liberado && !this.estado.produtos.enlatado.apresentado) {
        const disponivel = this.estado.produtos.enlatado.horta > 0 || this.estado.jogador.inventario.includes('enlatado');
        return { ...recorrente, indice: 4, valor, alvo: this.nivel * recorrente.intervalo,
          titulo: disponivel ? 'Abasteça os enlatados' : 'Aguarde a entrega',
          texto: disponivel ? 'Retire enlatados na estante Enlatados do depósito e leve-os à primeira gôndola. O repositor também pode ajudar.' : 'O caminhão usa o acesso exclusivo à esquerda. Mantenha o mercado aberto para receber as caixas no depósito.',
          destino: disponivel ? this.estado.jogador.inventario.includes('enlatado') ? 'prateleira-enlatado' : 'coleta-enlatado' : 'celular', exibir: true };
      }
      if (this.nivel >= 17 && this.estado.melhorias.prateleirasImportados < PRATELEIRAS_IMPORTADOS.length) {
        return { ...recorrente, indice: 4, valor, alvo: this.nivel * recorrente.intervalo,
          titulo: 'Prepare as prateleiras de importados', texto: 'No celular, compre as duas prateleiras por R$ 1.000 cada. A primeira recebe enlatados importados a partir do nível 19.',
          destino: 'celular', exibir: true };
      }
      if (this.nivel >= 16 && !this.estado.melhorias.estacionamento) {
        return { ...recorrente, indice: 4, valor, alvo: this.nivel * recorrente.intervalo,
          titulo: 'Um lugar para estacionar', texto: 'No celular, construa o estacionamento por R$ 10.000. Ele ocupa o terreno ao lado esquerdo da loja.',
          destino: 'celular', exibir: true };
      }
      const orientacaoOvos = !this.estado.melhorias.alaProducao
        ? { titulo: 'Construa o galinheiro', texto: 'Compre a ala dos ovos pelo celular.', destino: 'celular' }
        : this.estado.produtos.ovos.prateleira < 1
          ? { titulo: 'Abasteça a prateleira de ovos', texto: 'Saia pela porta dos fundos para coletar ovos no galinheiro. Abasteça a estante na parede do fundo, à direita da porta.', destino: this.estado.jogador.inventario.includes('ovos') ? 'prateleiraOvos' : 'ovos', exibir: false }
          : this.ajudanteContratado
            ? { titulo: 'Mantenha a ala funcionando', texto: 'As galinhas produzem ovos automaticamente. Cuide das prateleiras e atenda o bairro.', destino: 'ovos', exibir: false }
            : { titulo: 'Atenda o bairro', texto: 'Os ovos já estão à venda. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoLeite = !this.estado.melhorias.alaLeite
        ? { titulo: 'Construa o curral', texto: 'Compre a ala do leite pelo celular por R$ 800.', destino: 'celular' }
        : this.estado.produtos.leite.prateleira < 1
          ? { titulo: 'Leve leite ao refrigerador', texto: 'Saia pela porta dos fundos para recolher as garrafas no curral. Abasteça pela frente o refrigerador à direita dos ovos.', destino: this.estado.jogador.inventario.includes('leite') ? 'prateleiraLeite' : 'leite' }
          : { titulo: 'Atenda o bairro', texto: 'O leite já está à venda. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoTrigo = !this.estado.melhorias.alaTrigo
        ? { titulo: 'Abra a plantação de trigo', texto: 'Compre a ala do trigo pelo celular por R$ 400.', destino: 'celular' }
        : this.estado.produtos.trigo.prateleira < 1
          ? { titulo: 'Abasteça a prateleira de trigo', texto: 'Colha o trigo entre o galinheiro e o curral e leve-o à nova prateleira.', destino: this.estado.jogador.inventario.includes('trigo') ? 'prateleiraTrigo' : 'trigo' }
          : { titulo: 'Atenda o bairro', texto: 'O trigo já está à venda por R$ 5. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoPadaria = !this.estado.melhorias.alaPadaria
        ? { titulo: 'Abra a padaria', texto: 'Compre a padaria pelo celular por R$ 1.400. Cada trigo rende 3 pães de R$ 10.', destino: 'celular' }
        : this.estado.producao.trigoPadaria === 0 && !this.estado.producao.farinha && !this.estado.produtos.pao.prateleira
          ? { titulo: 'Leve trigo à padaria', texto: 'Colha trigo e entregue na caixa ao fundo da padaria, junto à parede direita. Cada trigo rende 3 pães de R$ 10.', destino: this.estado.jogador.inventario.includes('trigo') ? 'padaria' : 'trigo' }
          : { titulo: 'Pães frescos para o bairro', texto: 'Cada trigo rende 3 pães de R$ 10. Reabasteça a padaria para manter a produção.', destino: 'padaria', exibir: false };
      const orientacoesNivel = {
        2: {
          titulo: 'Seu mercadinho pode crescer',
          texto: 'Abra o celular para contratar um caixa.',
          exibir: !this.estado.melhorias.caixa
        },
        3: {
          titulo: 'Uma nova colheita',
          texto: 'Abra o celular para liberar a horta e a prateleira de milho.',
          exibir: !this.estado.melhorias.milho
        },
        4: orientacaoOvos,
        5: orientacaoLeite,
        6: this.ajudanteContratado
          ? { titulo: 'Atenda o bairro', texto: 'O Repositor cuida das prateleiras. Continue atendendo seus clientes.', destino: 'caixa', exibir: false }
          : { titulo: 'Contrate o Repositor', texto: 'Abra o celular e contrate o Repositor por R$ 900 para abastecer as prateleiras.', destino: 'celular' },
        7: orientacaoTrigo,
        9: orientacaoPadaria,
      };
      let orientacaoNivel = orientacoesNivel[this.nivel] || (this.nivel > 9 ? orientacaoPadaria : this.nivel > 7 ? orientacaoTrigo : {});
      if (this.nivel >= 10) {
        const proxima = MELHORIAS.filter(m => m.nivelMinimo >= 10 && m.nivelMinimo <= this.nivel && !this.estado.melhorias[m.id])
          .sort((a, b) => a.nivelMinimo - b.nivelMinimo)[0];
        const novoProduto = Object.entries(this.produtos).find(([id, p]) => p.nivelMinimo >= 11 && this.estado.produtos[id].liberado && !this.estado.produtos[id].apresentado && !this.estado.produtos[id].prateleira);
        orientacaoNivel = proxima
          ? { titulo: proxima.titulo, texto: `${proxima.descricao} Compre pelo celular por R$ ${proxima.custo.toLocaleString('pt-BR')}.`, destino: 'celular' }
          : { titulo: 'O sabor do bairro', texto: 'Cuide das colheitas, prepare receitas e mantenha as bancas abastecidas. Seu mercadinho chegou à fase artesanal!', destino: 'caixa', exibir: false };
        if (novoProduto) {
          const [id, produto] = novoProduto, receita = OFICINAS[id];
          const carregando = this.estado.jogador.inventario.includes(id);
          const faltante = receita && !this.estado.produtos[id].horta && Object.keys(receita.ingredientes).find(item => this.estado.oficinas[id].ingredientes[item] < receita.ingredientes[item]);
          const temIngrediente = faltante && this.estado.jogador.inventario.includes(faltante);
          orientacaoNivel = {
            titulo: `Primeira banca de ${produto.nome.toLocaleLowerCase('pt-BR')}`,
            texto: receita ? `${MELHORIAS.find(m => m.id === receita.melhoria).descricao}` : `Colete ${produto.plural.toLocaleLowerCase('pt-BR')} e abasteça ${id === 'morango' ? 'a seção do hortifruti junto à parede esquerda' : id === 'mel' ? 'o expositor na frente direita da loja' : 'a banca na ala ao fundo da loja'}. O repositor também pode ajudar.`,
            destino: carregando ? `prateleira-${id}` : faltante && !temIngrediente ? `coleta-${faltante}` : `coleta-${id}`
          };
        }
      }
      return { ...recorrente, ...orientacaoNivel, indice: 4, valor, alvo: this.nivel * recorrente.intervalo, destino: orientacaoNivel.destino ?? (orientacaoNivel.titulo ? 'celular' : 'caixa'), exibir: orientacaoNivel.exibir ?? Boolean(orientacaoNivel.titulo) };
    }
    const indice = MISSOES.findIndex(m => (this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) < m.alvo);
    if (indice === -1) return { indice: MISSOES.length, completa: true, titulo: 'O bairro é seu!', texto: 'Continue cuidando da loja e descubra todas as melhorias.', valor: 1, alvo: 1 };
    const m = MISSOES[indice];
    return { ...m, indice, valor: Math.min(m.alvo, this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) };
  }
  encomendarImportacoes(quantidades) {
    if (!quantidades || typeof quantidades !== 'object' || Array.isArray(quantidades)) return { sucesso: false, motivo: 'Pedido inválido.' };
    let custo = 0;
    const pacotes = [], itens = [];
    for (const [id, quantidade] of Object.entries(quantidades)) {
      const m = MELHORIAS.find(m => m.id === id && m.tipo === 'importacao');
      if (!m || !Number.isInteger(quantidade) || quantidade < 0 || quantidade > PACOTES_POR_CLASSE) return { sucesso: false, motivo: 'Quantidade de caixas inválida.' };
      if (!quantidade) continue;
      const disponibilidade = this.disponibilidadeMelhoria(id);
      if (!disponibilidade.disponivel) return { sucesso: false, motivo: disponibilidade.motivo };
      pacotes.push(...Array(quantidade).fill(m.produto));
      custo += this.custoMelhoria(id) * quantidade; itens.push({ id, quantidade, produto: m.produto });
    }
    if (!pacotes.length) return { sucesso: false, motivo: 'Selecione ao menos uma caixa.' };
    for (const classe of new Set(pacotes.map(classeProduto))) {
      if (pacotes.filter(p => classeProduto(p) === classe).length > vagasDeposito(this.estado.deposito, classe))
        return { sucesso: false, motivo: `Sem espaço para esse pedido na classe ${CLASSES_PRODUTOS[classe].nome}: limite de ${PACOTES_POR_CLASSE} pacotes, incluindo pedidos a caminho.` };
    }
    if (custo > this.estado.dinheiro) return { sucesso: false, motivo: 'Você ainda não tem dinheiro suficiente.' };
    this.estado.dinheiro -= custo;
    for (const item of itens) { this.estado.melhorias[item.id] += item.quantidade; this.estado.produtos[item.produto].liberado = true; }
    const pedido = { id: this.estado.deposito.proximoId++, pacotes };
    this.estado.deposito.pedidos.push(pedido);
    this.emitir('melhoria', { id: 'importarProdutos', texto: 'O caminhão está a caminho!' });
    return { sucesso: true, pedidoId: pedido.id, caixas: pacotes.length, quantidade: pacotes.length * UNIDADES_PACOTE, dinheiro: this.estado.dinheiro };
  }
  retirarProdutoDeposito(id) {
    const pacote = this.estado.deposito.pacotes.find(p => p.produto === id);
    if (!pacote) return false;
    pacote.unidades--; this.estado.produtos[id].horta--;
    if (!pacote.unidades) this.estado.deposito.pacotes.splice(this.estado.deposito.pacotes.indexOf(pacote), 1);
    acomodarExcedentes(this.estado.deposito);
    return true;
  }
  obstaculos() {
    const caixas = [
      { ...CONFIG.balcao, w: 2.9, d: 1.53 },
      { ...CONFIG.cestas, w: 0.9, d: 1.25 },
      ...volumesPortasEntrada(this.aberturaPortaEntrada),
      ...PAREDES_LOJA.filter(p => !p.lateral || this.estado.estagioLoja < ALA_PADARIA.indice), ...MOBILIARIO_LOJA, ...FOLHAS_PORTA_PRODUCAO
    ];
    if (this.estado.melhorias.expansao) caixas.push(...paredesExpansao(), ...folhasPortasExpansao(), ...obstaculosDeposito(), ...obstaculosCarga());
    if (this.estado.melhorias.expansao && !this.estado.lojaAberta) caixas.push(volumePortaoDeposito());
    if (this.estado.melhorias.expansao || oficinasConstruidas(this.estado.produtos)) caixas.push(...paredesOficinas(!!this.estado.melhorias.expansao));
    if (this.estado.melhorias.alaPadaria) caixas.push(...ALA_PADARIA.paredes.filter(p => !this.estado.melhorias.expansao || p.x !== 20.9));
    if (this.estado.melhorias.alaPadaria) caixas.push(
      ALA_PADARIA.entrada, ALA_PADARIA.moinho, ALA_PADARIA.forno, ...ALA_PADARIA.fechamento
    );

    for (const [id, p] of Object.entries(this.produtos)) {
      if (!this.estado.produtos[id].liberado) continue;
      if (!['hortifruti', 'doces'].includes(p.prateleira.movel)) caixas.push(p.prateleira);
      if (id !== 'pao' && p.origem !== 'importado') caixas.push(geometriaEstacao(id, 'coleta', this.produtos));
    }
    caixas.push(...volumesHortifruti(this.estado.produtos), ...volumesDoces(this.estado.produtos));
    caixas.push(...PRATELEIRAS_IMPORTADOS.slice(0, this.estado.melhorias.prateleirasImportados));
    if (this.estado.melhorias.estacionamento) caixas.push(...OBSTACULOS_ESTACIONAMENTO,
      ...this.estacionamento.carros.filter(c => c.fase !== 'aguardando').map(volumeCarro));
    if (this.entregas?.caminhao && this.entregas.caminhao.fase !== 'aguardando') caixas.push(volumeCaminhao(this.entregas.caminhao));
    return caixas;
  }
  get limitesClientes() {
    const limites = this.limitesMundo;
    return { ...limites,
      minX: Math.min(limites.minX, ...this.extremosCalcada.map(p => p.x)),
      maxX: Math.max(limites.maxX, ...this.extremosCalcada.map(p => p.x)),
      // Reserva espaço para o corpo antes do meio-fio, sem entrar na rua.
      maxZ: Math.min(limites.maxZ, CONFIG.entrada.z + 0.45)
    };
  }
  liberarPosicao(ator) {
    const limites = this.clientes.includes(ator) ? this.limitesClientes : this.limitesMundo, obstaculos = this.obstaculos();
    const livre = p => p.x >= limites.minX && p.x <= limites.maxX && p.z >= limites.minZ && p.z <= limites.maxZ &&
      !obstaculos.some(o => Math.abs(p.x - o.x) < o.w / 2 + 0.32 && Math.abs(p.z - o.z) < o.d / 2 + 0.32);
    if (livre(ator)) return;
    for (let raio = 0.4; raio <= 4; raio += 0.4) {
      for (let i = 0; i < 16; i++) {
        const p = { x: ator.x + Math.cos(i * Math.PI / 8) * raio, z: ator.z + Math.sin(i * Math.PI / 8) * raio };
        if (livre(p)) { Object.assign(ator, p); return; }
      }
    }
    Object.assign(ator, CONFIG.inicio);
  }
  obstaculosCliente(ator) {
    const caixas = [...this.obstaculos(), ...mobiliarioCalcada(!!this.estado.melhorias.estacionamento)];
    // O corredor imediatamente atrás da cadeira é reservado ao caixa.
    // Outros atores ainda podem acessá-lo, mas clientes devem passar
    // pela frente ou pelas laterais do atendente.
    if (this.clientes.includes(ator)) caixas.push(CONFIG.areaFuncionarioCaixa);
    return caixas;
  }
  mover(ator, dx, dz, dt, velocidade, colisao = true) {
    const limites = this.limitesMundo;
    const obstaculos = colisao ? this.obstaculos() : [];
    const portas = obstaculos.filter(o => o.portaEntrada);
    const testar = (x, z) => !colisao || (segmentoLivre({ x, z }, { x, z }, obstaculos, 0.27)
      && segmentoLivre(ator, { x, z }, portas, 0.27));
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
  caminharCalcada(ator, ponto, dt) {
    if (this.estado.melhorias.expansao && ator.z >= CONFIG.portaEntrada.z && ponto.z >= CONFIG.portaEntrada.z) {
      const faixa = PLANTA_CARGA.travessia, sentido = Math.sign(ponto.x - ator.x);
      const inicio = faixa.x - sentido * (faixa.w / 2 + 0.5), fim = faixa.x + sentido * (faixa.w / 2 + 0.5);
      if (sentido * (ponto.x - fim) >= 0 && sentido * (fim - ator.x) > 0.025) {
        // Alinha antes de atravessar; desvios de postes adiante não cortam a faixa.
        const x = sentido * (inicio - ator.x) > 0.025 ? inicio : fim;
        this.caminharCliente(ator, { x, z: CONFIG.entrada.z }, dt);
        return false;
      }
    }
    return this.caminharCliente(ator, ponto, dt);
  }
  caminharCliente(ator, ponto, dt, velocidade = 2.4) {
    ator.andando = false;
    if (distancia(ator, ponto) < 0.025) { ator.x = ponto.x; ator.z = ponto.z; return true; }
    if (!dt) return false;
    const obstaculos = this.obstaculosCliente(ator);
    // Planeja a passagem pelo vão que abrirá por proximidade, mas cada passo
    // continua respeitando a posição real das folhas durante a animação.
    const folhasAbertas = volumesPortasEntrada(1);
    const pelaCalcada = ator.z >= CONFIG.portaEntrada.z && ponto.z >= CONFIG.portaEntrada.z;
    // Na calçada é preciso contornar também a posição atual da folha. Esperar
    // que ela abra pode travar ambos: a pessoa impede justamente esse giro.
    // Se já está no espaço que a folha aberta ocuparia, permita sair dele
    // respeitando a geometria real, em vez de prender a origem numa colisão virtual.
    const preverAbertura = segmentoLivre(ator, ator, folhasAbertas, 0.32);
    const obstaculosRota = [...obstaculos.filter(o => !o.portaEntrada),
      ...(preverAbertura ? folhasAbertas : []),
      ...(pelaCalcada || !preverAbertura ? obstaculos.filter(o => o.portaEntrada) : [])];
    const livre = (inicio, fim, planejar = false) => {
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
      return segmentoLivre(inicio, fim, planejar ? obstaculosRota : obstaculos, 0.32);
    };
    const livreRota = (inicio, fim) => livre(inicio, fim, true);
    let alvo = ponto;
    if (!livreRota(ator, ponto)) {
      let rota = this.caminhosClientes.get(ator);
      if (!rota || distancia(rota.destino, ponto) > 0.1 || this.tempo >= rota.recalcular) {
        rota = { destino: { ...ponto }, pontos: buscarCaminho(ator, ponto, livreRota, this.limitesClientes), recalcular: this.tempo + 0.6 };
        this.caminhosClientes.set(ator, rota);
      }
      while (rota.pontos.length && distancia(ator, rota.pontos[0]) < 0.025) {
        Object.assign(ator, rota.pontos.shift());
      }
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
    const deposito = atualizarBanco(this.estado.banco, dt);
    if (deposito !== null) this.emitir('depositoConcluido', { valor: deposito });
    this.atualizarAssalto(dt);
    const a = CONFIG.anguloCamera;
    this.mover(this.estado.jogador, entrada.x * Math.cos(a) + entrada.y * Math.sin(a), -entrada.x * Math.sin(a) + entrada.y * Math.cos(a), dt, this.velocidade);
    const jogador = this.estado.jogador;
    jogador.sentadoCaixa = !this.estado.melhorias.caixa && !jogador.andando && distancia(jogador, CONFIG.cadeiraCaixa) < 0.65;
    jogador.sentado = jogador.sentadoCaixa;
    if (jogador.sentadoCaixa) {
      jogador.x = CONFIG.cadeiraCaixa.x; jogador.z = CONFIG.cadeiraCaixa.z;
      jogador.angulo = CONFIG.anguloCaixa;
    }
    for (const [id, estoque] of Object.entries(this.estado.produtos)) {
      const p = this.produtos[id];
      if (estoque.liberado && p.origem === 'horta' && estoque.horta < p.capacidadeHorta) {
        estoque.crescimento += dt;
        const tempoCrescimento = p.tempoCrescimento * (this.estado.melhorias.irrigacao ? 0.75 : 1) * (estoque.crescimentoMelhorado ? CONFIG.multiplicadorCrescimentoMelhorado : 1);
        if (estoque.crescimento >= tempoCrescimento) { estoque.horta++; estoque.crescimento = 0; }
      }
    }
    this.atualizarProducao(dt);
    this.entregas.atualizar(this, dt);
    this.interagir();
    this.atualizarClientes(dt);
    this.atualizarCaixa(dt);
    if (this.ajudanteContratado) this.atualizarAjudante(dt);
    const missao = this.missao();
    if (missao.indice > this.missaoAnterior) { this.emitir('missao', { texto: `Próximo passo: ${missao.titulo}` }); this.missaoAnterior = missao.indice; }
  }
  pertoDaLixeira() {
    const jogador = this.estado.jogador, objeto = CONFIG.lixeira;
    return distanciaEstacao(jogador, objeto) < CONFIG.raioInteracao &&
      segmentoLivre(jogador, pontoMaisProximo(jogador, objeto), this.obstaculos().filter(o => o !== objeto));
  }
  descartarInventario(id = null) {
    if (!this.pertoDaLixeira()) return { sucesso: false, motivo: 'Aproxime-se da lixeira.' };
    const inventario = this.estado.jogador.inventario;
    const indice = id === null ? -1 : inventario.indexOf(id);
    if (!inventario.length || (id !== null && indice < 0)) return { sucesso: false, motivo: 'Não há esse item no inventário.' };
    const quantidade = id === null ? inventario.length : 1;
    if (id === null) inventario.splice(0);
    else inventario.splice(indice, 1);
    return { sucesso: true, quantidade };
  }
  interagir() {
    const jogador = this.estado.jogador;
    this.atividade = '';
    if (jogador.sentado) return;
    const pertoLixeira = this.pertoDaLixeira();
    if (!pertoLixeira) this.lixeiraVisitada = false;
    const candidatos = [];
    const obstaculos = this.obstaculos();
    const doce = selecionarCompartimentoDoces(jogador, this.estado.produtos);
    const compartimento = selecionarCompartimentoHortifruti(jogador, this.estado.produtos);
    const expositorPosterior = selecionarExpositorPosterior(jogador, this.estado.produtos, this.produtos);
    for (const [id, p] of Object.entries(this.produtos)) {
      if (!this.estado.produtos[id].liberado) continue;
      for (const tipo of id === 'pao' ? ['reposicao'] : ['coleta', 'reposicao']) {
        const objeto = geometriaEstacao(id, tipo, this.produtos), d = distanciaEstacao(jogador, objeto);
        if (d >= CONFIG.raioInteracao) continue;
        // Cada seção tem uma faixa exclusiva na face do corredor. Na divisória,
        // a seção em direção à frente possui a borda; o estoque não muda sozinho.
        const compartilhado = tipo === 'reposicao' && objeto.movel === 'hortifruti';
        const doceCompartilhado = tipo === 'reposicao' && objeto.movel === 'doces';
        if (doceCompartilhado && doce !== id) continue;
        if (compartilhado && compartimento !== id) continue;
        if (tipo === 'reposicao' && objeto.movel === 'parede-frios' && expositorPosterior !== id) continue;
        const outros = obstaculos.filter(o => doceCompartilhado && o.movel === objeto.movel ? false : compartilhado && o.movel === objeto.movel
          ? !(jogador.z >= o.z - o.d / 2 - 1e-8 && jogador.z <= o.z + o.d / 2 + 1e-8)
          : p.origem === 'importado' && tipo === 'reposicao'
            ? o.x !== p.prateleira.x || o.z !== p.prateleira.z || o.w !== p.prateleira.w || o.d !== p.prateleira.d
            : o.x !== objeto.x || o.z !== objeto.z || o.w !== objeto.w || o.d !== objeto.d);
        if (segmentoLivre(jogador, pontoMaisProximo(jogador, objeto), outros)) candidatos.push({ id, tipo, distancia: d });
      }
    }
    candidatos.sort((a, b) => a.distancia - b.distancia);
    const alvo = candidatos[0];
    if (pertoLixeira && (!alvo || distanciaEstacao(jogador, CONFIG.lixeira) < alvo.distancia)) {
      this.atividade = jogador.inventario.length ? 'Lixeira · pare para descartar produtos' : 'Lixeira · inventário vazio';
      if (!jogador.andando && jogador.inventario.length && !this.lixeiraVisitada) {
        this.lixeiraVisitada = true;
        this.emitir('lixeira');
      }
      return;
    }
    // Proteção para novos móveis que venham a ser configurados com alcance ambíguo.
    if (!alvo || (candidatos[1] && candidatos[1].distancia - alvo.distancia < 0.1)) return;
    const { id, tipo } = alvo, p = this.produtos[id], e = this.estado.produtos[id];
    const receita = OFICINAS[id];
    if (tipo === 'coleta' && receita) {
      const oficina = this.estado.oficinas[id];
      const indice = jogador.inventario.findIndex(item => receita.ingredientes[item] && oficina.ingredientes[item] < receita.capacidadeEntrada);
      if (indice >= 0) {
        this.atividade = `Entregando ingredientes · ${receita.nome}`;
        if (this.tempo >= this.proximaInteracao) {
          const [ingrediente] = jogador.inventario.splice(indice, 1);
          oficina.ingredientes[ingrediente]++;
          this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
        }
        return;
      }
    }
    if (id === 'pao') {
      const indice = jogador.inventario.indexOf('trigo');
      if (indice >= 0 && this.estado.producao.trigoPadaria < ALA_PADARIA.capacidadeTrigo) {
        this.atividade = 'Entregando trigo aos padeiros…';
        if (this.tempo >= this.proximaInteracao) {
          jogador.inventario.splice(indice, 1);
          this.estado.producao.trigoPadaria++;
          this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
          this.emitir('trigoPadaria', { ponto: ALA_PADARIA.entrada });
        }
      } else if (indice >= 0) this.atividade = 'Estoque de trigo da padaria cheio';
      return;
    }
      if (tipo === 'reposicao') {
        const indice = jogador.inventario.indexOf(id);
        if (indice >= 0 && e.prateleira < p.capacidadePrateleira) {
          this.atividade = id === 'leite' ? 'Abastecendo o refrigerador…' : 'Abastecendo a prateleira…';
          if (this.tempo >= this.proximaInteracao) {
            jogador.inventario.splice(indice, 1); e.prateleira++; e.apresentado = true; this.estado.estatisticas.repostos++;
            this.reposicoes.set(jogador, { id, indice, lugar: e.prateleira - 1 });
            this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
            this.emitir('reposicao', { id, ponto: p.prateleira });
          }
        } else if (e.prateleira >= p.capacidadePrateleira && indice >= 0) this.atividade = id === 'leite' ? 'Refrigerador cheio' : 'Prateleira cheia';
      }
      if (tipo === 'coleta') {
        if (jogador.inventario.length >= this.capacidade) { this.atividade = 'Inventário cheio · leve os produtos à prateleira'; return; }
        if (!e.horta) { this.atividade = p.origem === 'importado' ? 'Depósito vazio · faça um pedido pelo celular e aguarde a entrega' : OFICINAS[id] ? 'Entregue os ingredientes e aguarde a produção' : id === 'mel' ? 'As abelhas estão produzindo mel…' : 'A colheita está crescendo…'; return; }
        this.atividade = `${p.origem === 'importado' ? 'Retirando' : 'Colhendo'} ${p.plural.toLocaleLowerCase('pt-BR')}…`;
        if (this.tempo >= this.proximaInteracao) {
          if (p.origem === 'importado') { if (!this.retirarProdutoDeposito(id)) return; }
          else e.horta--;
          jogador.inventario.push(id); this.estado.estatisticas.colhidos++;
          this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
          this.emitir('colheita', { id, ponto: p.coleta });
        }
      }
  }
  atualizarProducao(dt) {
    if (!this.estado.estagioLoja) return;
    const mel = this.estado.produtos.mel;
    if (mel.liberado && mel.horta < this.produtos.mel.capacidadeHorta) {
      mel.crescimento += dt;
      while (mel.crescimento >= this.produtos.mel.tempoCrescimento && mel.horta < this.produtos.mel.capacidadeHorta) {
        mel.crescimento -= this.produtos.mel.tempoCrescimento; mel.horta++;
      }
    }
    for (const [id, receita] of Object.entries(OFICINAS)) {
      const estoque = this.estado.produtos[id], oficina = this.estado.oficinas[id];
      if (!estoque.liberado || estoque.horta + receita.rendimento > this.produtos[id].capacidadeHorta) continue;
      const podeProduzir = () => Object.entries(receita.ingredientes).every(([item, quantidade]) => oficina.ingredientes[item] >= quantidade);
      if (!podeProduzir()) continue;
      oficina.progresso += dt;
      while (oficina.progresso >= receita.segundos && podeProduzir() && estoque.horta + receita.rendimento <= this.produtos[id].capacidadeHorta) {
        oficina.progresso -= receita.segundos;
        for (const [item, quantidade] of Object.entries(receita.ingredientes)) oficina.ingredientes[item] -= quantidade;
        estoque.horta += receita.rendimento;
        oficina.produzidos += receita.rendimento;
        if (oficina.produzidos === receita.rendimento) this.emitir('melhoria', { texto: `${this.produtos[id].plural} prontos! Recolha na ${receita.nome.toLocaleLowerCase('pt-BR')} e abasteça a banca.` });
      }
      // Não acumula tempo de produção sem ingredientes ou espaço para outro lote.
      oficina.progresso = Math.min(oficina.progresso, receita.segundos);
    }
    const p = this.estado.producao;
    if (this.estado.melhorias.alaProducao && this.estado.produtos.ovos.horta < this.produtos.ovos.capacidadeHorta) {
      p.progressoOvo += dt;
      if (p.progressoOvo >= ALA_PRODUCAO.tempoOvo) {
        const primeiroOvo = p.ovosProduzidos === 0;
        p.progressoOvo = 0;
        this.estado.produtos.ovos.horta++;
        p.ovosProduzidos++;
        if (primeiroOvo) this.emitir('ovoPronto', { texto: 'Ovos prontos no galinheiro!' });
      }
    }
    if (this.estado.melhorias.alaLeite && this.estado.produtos.leite.horta < this.produtos.leite.capacidadeHorta) {
      p.progressoLeite += dt;
      if (p.progressoLeite >= ALA_LEITE.tempoLeite) {
        const primeiroLeite = p.leitesProduzidos === 0;
        p.progressoLeite = 0;
        this.estado.produtos.leite.horta++;
        p.leitesProduzidos++;
        if (primeiroLeite) this.emitir('leitePronto', { texto: 'Garrafas de leite prontas no curral!' });
      }
    }
    if (this.estado.melhorias.alaPadaria) {
      const paes = this.estado.produtos.pao;
      if (p.trigoPadaria > 0 && p.farinha < 3 && paes.prateleira + (p.farinha + 1) * ALA_PADARIA.paesPorTrigo <= this.produtos.pao.capacidadePrateleira) {
        p.progressoMoagem += dt;
        if (p.progressoMoagem >= ALA_PADARIA.tempoMoagem) {
          p.progressoMoagem -= ALA_PADARIA.tempoMoagem;
          p.trigoPadaria--; p.farinha++;
        }
      }
      if (p.farinha > 0 && paes.prateleira + ALA_PADARIA.paesPorTrigo <= this.produtos.pao.capacidadePrateleira) {
        p.progressoForno += dt;
        if (p.progressoForno >= ALA_PADARIA.tempoForno) {
          p.progressoForno -= ALA_PADARIA.tempoForno;
          p.farinha--; paes.prateleira += ALA_PADARIA.paesPorTrigo;
          p.paesProduzidos += ALA_PADARIA.paesPorTrigo;
          if (p.paesProduzidos === ALA_PADARIA.paesPorTrigo) this.emitir('paoPronto', { texto: 'Primeiros pães quentinhos na vitrine!' });
        }
      }
    }
  }
  criarCliente() {
    if (this.estado.banco.assalto) return false;
    const cestaReservada = this.cestasDisponiveis > 0;
    const deCarro = !!this.estado.melhorias.estacionamento && cestaReservada && this.estado.lojaAberta
      && this.tempo >= this.estacionamento.prontoEm && !this.estacionamento.manobrando
      && this.estacionamento.carros.length < 6 && !this.estacionamento.carros.some(c => c.fase === 'esperandoSaida')
      && this.aleatorio() < CONFIG.proporcaoClientesCarro;
    const pedirOvos = this.estado.producao.ovosProduzidos >= 2 && this.proximaId % (this.estado.estatisticas.ovosVendidos >= 10 ? 3 : 4) === 0;
    const pedirLeite = this.estado.producao.leitesProduzidos >= 2 && this.proximaId % (this.estado.estatisticas.leitesVendidos >= 10 ? 4 : 5) === 0;
    const disponiveis = Object.keys(this.produtos).filter(id => this.estado.produtos[id].liberado
      && (!this.produtos[id].nivelMinimo || this.estado.produtos[id].apresentado || this.estado.produtos[id].prateleira > 0)
      && (id !== 'ovos' || pedirOvos) && (id !== 'leite' || pedirLeite));
    const inicioProdutos = (this.proximaId - 1) % disponiveis.length;
    const prioridade = pedirLeite ? 'leite' : pedirOvos ? 'ovos' : null;
    const produtosDesejados = prioridade
      ? [prioridade, ...disponiveis.filter(id => id !== prioridade)]
      : Array.from({ length: Math.min(disponiveis.length, CONFIG.capacidadeCestaCliente) }, (_, i) => disponiveis[(inicioProdutos + i) % disponiveis.length]);
    const totalDesejado = 1 + Math.floor(this.aleatorio() * this.limitePedidoCliente);
    const produtosPedidos = produtosDesejados.slice(0, totalDesejado);
    const indicePao = produtosPedidos.indexOf('pao');
    let compras;
    if (indicePao >= 0) {
      const quantidadePao = 3 + Math.floor(this.aleatorio() * (CONFIG.capacidadeCestaCliente - 2));
      const espacoRestante = CONFIG.capacidadeCestaCliente - quantidadePao;
      const outros = produtosPedidos.filter(id => id !== 'pao').slice(0, espacoRestante);
      compras = [
        { produto: 'pao', desejado: quantidadePao, quantidade: 0 },
        ...outros.map(produto => ({ produto, desejado: 1, quantidade: 0 }))
      ];
    } else {
      compras = produtosPedidos.map((produto, indice, lista) => ({
        produto,
        desejado: Math.floor(totalDesejado / lista.length) + (indice < totalDesejado % lista.length ? 1 : 0),
        quantidade: 0
      }));
    }
    const produto = compras[0].produto;
    const ordemEntradas = [this.proximoLadoEntrada, 1 - this.proximoLadoEntrada];
    const ladoEntrada = ordemEntradas.find(indice => !this.clientes.some(c => distancia(c, this.extremosCalcada[indice]) < CONFIG.distanciaClientes));
    if (ladoEntrada === undefined) return false;
    this.proximoLadoEntrada = 1 - ladoEntrada;
    const ladoSaida = this.proximoLadoSaida;
    this.proximoLadoSaida = 1 - this.proximoLadoSaida;
    const pontosOcupados = new Set(this.clientes
      .filter(c => c.produto === produto && !['indoCaixa', 'fila', 'saindo', 'fim'].includes(c.fase))
      .map(c => c.pontoCompra));
    const pontoCompra = this.produtos[produto].pontosCompra.findIndex((_, indice) => !pontosOcupados.has(indice));
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
    this.clientes.push({ id: this.proximaId++, ...this.extremosCalcada[ladoEntrada], produto, quantidade: 0, desejado: compras[0].desejado, compras, compraAtual: 0, itens: [], fase: cestaReservada ? 'chegando' : 'passando', etapa: 0, espera: 0, aparencia, ladoEntrada, ladoSaida: cestaReservada ? ladoSaida : 1 - ladoEntrada, pontoCompra: Math.max(0, pontoCompra), andando: false, cestaReservada, temCesta: false, levaSacolas: false });
    if (deCarro) this.estacionamento.reservar(this.clientes.at(-1), this.tempo);
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
    const livre = this.produtos[produto].pontosCompra.findIndex((_, indice) => !ocupados.has(indice));
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
      this.registrarSatisfacao(c);
      c.fase = 'saindo'; c.etapa = 0; c.temCesta = false; c.cestaReservada = false;
    }
  }
  avaliarSatisfacao(c) {
    this.normalizarComprasCliente(c);
    const desejado = c.compras.reduce((total, compra) => total + compra.desejado, 0);
    const encontrado = c.compras.reduce((total, compra) => total + compra.quantidade, 0);
    if (encontrado === 0) return 'irritado';
    return encontrado >= desejado ? 'feliz' : 'neutro';
  }
  registrarSatisfacao(c, satisfacaoForcada = null) {
    if (c.satisfacaoRegistrada) return c.satisfacao;
    c.satisfacao = satisfacaoForcada ?? this.avaliarSatisfacao(c);
    c.satisfacaoRegistrada = true;
    const pontos = CONFIG.pontosSatisfacao[c.satisfacao];
    const contador = { feliz: 'clientesFelizes', neutro: 'clientesNeutros', irritado: 'clientesIrritados' }[c.satisfacao];
    this.estado.estatisticas.satisfacao += pontos;
    this.estado.estatisticas[contador]++;
    this.estado.satisfacoesRecentes.push(c.satisfacao);
    this.estado.satisfacoesRecentes = this.estado.satisfacoesRecentes.slice(-CONFIG.tamanhoHistoricoReputacao);
    return c.satisfacao;
  }
  portaEntradaDeveAbrir() {
    if (distancia(this.estado.jogador, CONFIG.portaEntrada) < 2.35) return true;
    const assalto = this.estado.banco.assalto;
    if (assalto && assalto.tempo >= ASSALTO.chegada && assalto.tempo <= ASSALTO.embarque) return true;
    const coleta = this.estado.banco.coleta;
    if (coleta && coleta.tempo >= BANCO.chegada && coleta.tempo <= BANCO.embarque) return true;
    return this.clientes.some(c => {
      if (c.recusado || !['chegando', 'saindo'].includes(c.fase)) return false;
      if (c.fase === 'chegando' && !this.estado.lojaAberta) return false;
      return distancia(c, CONFIG.portaEntrada) < 2.35;
    });
  }
  atualizarClientes(dt) {
    this.estacionamento.atualizar(this, dt);
    const alvoEntrada = this.portaEntradaDeveAbrir() ? 1 : 0;
    const abertura = limitar(this.aberturaPortaEntrada + (alvoEntrada ? 1 : -1) * dt * 1.8, 0, 1);
    const atoresEntrada = [this.estado.jogador, ...this.clientes];
    const folhas = volumesPortasEntrada(abertura);
    // Uma folha não pode girar sobre alguém parado em sua trajetória.
    if (!atoresEntrada.some(ator => !segmentoLivre(ator, ator, folhas, 0.32))) this.aberturaPortaEntrada = abertura;
    this.proximoCliente -= dt;
    if (this.proximoCliente <= 0 && this.criarCliente()) this.proximoCliente = this.intervaloClientes;
    const fila = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0));
    const clienteEmAtendimento = this.clienteEmAtendimento;
    for (const c of this.clientes) {
      if (['dirigindo', 'embarcando'].includes(c.fase)) continue;
      if (c.assustado) { c.andando = false; continue; }
      const compra = this.normalizarComprasCliente(c);
      const p = this.produtos[c.produto], e = this.estado.produtos[c.produto];
      if (((!this.estado.lojaAberta && c.etapa > 0) || this.estado.banco.assalto?.invadiu) && c.fase === 'chegando' && c.z >= 6.7) {
        c.fase = 'saindo'; c.etapa = 1; c.temCesta = false; c.cestaReservada = false; c.ladoSaida = c.ladoEntrada; c.recusado = true;
      }
      if (c.fase === 'chegando') {
        if (c.etapa === -1) {
          if (this.caminharCliente(c, SAIDA_PEDESTRES, dt)) c.etapa = 0;
          continue;
        }
        if (c.etapa === 0) {
          if (this.caminharCalcada(c, CONFIG.entrada, dt)) c.etapa = 1;
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
        const indice = fila.indexOf(c);
        if (this.caminharCliente(c, pontoFila(indice), dt)) c.fase = 'fila';
      } else if (c.fase === 'fila') {
        const indice = Math.max(0, fila.indexOf(c));
        if (this.caminharCliente(c, pontoFila(indice), dt)) { c.andando = false; c.angulo = CONFIG.anguloCaixa + Math.PI; }
      } else if (c.fase === 'passando') {
        if (this.caminharCalcada(c, this.extremosCalcada[c.ladoSaida], dt)) c.fase = 'fim';
      } else if (c.fase === 'saindo') {
        if (c.etapa === 0) {
          if (this.caminharCliente(c, CONFIG.entrada, dt)) c.etapa = 1;
        } else {
          const carro = this.estacionamento.carroCliente(c);
          if (carro) {
            if (c.etapa === 1) {
              if (this.caminharCliente(c, SAIDA_PEDESTRES, dt)) c.etapa = 2;
            } else if (this.caminharCliente(c, pontoPortaCarro(carro), dt)) this.estacionamento.embarcar(c);
          } else if (this.caminharCalcada(c, this.extremosCalcada[c.ladoSaida ?? 1], dt)) c.fase = 'fim';
        }
      }
    }
    this.clientes = this.clientes.filter(c => c.fase !== 'fim');
  }
  atualizarCaixa(dt) {
    if (this.assaltoNaLoja) { this.progressoCaixa = 0; return; }
    const primeiro = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0))[0];
    if (primeiro && this.clienteEmAtendimento === primeiro) {
      this.progressoCaixa += dt;
      if (!this.estado.melhorias.caixa) this.atividade = 'Atendendo no caixa…';
      if (this.progressoCaixa >= CONFIG.tempoCaixa) {
        const nivelAnterior = this.nivel;
        this.normalizarComprasCliente(primeiro);
        const valor = primeiro.itens.reduce((total, id) => total + this.produtos[id].preco, 0);
        this.estado.dinheiro += valor; this.estado.estatisticas.faturamento += valor; this.estado.estatisticas.clientes++;
        this.estado.banco.noCaixa += valor;
        this.estado.estatisticas.ovosVendidos += primeiro.itens.filter(id => id === 'ovos').length;
        this.estado.estatisticas.leitesVendidos += primeiro.itens.filter(id => id === 'leite').length;
        this.registrarSatisfacao(primeiro);
        primeiro.embalado = true; primeiro.temCesta = false; primeiro.cestaReservada = false; primeiro.levaSacolas = true;
        primeiro.fase = 'saindo'; primeiro.etapa = 0;
        this.progressoCaixa = 0;
        this.emitir('venda', { valor, ponto: CONFIG.caixa });
        if (this.nivel > nivelAnterior) {
          this.estado.dinheiro += CONFIG.bonusNivel;
          this.emitir('nivel', { nivel: this.nivel });
        }
      }
    } else this.progressoCaixa = 0;
  }
  atualizarAjudante(dt) {
    const a = this.ajudante;
    if (!a.inventario.length && a.destino === 'horta') {
      const tarefas = Object.keys(this.produtos).filter(id => {
        const estoque = this.estado.produtos[id], produto = this.produtos[id];
        return id !== 'pao' && estoque.liberado && estoque.horta > 0 && estoque.prateleira < produto.capacidadePrateleira;
      });
      tarefas.sort((idA, idB) => {
        const falta = id => (this.produtos[id].capacidadePrateleira - this.estado.produtos[id].prateleira) / this.produtos[id].capacidadePrateleira + (id === 'ovos' ? 0.25 : 0);
        return falta(idB) - falta(idA);
      });
      if (!tarefas.length) { a.andando = false; return; }
      a.produto = tarefas[0];
    }
    const p = this.produtos[a.produto], e = this.estado.produtos[a.produto];
    a.temporizador -= dt;
    if (a.destino === 'horta') {
      // O corredor entre a horta e a loja permanece livre.
      if (this.caminharProducao(a, p.coleta, dt)) {
        const falta = p.capacidadePrateleira - e.prateleira;
        if (e.horta && falta > a.inventario.length && a.inventario.length < CONFIG.capacidadeAjudante && a.temporizador <= 0) {
          if (p.origem === 'importado') { if (!this.retirarProdutoDeposito(a.produto)) return; }
          else e.horta--;
          a.inventario.push(a.produto); a.temporizador = 0.5;
        }
        if (a.inventario.length >= Math.min(CONFIG.capacidadeAjudante, falta) || (!e.horta && a.inventario.length)) a.destino = 'prateleira';
      }
    } else if (this.caminharProducao(a, p.reposicao, dt) && a.temporizador <= 0) {
      if (a.inventario.length && e.prateleira < p.capacidadePrateleira) {
        const indice = a.inventario.length - 1;
        e.prateleira++; e.apresentado = true; a.inventario.pop(); a.temporizador = 0.4;
        this.reposicoes.set(a, { id: a.produto, indice, lugar: e.prateleira - 1 });
      }
      if (!a.inventario.length) {
        a.destino = 'horta';
      }
    }
  }
  caminharProducao(ator, destino, dt) {
    let trajeto = this.trajetosProducao.get(ator);
    if (!trajeto || distancia(trajeto.destino, destino) > 0.1) {
      const dentro = p => p.x > PLANTA_INICIAL.limites.minX && p.z > this.portaProducao.z && p.z < CONFIG.portaEntrada.z;
      const interior = { x: this.portaProducao.x, z: this.portaProducao.z + 0.8 };
      const exterior = { x: this.portaProducao.x + this.portaProducao.w / 4, z: this.portaProducao.z - 1 };
      const pontos = dentro(ator) === dentro(destino) ? [destino]
        : dentro(ator) ? [interior, exterior, destino] : [exterior, interior, destino];
      trajeto = { destino: { ...destino }, pontos };
      this.trajetosProducao.set(ator, trajeto);
    }
    if (this.caminharCliente(ator, trajeto.pontos[0], dt, this.velocidadeAjudante)) {
      if (trajeto.pontos.length === 1) return true;
      trajeto.pontos.shift();
    }
    return false;
  }
  resumo() {
    return { dinheiro: this.estado.dinheiro, capacidade: this.capacidade, nivel: this.nivel,
      satisfacao: this.estado.estatisticas.satisfacao,
      reputacao: this.reputacao, faixaReputacao: this.faixaReputacao,
      clientesPorSatisfacao: { felizes: this.estado.estatisticas.clientesFelizes, neutros: this.estado.estatisticas.clientesNeutros, irritados: this.estado.estatisticas.clientesIrritados },
      lojaAberta: this.estado.lojaAberta,
      estagioLoja: this.estado.estagioLoja, producao: { ...this.estado.producao },
      funcionarios: { ajudante: { ...this.ajudante, inventario: [...this.ajudante.inventario] } },
      inventario: [...this.estado.jogador.inventario], melhorias: Object.fromEntries(MELHORIAS.map(m => [m.id, m.ativa === false ? 0 : this.estado.melhorias[m.id]])),
      produtos: structuredClone(this.estado.produtos), clientesAtendidos: this.estado.estatisticas.clientes,
      objetivo: this.missao().titulo, pausado: this.pausado };
  }
}
