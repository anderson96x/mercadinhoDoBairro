import { PERSONALIZACAO_PADRAO, validarPersonalizacao } from './personalizacao.js';
import { PAREDES_LOJA, MOBILIARIO_LOJA, MOBILIARIO_CALCADA, PAREDES_ESCRITORIO, PORTA_ESCRITORIO } from './bairro.js';
import { CONFIG, PRODUTOS, MELHORIAS, MISSOES, ALA_PRODUCAO, ALA_LEITE, ALA_TRIGO, ALA_PADARIA } from './configuracao.js';
import { buscarCaminho } from './navegacao.js';
import { APARENCIAS_CLIENTES } from './aparencias-clientes.js';
import { BANCO, estadoBanco, validarBanco, atualizarBanco } from './banco.js';
import { ASSALTO } from './assalto.js';

export const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const capacidadeExtraAtiva = MELHORIAS.find(m => m.id === 'mochila')?.ativa !== false;
const fertilizanteAtivo = MELHORIAS.find(m => m.id === 'fertilizante')?.ativa !== false;
const velocidadeJogadorAtiva = MELHORIAS.find(m => m.id === 'velocidade')?.ativa !== false;
const ajudanteAtivo = MELHORIAS.find(m => m.id === 'ajudante')?.ativa !== false;
const velocidadeAjudanteAtiva = MELHORIAS.find(m => m.id === 'velocidadeAjudante')?.ativa !== false;

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
    banco: estadoBanco(),
    lojaAberta: true,
    jogador: { ...CONFIG.inicio, inventario: [] },
    personalizacao: { ...PERSONALIZACAO_PADRAO },
    melhorias: Object.fromEntries(MELHORIAS.map(m => [m.id, 0])),
    estagioLoja: 0,
    producao: { progressoOvo: 0, ovosProduzidos: 0, progressoLeite: 0, leitesProduzidos: 0,
      trigoPadaria: 0, farinha: 0, progressoMoagem: 0, progressoForno: 0, paesProduzidos: 0 },
    funcionarios: { ajudante: { x: -1.8, z: 1, inventario: [], destino: 'horta', produto: 'tomate', temporizador: 0, andando: false } },
    produtos: Object.fromEntries(Object.entries(PRODUTOS).map(([id, p]) => [id, {
      liberado: p.liberado, horta: p.liberado ? p.capacidadeHorta : 0, prateleira: 0, crescimento: 0, crescimentoMelhorado: false
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
  base.estagioLoja = base.melhorias[ALA_PADARIA.id] ? ALA_PADARIA.indice
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
      || (base.melhorias[ALA_PADARIA.id] && ALA_PADARIA.produtos.includes(id)));
    base.produtos[id] = {
      liberado, horta: liberado ? numero(salvo?.horta ?? (p.origem === 'horta' ? p.capacidadeHorta : 0), p.capacidadeHorta) : 0,
      prateleira: liberado ? numero(salvo?.prateleira, p.capacidadePrateleira) : 0, crescimento: 0,
      crescimentoMelhorado: fertilizanteAtivo && p.origem === 'horta' && nivelSalvo >= 4 && salvo?.crescimentoMelhorado === true
    };
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
    ? dados.jogador.inventario.filter(id => base.produtos[id]?.liberado).slice(0, CONFIG.capacidadeInicial + (capacidadeExtraAtiva ? 4 * base.melhorias.mochila : 0)) : [];
  const ajudanteSalvo = dados.funcionarios?.ajudante;
  if (base.melhorias.ajudante && ajudanteSalvo) {
    const produto = base.produtos[ajudanteSalvo.produto]?.liberado ? ajudanteSalvo.produto : 'tomate';
    const limites = base.estagioLoja ? ALA_PRODUCAO.limites : CONFIG.limiteMundo;
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
    if (ajudanteSalvo.x > 12 || ajudanteSalvo.z < -6) Object.assign(base.funcionarios.ajudante, PRODUTOS.ovos.coleta);
  }
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
    this.tempoEsperaAssalto = ASSALTO.espera;
    this.aleatorio = Math.random;
    this.ajudante = this.estado.funcionarios.ajudante;
    if (this.estado.banco.assalto && Array.isArray(salvo?.clientesAssalto)) {
      const fases = ['chegando', 'pegandoCesta', 'comprando', 'indoCaixa', 'fila', 'saindo'];
      this.clientes = salvo.clientesAssalto.filter(c => c && Number.isFinite(c.x) && Number.isFinite(c.z)
        && PRODUTOS[c.produto] && fases.includes(c.fase)).slice(0, 30).map((c, i) => {
        const itens = (Array.isArray(c.itens) ? c.itens : []).filter(id => PRODUTOS[id]).slice(0, CONFIG.capacidadeCestaCliente);
        const compras = (Array.isArray(c.compras) ? c.compras : []).filter(p => p && PRODUTOS[p.produto]).map(p => ({
          produto: p.produto, desejado: limitar(Number(p.desejado) || 1, 1, 5), quantidade: limitar(Number(p.quantidade) || 0, 0, 5)
        }));
        return { ...c, id: i + 1, x: limitar(c.x, -15, 16), z: limitar(c.z, -10, 13),
          itens, quantidade: itens.length, compras, compraAtual: 0,
          satisfacao: ['feliz', 'neutro', 'irritado'].includes(c.satisfacao) ? c.satisfacao : null,
          satisfacaoRegistrada: c.satisfacaoRegistrada === true && ['feliz', 'neutro', 'irritado'].includes(c.satisfacao),
          assustado: this.assaltoNaLoja && c.z <= CONFIG.portaEntrada.z, tempoAssusto: 0, andando: false };
      });
      this.proximaId = this.clientes.length + 1;
      this.proximaOrdemFila = Math.max(0, ...this.clientes.map(c => Number(c.ordemFila) || 0)) + 1;
    }
    this.missaoAnterior = this.missao().indice;
  }
  get limitesMundo() { return this.estado.estagioLoja >= ALA_TRIGO.indice ? ALA_TRIGO.limites : this.estado.estagioLoja >= ALA_LEITE.indice ? ALA_LEITE.limites : this.estado.estagioLoja ? ALA_PRODUCAO.limites : CONFIG.limiteMundo; }
  get capacidade() { return CONFIG.capacidadeInicial + (capacidadeExtraAtiva ? this.estado.melhorias.mochila * 4 : 0); }
  get velocidade() { return CONFIG.velocidadeInicial * (1 + (velocidadeJogadorAtiva ? this.estado.melhorias.velocidade * 0.2 : 0)); }
  get ajudanteContratado() { return ajudanteAtivo && !!this.estado.melhorias.ajudante; }
  get velocidadeAjudante() { return 2.8 * (velocidadeAjudanteAtiva && this.estado.melhorias.velocidadeAjudante ? CONFIG.multiplicadorVelocidadeAjudante : 1); }
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
  consumirEventos() { const eventos = this.eventos; this.eventos = []; return eventos; }
  solicitarDeposito() {
    const banco = this.estado.banco;
    if (banco.assalto) return { sucesso: false, motivo: 'Aguarde o fim do assalto para chamar o banco.' };
    if (!this.estado.jogador.sentadoEscritorio) return { sucesso: false, motivo: 'Vá ao escritório para solicitar o depósito.' };
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
      for (const c of this.clientes) if (c.z <= CONFIG.portaEntrada.z && c.fase !== 'fim') {
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
            estoque.prateleira = Math.min(PRODUTOS[id].capacidadePrateleira, estoque.prateleira + 1);
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
    if (m.requisitoMelhoria && !this.estado.melhorias[m.requisitoMelhoria]) {
      const motivo = id === ALA_PADARIA.id ? 'Abra a ala do trigo antes de construir a padaria.' : 'Contrate o repositor antes de melhorar sua velocidade.';
      return { disponivel: false, motivo, requisitoMelhoria: m.requisitoMelhoria };
    }
    if (id === ALA_PADARIA.id && !this.estado.melhorias.alaProducao) {
      return { disponivel: false, motivo: 'Construa a ala dos ovos antes de abrir a padaria.', requisitoMelhoria: 'alaProducao' };
    }
    return { disponivel: true };
  }
  comprarMelhoria(id) {
    const m = MELHORIAS.find(m => m.id === id);
    if (!m) return { sucesso: false, motivo: 'Melhoria desconhecida.' };
    const disponibilidade = this.disponibilidadeMelhoria(id);
    if (!disponibilidade.disponivel) return { sucesso: false, motivo: disponibilidade.motivo };
    if (this.estado.melhorias[id] >= m.max) return { sucesso: false, motivo: 'Essa melhoria já está completa.' };
    if (m.tipo === 'selecaoProduto' && this.estado.melhoriaPendente) return { sucesso: false, motivo: 'Escolha primeiro a horta que receberá o produto.' };
    if (m.tipo === 'selecaoProduto' && !Object.entries(this.estado.produtos).some(([id, p]) => PRODUTOS[id].origem === 'horta' && p.liberado && !p.crescimentoMelhorado)) return { sucesso: false, motivo: 'Não há uma horta disponível para receber essa melhoria.' };
    const custo = this.custoMelhoria(id);
    if (this.estado.dinheiro < custo) return { sucesso: false, motivo: 'Você ainda não tem dinheiro suficiente.' };
    this.estado.dinheiro -= custo;
    if (m.tipo === 'selecaoProduto') {
      this.estado.melhoriaPendente = id;
      return { sucesso: true, dinheiro: this.estado.dinheiro, selecionarProduto: true };
    }
    this.estado.melhorias[id]++;
    if (m.tipo === 'expansao') {
      const ala = id === ALA_PADARIA.id ? ALA_PADARIA : id === ALA_TRIGO.id ? ALA_TRIGO : id === ALA_LEITE.id ? ALA_LEITE : ALA_PRODUCAO;
      this.estado.estagioLoja = Math.max(this.estado.estagioLoja, ala.indice);
      for (const produto of ala.produtos) {
        this.estado.produtos[produto].liberado = true;
        if (PRODUTOS[produto].origem === 'horta') this.estado.produtos[produto].horta = PRODUTOS[produto].capacidadeHorta;
      }
      this.emitir('expansao', { texto: id === ALA_PADARIA.id
        ? `Padaria aberta! Cada trigo rende ${ALA_PADARIA.paesPorTrigo} pães de R$ ${PRODUTOS.pao.preco}. Deixe o trigo na caixa à esquerda do balcão de vidro.`
        : id === ALA_TRIGO.id
        ? 'Plantação de trigo pronta! Colha o trigo ao lado do galinheiro e do curral e abasteça a nova prateleira.'
        : id === ALA_LEITE.id
        ? 'Curral pronto! Recolha o leite em garrafas de vidro e abasteça o novo refrigerador.'
        : 'Galinheiro pronto na fazenda! Colete os ovos e abasteça a nova prateleira.' });
    }
    if (m.tipo === 'produto') {
      this.estado.produtos[id].liberado = true;
      this.estado.produtos[id].horta = PRODUTOS[id].capacidadeHorta;
    }
    this.emitir('melhoria', { id, texto: id === ALA_PADARIA.id
      ? `Padaria: cada trigo rende ${ALA_PADARIA.paesPorTrigo} pães de R$ ${PRODUTOS.pao.preco}.`
      : m.titulo });
    return { sucesso: true, dinheiro: this.estado.dinheiro };
  }
  aplicarFertilizante(id) {
    if (this.estado.melhoriaPendente !== 'fertilizante') return { sucesso: false, motivo: 'Compre primeiro o produto de crescimento.' };
    const produto = this.estado.produtos[id];
    if (!produto?.liberado || PRODUTOS[id]?.origem !== 'horta') return { sucesso: false, motivo: 'Essa horta ainda não está disponível.' };
    if (produto.crescimentoMelhorado) return { sucesso: false, motivo: 'Essa horta já recebeu o produto.' };
    produto.crescimentoMelhorado = true;
    this.estado.melhorias.fertilizante++;
    this.estado.melhoriaPendente = null;
    this.emitir('hortaMelhorada', { id, texto: `${PRODUTOS[id].nome}: crescimento acelerado!`, ponto: PRODUTOS[id].horta });
    return { sucesso: true, produto: id };
  }
  missao() {
    const s = this.estado.estatisticas;
    if (!s.clientes) {
      if (s.colhidos < 4) return { indice: 0, titulo: 'Colha seus primeiros tomates', texto: 'Vá à horta e pegue 4 tomates.', valor: s.colhidos, alvo: 4, destino: 'horta' };
      if (s.repostos < 4) return { indice: 1, titulo: 'Abasteça a prateleira', texto: 'Leve 4 tomates da horta para a prateleira da loja.', valor: s.repostos, alvo: 4, destino: 'prateleira' };
      return { indice: 2, titulo: 'Faça a primeira venda', texto: 'Sente-se no caixa quando um cliente chegar.', valor: 0, alvo: 1, destino: 'caixa' };
    }
    const recorrente = MISSOES.find(m => m.intervalo);
    if (recorrente) {
      const valor = this.estado.estatisticas[recorrente.chave] ?? 0;
      const orientacaoOvos = !this.estado.melhorias.alaProducao
        ? { titulo: 'Construa o galinheiro', texto: 'Compre a ala dos ovos no escritório.', destino: 'escritorio' }
        : this.estado.produtos.ovos.prateleira < 1
          ? { titulo: 'Abasteça a prateleira de ovos', texto: 'Colete os ovos no galinheiro da fazenda e leve-os à nova prateleira.', destino: this.estado.jogador.inventario.includes('ovos') ? 'prateleiraOvos' : 'ovos', exibir: false }
          : this.ajudanteContratado
            ? { titulo: 'Mantenha a ala funcionando', texto: 'As galinhas produzem ovos automaticamente. Cuide das prateleiras e atenda o bairro.', destino: 'ovos', exibir: false }
            : { titulo: 'Atenda o bairro', texto: 'Os ovos já estão à venda. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoLeite = !this.estado.melhorias.alaLeite
        ? { titulo: 'Construa o curral', texto: 'Compre a ala do leite no escritório por R$ 800.', destino: 'escritorio' }
        : this.estado.produtos.leite.prateleira < 1
          ? { titulo: 'Leve leite ao refrigerador', texto: 'Recolha as garrafas de vidro no curral e abasteça o novo refrigerador.', destino: this.estado.jogador.inventario.includes('leite') ? 'prateleiraLeite' : 'leite' }
          : { titulo: 'Atenda o bairro', texto: 'O leite já está à venda. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoTrigo = !this.estado.melhorias.alaTrigo
        ? { titulo: 'Abra a plantação de trigo', texto: 'Compre a ala do trigo no escritório por R$ 400.', destino: 'escritorio' }
        : this.estado.produtos.trigo.prateleira < 1
          ? { titulo: 'Abasteça a prateleira de trigo', texto: 'Colha o trigo entre o galinheiro e o curral e leve-o à nova prateleira.', destino: this.estado.jogador.inventario.includes('trigo') ? 'prateleiraTrigo' : 'trigo' }
          : { titulo: 'Atenda o bairro', texto: 'O trigo já está à venda por R$ 5. Cuide das prateleiras e atenda seus clientes.', destino: 'caixa', exibir: false };
      const orientacaoPadaria = !this.estado.melhorias.alaPadaria
        ? { titulo: 'Abra a padaria', texto: 'Compre a padaria no escritório por R$ 1.400. Cada trigo rende 3 pães de R$ 10.', destino: 'escritorio' }
        : this.estado.producao.trigoPadaria === 0 && !this.estado.producao.farinha && !this.estado.produtos.pao.prateleira
          ? { titulo: 'Leve trigo à padaria', texto: 'Colha trigo e deixe-o na caixa à esquerda do balcão. Cada trigo rende 3 pães de R$ 10.', destino: this.estado.jogador.inventario.includes('trigo') ? 'padaria' : 'trigo' }
          : { titulo: 'Pães frescos para o bairro', texto: 'Cada trigo rende 3 pães de R$ 10. Reabasteça a padaria para manter a produção.', destino: 'padaria', exibir: false };
      const orientacoesNivel = {
        2: {
          titulo: 'Seu mercadinho pode crescer',
          texto: 'Vá ao escritório para contratar um caixa.',
          exibir: !this.estado.melhorias.caixa
        },
        3: {
          titulo: 'Uma nova colheita',
          texto: 'Vá ao escritório para abrir a horta e a prateleira de milho.',
          exibir: !this.estado.melhorias.milho
        },
        4: orientacaoOvos,
        5: orientacaoLeite,
        6: this.ajudanteContratado
          ? { titulo: 'Atenda o bairro', texto: 'O Repositor cuida das prateleiras. Continue atendendo seus clientes.', destino: 'caixa', exibir: false }
          : { titulo: 'Contrate o Repositor', texto: 'Vá ao escritório e contrate o Repositor por R$ 900 para abastecer as prateleiras.', destino: 'escritorio' },
        7: orientacaoTrigo,
        9: orientacaoPadaria,
      };
      const orientacaoNivel = orientacoesNivel[this.nivel] || (this.nivel > 9 ? orientacaoPadaria : this.nivel > 7 ? orientacaoTrigo : {});
      return { ...recorrente, ...orientacaoNivel, indice: 4, valor, alvo: this.nivel * recorrente.intervalo, destino: orientacaoNivel.destino ?? (orientacaoNivel.titulo ? 'escritorio' : 'caixa'), exibir: orientacaoNivel.exibir ?? Boolean(orientacaoNivel.titulo) };
    }
    const indice = MISSOES.findIndex(m => (this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) < m.alvo);
    if (indice === -1) return { indice: MISSOES.length, completa: true, titulo: 'O bairro é seu!', texto: 'Continue cuidando da loja e descubra todas as melhorias.', valor: 1, alvo: 1 };
    const m = MISSOES[indice];
    return { ...m, indice, valor: Math.min(m.alvo, this.estado.estatisticas[m.chave] ?? this.estado.melhorias[m.chave] ?? 0) };
  }
  obstaculos() {
    const caixas = [
      { ...PRODUTOS.tomate.horta, w: 2.2, d: 3.3 },
      { ...PRODUTOS.tomate.prateleira, w: 2.2, d: 1.7 },
      { ...CONFIG.balcao, w: 2.7, d: 1.35 },
      { ...CONFIG.cestas, w: 0.9, d: 1.25 },
      ...PAREDES_LOJA.filter(p => !p.lateral || !this.estado.estagioLoja), ...PAREDES_ESCRITORIO, ...MOBILIARIO_LOJA
    ];
    if (this.estado.produtos.milho.liberado) caixas.push({ ...PRODUTOS.milho.horta, w: 2.2, d: 3.3 }, { ...PRODUTOS.milho.prateleira, w: 2.2, d: 1.7 });
    if (this.estado.estagioLoja) caixas.push(...ALA_PRODUCAO.paredes.filter(p => this.estado.estagioLoja < ALA_LEITE.indice || p.x !== 12.1));
    if (this.estado.melhorias.alaProducao) caixas.push(
      { ...PRODUTOS.ovos.horta, w: 2.1, d: 2.2 },
      { ...PRODUTOS.ovos.prateleira, w: 2.3, d: 1.65 }
    );
    if (this.estado.estagioLoja >= ALA_LEITE.indice) caixas.push(
      ...ALA_LEITE.paredes.filter(p => this.estado.estagioLoja < ALA_TRIGO.indice || p.x !== 15.1),
      { ...PRODUTOS.leite.horta, ...PRODUTOS.leite.curral },
      { ...PRODUTOS.leite.prateleira, w: 2.3, d: 1.15 }
    );
    if (this.estado.estagioLoja >= ALA_TRIGO.indice) caixas.push(
      ...ALA_TRIGO.paredes,
      { ...PRODUTOS.trigo.horta, w: 2.5, d: 3.6 },
      { ...PRODUTOS.trigo.prateleira, w: 2.3, d: 1.65 }
    );
    if (this.estado.melhorias.alaPadaria) caixas.push(
      { ...PRODUTOS.pao.prateleira, w: 3.45, d: 1.35 },
      { ...ALA_PADARIA.entrada, w: 1.2, d: 1.15 },
      { x: 8.55, z: 5.25, w: 1.1, d: 1.1 },
      { x: 12.4, z: 5.25, w: 1.2, d: 1.25 }
    );
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
    const limites = this.limitesMundo;
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
        rota = { destino: { ...ponto }, pontos: buscarCaminho(ator, ponto, livre, this.limitesMundo), recalcular: this.tempo + 0.6 };
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
    const deposito = atualizarBanco(this.estado.banco, dt);
    if (deposito !== null) this.emitir('depositoConcluido', { valor: deposito });
    this.atualizarAssalto(dt);
    const atoresPorta = [this.estado.jogador, ...this.clientes];
    if (this.ajudanteContratado) atoresPorta.push(this.ajudante);
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
      if (estoque.liberado && p.origem === 'horta' && estoque.horta < p.capacidadeHorta) {
        estoque.crescimento += dt;
        const tempoCrescimento = p.tempoCrescimento * (estoque.crescimentoMelhorado ? CONFIG.multiplicadorCrescimentoMelhorado : 1);
        if (estoque.crescimento >= tempoCrescimento) { estoque.horta++; estoque.crescimento = 0; }
      }
    }
    this.atualizarProducao(dt);
    this.interagir();
    this.atualizarClientes(dt);
    this.atualizarCaixa(dt);
    if (this.ajudanteContratado) this.atualizarAjudante(dt);
    const missao = this.missao();
    if (missao.indice > this.missaoAnterior) { this.emitir('missao', { texto: `Próximo passo: ${missao.titulo}` }); this.missaoAnterior = missao.indice; }
  }
  interagir() {
    const jogador = this.estado.jogador;
    this.atividade = jogador.sentadoEscritorio ? 'Usando o computador…' : '';
    if (this.estado.melhorias.alaPadaria && pertoEstacao(jogador, ALA_PADARIA.entrada, 1.2, 1.15)) {
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
    }
    for (const [id, p] of Object.entries(PRODUTOS)) {
      if (id === 'pao') continue;
      const e = this.estado.produtos[id];
      if (!e.liberado) continue;
      if (pertoEstacao(jogador, p.prateleira, 2.45, 1.8)) {
        const indice = jogador.inventario.indexOf(id);
        if (indice >= 0 && e.prateleira < p.capacidadePrateleira) {
          this.atividade = id === 'leite' ? 'Abastecendo o refrigerador…' : 'Abastecendo a prateleira…';
          if (this.tempo >= this.proximaInteracao) {
            jogador.inventario.splice(indice, 1); e.prateleira++; this.estado.estatisticas.repostos++;
            this.reposicoes.set(jogador, { id, indice, lugar: e.prateleira - 1 });
            this.proximaInteracao = this.tempo + CONFIG.intervaloInteracao;
            this.emitir('reposicao', { id, ponto: p.prateleira });
          }
        } else if (e.prateleira >= p.capacidadePrateleira && indice >= 0) this.atividade = id === 'leite' ? 'Refrigerador cheio' : 'Prateleira cheia';
      }
      if (pertoEstacao(jogador, p.horta, p.curral?.w ?? 2.5, p.curral?.d ?? 3.6)) {
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
  atualizarProducao(dt) {
    if (!this.estado.estagioLoja) return;
    const p = this.estado.producao;
    if (this.estado.melhorias.alaProducao && this.estado.produtos.ovos.horta < PRODUTOS.ovos.capacidadeHorta) {
      p.progressoOvo += dt;
      if (p.progressoOvo >= ALA_PRODUCAO.tempoOvo) {
        const primeiroOvo = p.ovosProduzidos === 0;
        p.progressoOvo = 0;
        this.estado.produtos.ovos.horta++;
        p.ovosProduzidos++;
        if (primeiroOvo) this.emitir('ovoPronto', { texto: 'Ovos prontos no galinheiro!' });
      }
    }
    if (this.estado.melhorias.alaLeite && this.estado.produtos.leite.horta < PRODUTOS.leite.capacidadeHorta) {
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
      if (p.trigoPadaria > 0 && p.farinha < 3 && paes.prateleira + (p.farinha + 1) * ALA_PADARIA.paesPorTrigo <= PRODUTOS.pao.capacidadePrateleira) {
        p.progressoMoagem += dt;
        if (p.progressoMoagem >= ALA_PADARIA.tempoMoagem) {
          p.progressoMoagem -= ALA_PADARIA.tempoMoagem;
          p.trigoPadaria--; p.farinha++;
        }
      }
      if (p.farinha > 0 && paes.prateleira + ALA_PADARIA.paesPorTrigo <= PRODUTOS.pao.capacidadePrateleira) {
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
    const pedirOvos = this.estado.producao.ovosProduzidos >= 2 && this.proximaId % (this.estado.estatisticas.ovosVendidos >= 10 ? 3 : 4) === 0;
    const pedirLeite = this.estado.producao.leitesProduzidos >= 2 && this.proximaId % (this.estado.estatisticas.leitesVendidos >= 10 ? 4 : 5) === 0;
    const disponiveis = Object.keys(PRODUTOS).filter(id => this.estado.produtos[id].liberado && id !== 'pao' && (id !== 'ovos' || pedirOvos) && (id !== 'leite' || pedirLeite));
    const inicioProdutos = (this.proximaId - 1) % disponiveis.length;
    const prioridade = pedirLeite ? 'leite' : pedirOvos ? 'ovos' : null;
    const produtosDesejados = prioridade
      ? [prioridade, ...disponiveis.filter(id => id !== prioridade)]
      : Array.from({ length: Math.min(disponiveis.length, CONFIG.capacidadeCestaCliente) }, (_, i) => disponiveis[(inicioProdutos + i) % disponiveis.length]);
    const querPao = !!this.estado.melhorias.alaPadaria;
    const quantidadePao = querPao ? 3 + Math.floor(this.aleatorio() * (CONFIG.capacidadeCestaCliente - 2)) : 0;
    const totalDesejado = querPao ? Math.min(CONFIG.capacidadeCestaCliente, quantidadePao + Math.floor(this.aleatorio() * 3)) : 1 + Math.floor(this.aleatorio() * this.limitePedidoCliente);
    const outros = produtosDesejados.slice(0, totalDesejado - quantidadePao).map((produto, indice, lista) => ({
      produto,
      desejado: Math.floor((totalDesejado - quantidadePao) / lista.length) + (indice < (totalDesejado - quantidadePao) % lista.length ? 1 : 0),
      quantidade: 0
    }));
    const compras = querPao ? [{ produto: 'pao', desejado: quantidadePao, quantidade: 0 }, ...outros] : outros;
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
    this.clientes.push({ id: this.proximaId++, ...CONFIG.extremosCalcada[ladoEntrada], produto, quantidade: 0, desejado: compras[0].desejado, compras, compraAtual: 0, itens: [], fase: cestaReservada ? 'chegando' : 'passando', etapa: 0, espera: 0, aparencia, ladoEntrada, ladoSaida: cestaReservada ? ladoSaida : 1 - ladoEntrada, pontoCompra: Math.max(0, pontoCompra), andando: false, cestaReservada, temCesta: false, levaSacolas: false });
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
    this.proximoCliente -= dt;
    if (this.proximoCliente <= 0 && this.criarCliente()) this.proximoCliente = this.intervaloClientes;
    const fila = this.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).sort((a, b) => (a.ordemFila ?? 0) - (b.ordemFila ?? 0));
    const clienteEmAtendimento = this.clienteEmAtendimento;
    for (const c of this.clientes) {
      if (c.assustado) { c.andando = false; continue; }
      const compra = this.normalizarComprasCliente(c);
      const p = PRODUTOS[c.produto], e = this.estado.produtos[c.produto];
      if (((!this.estado.lojaAberta && c.etapa > 0) || this.estado.banco.assalto?.invadiu) && c.fase === 'chegando' && c.z >= 6.7) {
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
      } else if (c.fase === 'passando') {
        if (this.caminharCliente(c, CONFIG.extremosCalcada[c.ladoSaida], dt)) c.fase = 'fim';
      } else if (c.fase === 'saindo') {
        if (c.etapa === 0) {
          if (this.caminharCliente(c, CONFIG.entrada, dt)) c.etapa = 1;
        } else if (this.caminharCliente(c, CONFIG.extremosCalcada[c.ladoSaida ?? 1], dt)) c.fase = 'fim';
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
        const valor = primeiro.itens.reduce((total, id) => total + PRODUTOS[id].preco, 0);
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
      const tarefas = Object.keys(PRODUTOS).filter(id => {
        const estoque = this.estado.produtos[id], produto = PRODUTOS[id];
        return id !== 'pao' && estoque.liberado && estoque.horta > 0 && estoque.prateleira < produto.capacidadePrateleira;
      });
      tarefas.sort((idA, idB) => {
        const falta = id => (PRODUTOS[id].capacidadePrateleira - this.estado.produtos[id].prateleira) / PRODUTOS[id].capacidadePrateleira + (id === 'ovos' ? 0.25 : 0);
        return falta(idB) - falta(idA);
      });
      if (!tarefas.length) { a.andando = false; return; }
      a.produto = tarefas[0];
    }
    const p = PRODUTOS[a.produto], e = this.estado.produtos[a.produto];
    a.temporizador -= dt;
    if (a.destino === 'horta') {
      // O corredor entre a horta e a loja permanece livre.
      if (this.caminharCliente(a, p.coleta, dt, this.velocidadeAjudante)) {
        const falta = p.capacidadePrateleira - e.prateleira;
        if (e.horta && falta > a.inventario.length && a.inventario.length < CONFIG.capacidadeAjudante && a.temporizador <= 0) {
          e.horta--; a.inventario.push(a.produto); a.temporizador = 0.5;
        }
        if (a.inventario.length >= Math.min(CONFIG.capacidadeAjudante, falta) || (!e.horta && a.inventario.length)) a.destino = 'prateleira';
      }
    } else if (this.caminharCliente(a, p.reposicao, dt, this.velocidadeAjudante) && a.temporizador <= 0) {
      if (a.inventario.length && e.prateleira < p.capacidadePrateleira) {
        const indice = a.inventario.length - 1;
        e.prateleira++; a.inventario.pop(); a.temporizador = 0.4;
        this.reposicoes.set(a, { id: a.produto, indice, lugar: e.prateleira - 1 });
      }
      if (!a.inventario.length) {
        a.destino = 'horta';
      }
    }
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
