import { icone } from './icones.js';
import pacote from '../../package.json' with { type: 'json' };
import { PALETAS } from '../jogo/personalizacao.js';
import { CONFIG, MELHORIAS, PRODUTOS } from '../jogo/configuracao.js';
import { TEMPO_ESPERA_ENTREGA, vagasDeposito } from '../jogo/entregas.js';
import { BANCO, statusColeta } from '../jogo/banco.js';
import { statusAssalto } from '../jogo/assalto.js';
import { atualizarPainelClientes } from './clientes.js';
import { atualizarPainelProducao } from './producao.js';
import { CLASSES_PRODUTOS } from '../jogo/classes-produtos.js';
const versaoJogo = pacote.version;
const reais = v => `R$ ${v.toLocaleString('pt-BR')}`;
const ABAS_MELHORIAS = [
  { id: 'mercado', titulo: 'Mercado' },
  { id: 'funcionarios', titulo: 'Funcionários' },
  { id: 'jogador', titulo: 'Jogador' }
];

export class Interface {
  constructor(sim, acoes) {
    this.sim = sim; this.acoes = acoes; this.ultimoInventario = ''; this.ultimaAtualizacao = ''; this.abaMelhorias = 'mercado'; this.quantidadesImportacao = {};
    document.getElementById('app').innerHTML = `
      <main class="jogo" aria-label="Mercadinho do Bairro">
        <div id="mundo"></div><div id="etiquetas" aria-hidden="true"><div id="dica-mundo" hidden></div></div>
        <header class="cabecalho">
          <div class="marca"><div class="marca-topo"><span class="marca-icone">${icone('loja')}</span><div><h1>Mercadinho<span>do Bairro</span></h1></div></div><div class="progresso-nivel"><progress id="nivel-progresso" value="0" max="25" aria-label="Progresso para o próximo nível"></progress><span id="nivel-contagem">0 / 25</span><span class="nivel" id="nivel" role="status" aria-live="polite">NÍVEL 1</span></div></div>
          <div class="saldo" aria-label="Resumo do mercado"><div class="saldo-linha"><span class="moeda">${icone('moeda')}</span><div><small>SEU CAIXA</small><strong id="saldo">R$ 0</strong></div><div class="vendas"><span>${icone('pessoa')}<b id="clientes">0</b></span><small>clientes atendidos</small></div><div class="vendas cestas-topo"><span>${icone('cesta')}<b id="cestas">${this.sim.cestasNoSuporte}</b><span class="contador-carrinhos-topo" id="contador-carrinhos-topo" hidden><i>/</i><b id="carrinhos-topo">0</b><span class="icone-carrinho-topo">${icone('carrinho')}</span></span></span><small>cestas livres</small></div></div><div class="reputacao-topo media" id="reputacao-painel" aria-label="Satisfação média, 60 de 100"><span class="satisfacao-rosto" id="satisfacao-rosto">${icone('neutro')}</span><progress id="reputacao-progresso" value="60" max="100" aria-label="Satisfação do mercadinho"></progress><small id="reputacao-meta">Média · 60 / 100</small></div></div>
          <nav class="ferramentas" aria-label="Opções do jogo">
            <button class="botao-icone" id="celular" title="Abrir opções" aria-label="Abrir opções">${icone('celular')}</button>
            <button class="botao-icone" id="som" title="Ativar som" aria-label="Ativar som">${icone('mudo')}</button>
            <button class="botao-icone" id="ajuda" title="Como jogar" aria-label="Como jogar">${icone('ajuda')}</button>
            <button class="botao-icone" id="fullscreen" title="Jogar em tela cheia" aria-label="Jogar em tela cheia">${icone('tela')}</button>
            ${import.meta.env.DEV ? `<button class="botao-icone reset-dev" id="dev-menu" title="Abrir menu de desenvolvimento" aria-label="Abrir menu de desenvolvimento">${icone('dev')}<small>DEV</small></button>` : ''}
          </nav>
        </header>
        <aside class="painel-clientes" id="painel-clientes" aria-label="Clientes">
          <div class="painel-clientes-topo"><div><small>PEDIDOS</small><h2>Clientes <span id="clientes-ativos">0</span></h2></div>${icone('pessoa')}</div>
          <div id="lista-clientes" class="lista-clientes"></div>
          <p id="clientes-vazio" class="clientes-vazio">Nenhum cliente na loja.</p>
        </aside>
        <aside id="aviso-banco" class="aviso-banco" role="status" aria-live="polite" aria-atomic="true" hidden>
          <span class="aviso-banco-icone" aria-hidden="true">!</span>
          <div class="aviso-banco-conteudo"><strong id="aviso-banco-titulo"></strong><p id="aviso-banco-texto"></p>
            <div id="aviso-banco-prazo" class="aviso-banco-prazo" aria-live="off" hidden>
              <div class="aviso-banco-prazo-legenda"><span>Tempo para depositar</span><b id="aviso-banco-segundos"></b></div>
              <div id="aviso-banco-progresso" class="aviso-banco-progresso" role="progressbar" aria-label="Tempo restante para depositar antes do assalto" aria-valuemin="0"><span id="aviso-banco-barra"></span></div>
            </div>
          </div>
        </aside>
        <aside id="aviso-entrega" class="aviso-banco aviso-entrega" role="status" aria-live="polite" aria-atomic="true" hidden>
          <span class="aviso-banco-icone" aria-hidden="true">${icone('enlatado')}</span>
          <div class="aviso-banco-conteudo"><strong>Caminhão a caminho</strong><p id="aviso-entrega-texto"></p>
            <div class="aviso-banco-prazo">
              <div class="aviso-banco-prazo-legenda"><span>Tempo para chegar</span><b id="aviso-entrega-segundos"></b></div>
              <div id="aviso-entrega-progresso" class="aviso-banco-progresso" role="progressbar" aria-label="Tempo restante para o caminhão chegar" aria-valuemin="0" aria-valuemax="60"><span id="aviso-entrega-barra"></span></div>
            </div>
          </div>
        </aside>
        <aside class="objetivo" id="objetivo" aria-label="Objetivo atual">
          <div class="objetivo-topo"><span>${icone('alvo')} PRÓXIMO PASSO</span><span id="passo">01 / 04</span></div>
          <h2 id="objetivo-titulo">Da horta para a loja</h2><p id="objetivo-texto"></p>
        </aside>
        <div id="atividade" role="status"></div>
        <aside class="painel-producao" id="painel-producao" aria-label="Produção do mercado" hidden>
          <details id="producao-detalhes">
            <summary><span>Produção</span><span class="producao-seta" aria-hidden="true">⌃</span></summary>
            <div id="lista-producao" class="lista-producao"></div>
          </details>
        </aside>
        <div class="controles-dica"><span class="teclas"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span><b>Seu ritmo. Seu mercadinho.</b><span>Arraste para andar · botão direito ou dois dedos para mover o mapa · roda ou pinça para zoom</span></span></div>
        <footer class="rodape">
          <div class="inventario" id="inventario" hidden><div class="inventario-conteudo"><div class="inventario-titulo"><b id="nivel-inventario">Inventário</b><span id="capacidade">${this.sim.estado.jogador.inventario.length} / ${this.sim.capacidade}</span></div><div id="itens"></div></div></div>
        </footer>
        <div id="joystick" aria-hidden="true"><span></span></div>
        <div id="mensagens" aria-live="polite" aria-atomic="true"></div>
        <div id="efeitos" aria-hidden="true"></div><div id="cursor-melhoria" aria-hidden="true" hidden>${icone('folha')}</div>
        <div id="pausa-foco" class="pausa-foco" role="status" aria-live="polite" hidden>
          <div class="pausa-foco-cartao">
            <span class="pausa-foco-icone" aria-hidden="true"><i></i><i></i></span>
            <span class="pausa-foco-legenda">MERCADINHO DO BAIRRO</span>
            <h2>Jogo pausado</h2>
            <p>Volte para esta janela para continuar.</p>
          </div>
        </div>
        <dialog id="painel" aria-labelledby="painel-titulo"><div id="painel-conteudo"></div></dialog>
      </main>`;
    this.el = id => document.getElementById(id);
    this.el('producao-detalhes').open = window.innerWidth > 700;
    this.el('saldo').previousElementSibling.textContent = 'SALDO DISPONÍVEL';
    const dinheiroCaixa = document.createElement('div'); dinheiroCaixa.id = 'dinheiro-caixa'; dinheiroCaixa.className = 'dinheiro-caixa';
    this.el('saldo').closest('.saldo').append(dinheiroCaixa);
    this.el('som').onclick = () => { this.acoes.som(); this.atualizarSom(); };
    this.el('celular').onclick = () => this.abrir('opcoes');
    this.el('ajuda').onclick = () => this.abrir('ajuda');
    this.atualizarTelaCheia();
    this.el('fullscreen').onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch { this.mensagem('Este navegador não permite tela cheia.'); }
    };
    document.addEventListener('fullscreenchange', () => this.atualizarTelaCheia());
    if (import.meta.env.DEV) this.el('dev-menu').onclick = () => this.abrir('dev');
    this.el('painel').addEventListener('cancel', e => { e.preventDefault(); this.fechar(); });
    this.el('painel').addEventListener('click', e => { if (e.target === this.el('painel')) this.fechar(); });
    this.atualizarSom(); this.atualizar();
  }
  mostrarPausaFoco(pausado) {
    const aviso = this.el('pausa-foco');
    if (aviso.hidden !== !pausado) aviso.hidden = !pausado;
  }
  atualizarTelaCheia() {
    const botao = this.el('fullscreen');
    const emTelaCheia = !!document.fullscreenElement;
    botao.hidden = !document.fullscreenEnabled && !emTelaCheia;
    botao.title = emTelaCheia ? 'Sair da tela cheia' : 'Jogar em tela cheia';
    botao.setAttribute('aria-label', botao.title);
    botao.setAttribute('aria-pressed', String(emTelaCheia));
  }
  atualizarSom() {
    const ligado = this.sim.estado.som;
    this.el('som').innerHTML = icone(ligado ? 'som' : 'mudo');
    this.el('som').setAttribute('aria-label', ligado ? 'Desativar som' : 'Ativar som');
    this.el('som').title = ligado ? 'Desativar som' : 'Ativar som';
    this.el('som').setAttribute('aria-pressed', String(ligado));
  }
  atualizar() {
    const s = this.sim, e = s.estado, m = s.missao();
    this.atualizarBanco();
    this.atualizarEntrega();
    atualizarPainelProducao(this.el('painel-producao'), e);
    const identidade = JSON.stringify(e.personalizacao);
    if (identidade !== this.ultimaIdentidade) {
      const marca = document.querySelector('.marca h1');
      marca.textContent = e.personalizacao.nome;
      const slogan = document.createElement('span'); slogan.textContent = e.personalizacao.slogan; marca.append(slogan);
      marca.title = `${e.personalizacao.nome} · ${e.personalizacao.slogan}`;
      const paleta = PALETAS.find(p => p.id === e.personalizacao.paleta) || PALETAS[0];
      document.documentElement.style.setProperty('--verde', paleta.principal);
      document.documentElement.style.setProperty('--paleta-principal', paleta.principal);
      document.documentElement.style.setProperty('--paleta-destaque', paleta.destaque);
      document.documentElement.style.setProperty('--paleta-parede', paleta.parede);
      document.documentElement.style.setProperty('--paleta-piso', paleta.piso);
      this.ultimaIdentidade = identidade;
    }
    this.el('saldo').textContent = reais(e.dinheiro);
    this.el('clientes').textContent = e.estatisticas.clientes;
    this.el('cestas').textContent = s.cestasNoSuporte;
    this.el('carrinhos-topo').textContent = s.carrinhosNoSuporte;
    this.el('contador-carrinhos-topo').hidden = !s.totalCarrinhos;
    this.el('cestas').closest('.cestas-topo').querySelector('small').textContent = s.totalCarrinhos ? 'cestas / carrinhos livres' : 'cestas livres';
    const nomesReputacao = { ruim: 'Ruim', media: 'Média', boa: 'Boa' };
    const rostosSatisfacao = { ruim: 'irritado', media: 'neutro', boa: 'sorriso' };
    const painelReputacao = this.el('reputacao-painel');
    painelReputacao.classList.remove('ruim', 'media', 'boa'); painelReputacao.classList.add(s.faixaReputacao);
    this.el('satisfacao-rosto').innerHTML = icone(rostosSatisfacao[s.faixaReputacao]);
    painelReputacao.setAttribute('aria-label', `Satisfação ${nomesReputacao[s.faixaReputacao].toLocaleLowerCase('pt-BR')}, ${s.reputacao} de 100`);
    this.el('reputacao-progresso').value = s.reputacao;
    this.el('reputacao-meta').textContent = `${nomesReputacao[s.faixaReputacao]} · ${s.reputacao} / 100`;
    this.el('reputacao-progresso').setAttribute('aria-valuetext', `${s.reputacao} de 100, satisfação ${nomesReputacao[s.faixaReputacao].toLocaleLowerCase('pt-BR')}`);
    atualizarPainelClientes(this.el('painel-clientes'), s.clientes, e.produtos, this.retratosClientes);
    this.el('nivel').textContent = `NÍVEL ${s.nivel}`;
    const clientesProximoNivel = s.nivel * CONFIG.clientesPorNivel;
    const progressoNivel = this.el('nivel-progresso');
    progressoNivel.max = CONFIG.clientesPorNivel;
    progressoNivel.value = this.sim.progressoClientes;
    progressoNivel.setAttribute('aria-valuetext', `${this.sim.progressoClientes} de ${CONFIG.clientesPorNivel} clientes neste nível; ${e.estatisticas.clientes} de ${clientesProximoNivel} clientes no total`);
    this.el('nivel-contagem').textContent = `${e.estatisticas.clientes} / ${clientesProximoNivel}`;
    this.el('objetivo').hidden = m.indice >= 4 && !m.exibir;
    this.el('objetivo-titulo').textContent = m.titulo;
    this.el('objetivo-texto').textContent = m.texto;
    this.el('passo').textContent = m.indice < 4 ? `${String(m.indice + 1).padStart(2, '0')} / 04` : `NÍVEL ${s.nivel}`;
    const inv = e.jogador.inventario;
    this.el('inventario').hidden = inv.length === 0;
    const chave = `${s.capacidade}:${inv.join(',')}`;
    if (chave !== this.ultimoInventario) {
      this.el('capacidade').textContent = `${inv.length} / ${s.capacidade}`;
      this.el('nivel-inventario').textContent = 'Inventário';
      this.el('itens').style.setProperty('--colunas', Math.min(s.capacidade, 8));
      this.el('itens').innerHTML = Array.from({ length: s.capacidade }, (_, i) => `<span class="item ${inv[i] || ''}" title="${inv[i] ? PRODUTOS[inv[i]].nome : 'Espaço livre'}">${inv[i] ? icone(inv[i]) : '<i></i>'}</span>`).join('');
      this.el('itens').setAttribute('aria-label', Object.keys(PRODUTOS).map(id => `${inv.filter(item => item === id).length} ${PRODUTOS[id].plural.toLocaleLowerCase('pt-BR')}`).join(', ') + '.');
      this.ultimoInventario = chave;
    }
    this.el('atividade').textContent = s.atividade;
    this.el('atividade').classList.toggle('visivel', !!s.atividade);
  }
  atualizarDicaMundo(cena) {
    const dica = this.el('dica-mundo');
    if (this.el('painel').open) { dica.hidden = true; return; }
    const missao = this.sim.missao();
    const PRODUTOS = this.sim.produtos;
    const destinos = {
      horta: { ponto: PRODUTOS.tomate.coleta, nome: 'HORTA' },
      milho: { ponto: PRODUTOS.milho.coleta, nome: 'MILHO' },
      prateleira: { ponto: PRODUTOS.tomate.reposicao, nome: 'PRATELEIRA' },
      ovos: { ponto: PRODUTOS.ovos.coleta, nome: 'OVOS' },
      prateleiraOvos: { ponto: PRODUTOS.ovos.reposicao, nome: 'PRATELEIRA DE OVOS' },
      leite: { ponto: PRODUTOS.leite.coleta, nome: 'CURRAL' },
      prateleiraLeite: { ponto: PRODUTOS.leite.reposicao, nome: 'REFRIGERADOR DE LEITE' },
      trigo: { ponto: PRODUTOS.trigo.coleta, nome: 'TRIGO' },
      prateleiraTrigo: { ponto: PRODUTOS.trigo.reposicao, nome: 'PRATELEIRA DE TRIGO' },
      padaria: { ponto: PRODUTOS.pao.reposicao, nome: 'PADARIA' },
      caixa: { ponto: CONFIG.cadeiraCaixa, nome: 'CAIXA' },
    };
    for (const [id, p] of Object.entries(PRODUTOS)) {
      destinos[`coleta-${id}`] = { ponto: p.coleta, nome: p.nome.toLocaleUpperCase('pt-BR') };
      destinos[`prateleira-${id}`] = { ponto: p.reposicao, nome: `BANCA DE ${p.nome.toLocaleUpperCase('pt-BR')}` };
    }
    const destino = destinos[missao.destino];
    if (!destino) { dica.hidden = true; return; }
    const pos = cena.projetar({ ...destino.ponto, y: 2.5 });
    const painelObjetivo = this.el('objetivo').getBoundingClientRect();
    const margemTopo = cena.mobile ? painelObjetivo.bottom + 14 : 130;
    const x = Math.max(65, Math.min(cena.w - 65, pos.x));
    const minimoY = x <= painelObjetivo.right + 20 ? painelObjetivo.bottom + 14 : margemTopo;
    const y = Math.max(minimoY, Math.min(cena.h - 115, pos.y));
    const fora = Math.abs(x - pos.x) > 5 || Math.abs(y - pos.y) > 5;
    const seta = pos.x < x - 5 ? '← ' : pos.x > x + 5 ? '→ ' : pos.y < y - 5 ? '↑ ' : pos.y > y + 5 ? '↓ ' : '';
    dica.textContent = `${fora ? seta : '● '}${destino.nome}`;
    dica.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    dica.hidden = false;
  }
  abrir(tipo) {
    this.tipoPainel = tipo; this.acoes.pausar(true); this.renderizarPainel(); this.el('dica-mundo').hidden = true;
    if (!this.el('painel').open) this.el('painel').showModal();
  }
  fechar() { this.el('painel').close(); this.tipoPainel = null; this.acoes.pausar(false); }
  atualizarBanco() {
    const banco = this.sim.estado.banco;
    const status = statusColeta(banco.coleta);
    const assalto = banco.assalto;
    const riscoAtivo = this.sim.assaltosAtivos && banco.noCaixa >= BANCO.limite && !banco.coleta && !assalto;
    const prazo = this.sim.tempoEsperaAssalto;
    const restante = Math.max(0, prazo - banco.tempoRisco);
    const segundos = Math.ceil(restante);
    const avisoPrazo = this.el('aviso-banco-prazo');
    avisoPrazo.hidden = !riscoAtivo;
    if (riscoAtivo) {
      this.el('aviso-banco-segundos').textContent = `${segundos}s`;
      this.el('aviso-banco-barra').style.width = `${Math.min(100, restante / prazo * 100)}%`;
      const progresso = this.el('aviso-banco-progresso');
      progresso.setAttribute('aria-valuemax', String(prazo));
      progresso.setAttribute('aria-valuenow', String(segundos));
      avisoPrazo.classList.toggle('urgente', restante <= 10);
    }
    const chave = `${this.sim.assaltosAtivos}:${banco.noCaixa}:${status}:${assalto ? `${statusAssalto(assalto)}:${assalto.valor}` : ''}`;
    if (chave === this.ultimoBanco) return;
    this.ultimoBanco = chave;
    const alerta = this.sim.assaltosAtivos && banco.noCaixa >= BANCO.limite && !banco.coleta;
    this.el('dinheiro-caixa').textContent = `No caixa: ${reais(banco.noCaixa)}`;
    this.el('aviso-banco').hidden = !alerta && !banco.coleta && !assalto;
    this.el('aviso-banco').classList.toggle('coleta-em-andamento', !!banco.coleta);
    this.el('aviso-banco').classList.toggle('assalto-em-andamento', !!assalto);
    this.el('aviso-banco-titulo').textContent = assalto ? statusAssalto(assalto) : banco.coleta ? status : 'Dinheiro acumulado no caixa!';
    this.el('aviso-banco-texto').textContent = assalto
      ? assalto.roubado ? `${reais(assalto.valor)} foram roubados do caixa. Reputação: ${this.sim.reputacao} / 100.` : 'Os clientes estão assustados. O caixa corre perigo!'
      : banco.coleta
      ? `Coleta de ${reais(banco.coleta.valor)}. Seu saldo disponível permanece o mesmo.`
      : `${reais(banco.noCaixa)} no caixa. Abra o celular e deposite no banco. Sem depósito, o mercadinho pode ser assaltado.`;
  }
  atualizarEntrega() {
    const caminhao = this.sim.entregas?.caminhao;
    const aguardando = this.sim.temporizadorEntregaAtivo && caminhao?.fase === 'aguardando' && caminhao.tempoEspera < TEMPO_ESPERA_ENTREGA;
    const aviso = this.el('aviso-entrega');
    aviso.hidden = !aguardando;
    if (!aguardando) return;
    const restante = Math.max(0, TEMPO_ESPERA_ENTREGA - caminhao.tempoEspera);
    const segundos = Math.ceil(restante);
    const pacotes = this.sim.estado.deposito.pedidos[0]?.pacotes.length || 0;
    this.el('aviso-entrega-texto').textContent = `${pacotes} ${pacotes === 1 ? 'pacote está chegando' : 'pacotes estão chegando'}.`;
    this.el('aviso-entrega-segundos').textContent = `${segundos}s`;
    this.el('aviso-entrega-barra').style.width = `${restante / TEMPO_ESPERA_ENTREGA * 100}%`;
    this.el('aviso-entrega-progresso').setAttribute('aria-valuenow', String(segundos));
  }
  renderizarPainel() {
    const tipo = this.tipoPainel;
    const titulos = { lixeira: 'Descartar produtos', opcoes: 'Opções do mercado', melhorias: 'Um mercadinho maior', importacoes: 'Importar produtos', ajuda: 'Vamos cuidar da loja?', reiniciar: 'Começar do zero?', dev: 'Ferramentas de teste' };
    let conteudo = '';
    if (tipo === 'lixeira') {
      const inventario = this.sim.estado.jogador.inventario;
      conteudo = `<p class="painel-subtitulo">Escolha o que jogar fora. Produtos descartados não rendem dinheiro e não podem ser recuperados.</p>${Object.entries(PRODUTOS).filter(([id]) => inventario.includes(id)).map(([id, p]) => `<button class="botao-secundario" data-descartar="${id}">${icone(id)} Descartar 1 ${p.nome.toLocaleLowerCase('pt-BR')} · ${inventario.filter(item => item === id).length} no inventário</button>`).join('')}<button class="botao-principal" data-descartar="tudo" ${inventario.length ? '' : 'disabled'}>Esvaziar inventário (${inventario.length})</button><button class="botao-secundario" data-fechar>Voltar à loja</button>`;
    } else if (tipo === 'opcoes') {
      const aberta = this.sim.estado.lojaAberta;
      const temImportacoes = MELHORIAS.some(m => m.tipo === 'importacao' && this.sim.disponibilidadeMelhoria(m.id).disponivel);
      conteudo = `<p class="painel-subtitulo">Gerencie o mercadinho pelo celular, de onde estiver.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div><button class="botao-secundario" id="abrir-melhorias">${icone('melhorar')} Melhorias</button>${temImportacoes ? `<button class="botao-secundario" id="abrir-importacoes">${icone('importacao')} Importar produtos</button>` : ''}<button class="botao-secundario" id="abrir-personalizacao">${icone('loja')} Personalizar mercadinho</button><button class="botao-principal acao-loja ${aberta ? 'fechar' : 'abrir'}" id="alternar-loja">${icone(aberta ? 'fecharLoja' : 'abrirLoja')} ${aberta ? 'Fechar mercado' : 'Abrir mercado'}</button><p class="nota central">${aberta ? 'O mercado está aberto para novos clientes.' : 'O mercado está fechado. Clientes que já entraram continuam suas compras.'}</p>`;
      const banco = this.sim.estado.banco;
      conteudo += `<section class="deposito-banco"><h3>Depósito bancário</h3>
        <dl><div><dt>Dinheiro no caixa</dt><dd>${reais(banco.noCaixa)}</dd></div><div><dt>Total depositado</dt><dd>${reais(banco.depositado)}</dd></div></dl>
        <p>${banco.assalto ? statusAssalto(banco.assalto) + '.' : banco.coleta ? statusColeta(banco.coleta) + '.' : 'A partir de R$ 1.000, solicite o carro-forte para recolher o dinheiro.'}</p>
        <button class="botao-principal" id="depositar-banco" ${banco.coleta || banco.assalto || banco.noCaixa < BANCO.limite ? 'disabled' : ''}>${icone('moeda')} ${banco.assalto ? 'Aguarde o fim do assalto' : banco.coleta ? 'Coleta em andamento' : 'Depositar no banco'}</button>
        <p class="deposito-nota">O depósito protege o dinheiro sem alterar seu saldo disponível.</p></section>`;
    } else if (tipo === 'melhorias') {
      const abasDisponiveis = ABAS_MELHORIAS.filter(aba => MELHORIAS.some(m => m.categoria === aba.id && m.ativa !== false));
      const abaAtiva = abasDisponiveis.find(aba => aba.id === this.abaMelhorias) ?? abasDisponiveis[0];
      const melhorias = MELHORIAS.filter(m => m.categoria === abaAtiva.id && m.ativa !== false).sort((a, b) => a.nivelMinimo - b.nivelMinimo);
      const abas = `<div class="abas-melhorias" role="tablist" aria-label="Tipo de melhoria">${abasDisponiveis.map(aba => `<button class="aba-melhoria ${aba.id === abaAtiva.id ? 'ativa' : ''}" id="aba-${aba.id}" role="tab" aria-selected="${aba.id === abaAtiva.id}" aria-controls="lista-melhorias" tabindex="${aba.id === abaAtiva.id ? 0 : -1}" data-aba-melhoria="${aba.id}">${aba.titulo}</button>`).join('')}</div>`;
      conteudo = `<p class="painel-subtitulo">Cada venda abre novas possibilidades.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div>${abas}<div class="lista-melhorias" id="lista-melhorias" role="tabpanel" aria-labelledby="aba-${abaAtiva.id}">${melhorias.map(m => {
        const nivel = this.sim.estado.melhorias[m.id], completa = !m.recorrente && nivel >= m.max, custo = this.sim.custoMelhoria(m.id);
        const disponibilidade = this.sim.disponibilidadeMelhoria(m.id), pode = disponibilidade.disponivel && this.sim.estado.dinheiro >= custo;
        const nivelExibido = m.id === 'mochila' ? nivel + 1 : nivel;
        const maxExibido = m.id === 'mochila' ? m.max + 1 : m.max;
        const rotulo = completa ? icone('certo') + ' Pronto' : m.ativa === false ? 'Em breve' : !disponibilidade.disponivel ? disponibilidade.requisitoProduto ? 'Ovos' : disponibilidade.requisitoMelhoria ? 'Requer melhoria' : disponibilidade.nivelMinimo ? `Nível ${disponibilidade.nivelMinimo}` : 'Sem espaço' : reais(custo);
        const aria = completa ? `${m.titulo} concluída` : !disponibilidade.disponivel ? disponibilidade.motivo : `Comprar ${m.titulo} por ${reais(custo)}`;
        return `<div class="melhoria ${completa ? 'concluida' : ''}"><span class="melhoria-icone ${m.id}">${icone(m.icone)}</span><div><h3>${m.titulo}</h3><p>${m.descricao}</p>${m.produto ? `<strong class="preco-venda-melhoria">Preço de venda: ${reais(PRODUTOS[m.produto].preco)}</strong>` : ''}<span class="nivel-melhoria">${m.max > 1 && !m.recorrente ? `Nível ${nivelExibido} de ${maxExibido} · ` : ''}Disponível no nível ${m.nivelMinimo || 1}</span>${!completa && disponibilidade.requisitoMelhoria ? `<p class="requisito-melhoria">${disponibilidade.motivo}</p>` : ''}</div><button class="comprar" data-melhoria="${m.id}" ${completa || !pode ? 'disabled' : ''} aria-label="${aria}">${rotulo}</button></div>`;
      }).join('')}</div><button class="botao-secundario" id="voltar-opcoes">Voltar às opções</button>`;
    } else if (tipo === 'importacoes') {
      const importacoes = MELHORIAS.filter(m => m.categoria === 'importados' && m.ativa !== false).sort((a, b) => a.nivelMinimo - b.nivelMinimo);
      let saldoRestante = this.sim.estado.dinheiro;
      const espacoRestante = Object.fromEntries(Object.keys(CLASSES_PRODUTOS).map(classe => [classe, vagasDeposito(this.sim.estado.deposito, classe)]));
      for (const m of importacoes) {
        const produto = PRODUTOS[m.produto];
        const disponibilidade = this.sim.disponibilidadeMelhoria(m.id), custo = this.sim.custoMelhoria(m.id);
        const maxEspaco = espacoRestante[produto.classe] || 0;
        const pedida = Math.max(0, this.quantidadesImportacao[m.id] || 0);
        const quantidade = disponibilidade.disponivel ? Math.min(pedida, maxEspaco, Math.floor(saldoRestante / custo)) : 0;
        this.quantidadesImportacao[m.id] = quantidade;
        saldoRestante -= quantidade * custo;
        espacoRestante[produto.classe] -= quantidade;
      }
      const totalPedido = importacoes.reduce((total, m) => total + this.quantidadesImportacao[m.id] * this.sim.custoMelhoria(m.id), 0);
      const totalCaixas = importacoes.reduce((total, m) => total + this.quantidadesImportacao[m.id], 0);
      const entregaEmAndamento = !!(this.sim.estado.deposito.pedidos.length || this.sim.entregas?.caminhao);
      const motivoEspera = entregaEmAndamento ? 'Aguarde o caminhão concluir a entrega e ir embora antes de fazer outro pedido.' : '';
      conteudo = `<p class="painel-subtitulo">Até 4 caixas por classe no depósito. As caixas comuns têm 9 produtos; Soda tem 24 latas por caixa e fica no chão, no canto.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div><div class="lista-melhorias">${importacoes.map(m => {
        const produto = PRODUTOS[m.produto];
        const custo = this.sim.custoMelhoria(m.id), disponibilidade = this.sim.disponibilidadeMelhoria(m.id);
        const caixasPorEspaco = espacoRestante[produto.classe] + this.quantidadesImportacao[m.id];
        const quantidade = this.quantidadesImportacao[m.id];
        const maxCaixas = disponibilidade.disponivel ? Math.min(caixasPorEspaco, quantidade + Math.floor((this.sim.estado.dinheiro - totalPedido) / custo)) : 0;
        return `<div class="melhoria melhoria-importacao"><span class="melhoria-icone ${m.id}">${icone(m.icone)}</span><div><h3>${m.titulo}</h3><p>${m.descricao}</p><strong class="preco-venda-melhoria">Preço de venda: ${reais(produto.preco)}</strong>${!disponibilidade.disponivel && !entregaEmAndamento ? `<p class="requisito-melhoria">${disponibilidade.motivo}</p>` : ''}</div><div class="controles-importacao"><div class="contador-importacao" aria-label="Quantidade de caixas de ${m.titulo}"><button data-importacao="${m.id}" data-importacao-quantidade="-1" ${quantidade <= 0 ? 'disabled' : ''} aria-label="Diminuir quantidade de ${m.titulo}">−</button><strong>${quantidade}</strong><button data-importacao="${m.id}" data-importacao-quantidade="1" ${quantidade >= maxCaixas ? 'disabled' : ''} aria-label="Aumentar quantidade de ${m.titulo}">+</button></div></div></div>`;
      }).join('')}</div><div class="rodape-importacao">${motivoEspera ? `<p class="requisito-importacao">${motivoEspera}</p>` : ''}<span><b>${totalCaixas}</b> ${totalCaixas === 1 ? 'caixa' : 'caixas'} no pedido · entrega por caminhão</span><button class="botao-principal" id="finalizar-importacao" ${totalCaixas ? '' : 'disabled'}>Finalizar pedido · ${reais(totalPedido)}</button></div><button class="botao-secundario" id="voltar-opcoes">Voltar às opções</button>`;
    } else if (tipo === 'personalizacao') {
      titulos.personalizacao = 'Sua loja, do seu jeito';
      conteudo = `<p class="painel-subtitulo">Dê personalidade ao seu cantinho do bairro.</p>
        <form id="form-personalizacao" class="form-personalizacao">
          <div class="previa-loja" id="previa-loja"><small>SEU MERCADINHO</small><strong id="previa-nome"></strong><span id="previa-slogan"></span><div class="previa-toldo"></div></div>
          <label for="nome-loja">Nome do mercadinho</label><input id="nome-loja" name="nome" maxlength="32" required autocomplete="off">
          <label for="slogan-loja">Slogan</label><input id="slogan-loja" name="slogan" maxlength="60" required autocomplete="off">
          <fieldset><legend>Paleta de cores</legend><div class="paletas-loja">${PALETAS.map(p => `<label class="paleta-loja"><input type="radio" name="paleta" value="${p.id}" ${p.id === this.sim.estado.personalizacao.paleta ? 'checked' : ''}><span class="paleta-cores" aria-hidden="true">${[p.principal,p.destaque,p.parede,p.piso].map(cor => `<i style="background:${cor}"></i>`).join('')}</span><span>${p.nome}</span></label>`).join('')}</div></fieldset>
          <button type="submit" class="botao-principal">Salvar personalização</button><button type="button" class="botao-secundario" id="voltar-personalizacao">Voltar às opções</button>
        </form>`;
    } else if (tipo === 'ajuda') {
      conteudo = `<p class="painel-subtitulo">Colha, abasteça, venda. E veja a loja crescer.</p>
        <p class="nota">Versão ${versaoJogo}</p>
        <div class="guia-controles">${icone('toque')}<div><h3>Arraste para andar</h3><p>Toque e segure em qualquer parte do cenário. Arraste na direção desejada. Solte para parar.</p><p>No computador, também vale usar <b>W A S D</b> ou as <b>setas</b>.</p><p>Para mover o mapa, arraste com o <b>botão direito</b> ou <b>Shift</b>; no celular, use <b>dois dedos</b>. <b>Shift + setas</b> também move a câmera. Para aproximar ou afastar, use a <b>roda do mouse</b> ou a <b>pinça com dois dedos</b>.</p></div></div>
          <ol class="guia-passos"><li><span>1</span><div><b>Colha na horta</b><p>Fique perto dos tomates ou do milho.</p></div></li><li><span>2</span><div><b>Abasteça a loja</b><p>Leve os produtos à prateleira correspondente.</p></div></li><li><span>3</span><div><b>Atenda no caixa</b><p>Sente-se na cadeira do caixa para receber o pagamento. Cada 25 clientes atendidos aumenta o nível.</p></div></li><li><span>4</span><div><b>Abra a ala dos ovos</b><p>No nível 4, construa o galinheiro. As galinhas produzem ovos automaticamente.</p></div></li><li><span>5</span><div><b>Abra a ala do leite</b><p>No nível 5, construa o curral por R$ 800. Recolha as garrafas de vidro e abasteça a prateleira de leite.</p></div></li><li><span>6</span><div><b>Cuide da satisfação</b><p>Pedido completo vale 10 pontos; parcial, 5; vazio, 0.</p></div></li><li><span>7</span><div><b>Use o celular</b><p>Abra o botão de celular no topo para melhorar e personalizar o mercadinho.</p></div></li></ol>
        <p class="nota">No nível 7, abra a ala do trigo por R$ 400. Colha na plantação entre o galinheiro e o curral e abasteça a nova prateleira. Cada trigo vale R$ 5.</p>
        <p class="nota">No nível 9, abra a padaria por R$ 1.400. A loja se amplia à direita. Entregue trigo na caixa ao fundo da padaria; o balcão fica de frente para o hortifruti. Um padeiro opera o processador no topo e o forno embaixo, produzindo três pães por trigo. Cada pão vale R$ 10.</p>
        <p class="nota">Abra a estufa no nível 9 e melhore sua cesta no nível 10. Depois, construa o apiário no nível 14, a queijaria no nível 15 e a cozinha de geleias no nível 17. A irrigação do nível 16 acelera o crescimento das hortas.</p>
        <p class="nota">Nas oficinas, aproxime-se com os ingredientes para entregá-los. Uma garrafa de leite rende 2 queijos; 2 morangos e 1 mel rendem 3 geleias. Recolha os produtos prontos e abasteça as bancas. O repositor também coleta a produção pronta. Os novos produtos só entram nos pedidos depois do primeiro abastecimento.</p>
        <p class="nota">No nível 16, construa o estacionamento pelo celular por R$ 10.000. As seis vagas começam vazias. Parte dos clientes chega nos carros da rua, estaciona, faz compras e volta ao próprio veículo. Passantes e compradores a pé continuam circulando pela calçada.</p>
        <p class="nota">No nível 21, compre a Prateleira de biscoitos e enlatados por R$ 1.000. No nível 22, compre a Prateleira de mantimentos e cereais por R$ 1.000. Cada compra exige a expansão e habilita a importação das duas categorias pelo celular. Peça caixas com 9 unidades: enlatados por R$ 270, biscoitos e doces por R$ 360, mantimentos por R$ 315 e cereais por R$ 405. Cada classe tem uma estante no depósito com espaço para quatro caixas; pedidos a caminho também reservam vagas.</p>
        <p class="nota">No nível 20, compre Expansão em Melhorias → Mercado por R$ 10.000, após a padaria. Um novo anexo é construído atrás da loja e da cozinha, mantendo as divisórias e os móveis existentes. A fazenda recua; use a porta de produção e a nova saída dos fundos. O depósito e o pátio permitem receber as importações liberadas pelas gôndolas dos níveis 21 e 22.</p>
        <p class="nota">As ações acontecem automaticamente quando você se aproxima. Seu progresso é salvo neste navegador.</p><button class="botao-principal" data-fechar>Vamos jogar ${icone('seta')}</button>`;
    } else if (tipo === 'dev') {
      const proximaReputacao = Math.min(100, Math.ceil((this.sim.reputacao + 1) / 10) * 10);
      conteudo = `<div class="dev-painel">
        <p class="painel-subtitulo">Ajuste o progresso para testar o jogo.</p>
        <p class="nota">Versão ${versaoJogo}</p>
        <section class="dev-cartao dev-dinheiro" aria-label="Dinheiro">
          <div class="dev-cartao-topo"><span class="dev-rotulo">${icone('moeda')} Saldo disponível</span><strong>${reais(this.sim.estado.dinheiro)}</strong></div>
          <p>No caixa: ${reais(this.sim.estado.banco.noCaixa)}. Os botões ajustam os dois valores para testar depósitos.</p>
          <div class="dev-acoes dev-acoes-duplas"><button id="dev-remover" ${this.sim.estado.dinheiro < 1000 ? 'disabled' : ''}>− R$ 1.000</button><button id="dev-adicionar">+ R$ 1.000</button></div>
        </section>
        <section class="dev-cartao" aria-label="Estoque das prateleiras">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Estoque</span><strong>Prateleiras</strong></div>
          <p>Encher reinicia o repositor. Esvaziar também reinicia clientes, cestas, carros e repositor.</p>
          <div class="dev-acoes dev-acoes-duplas"><button id="dev-esvaziar-prateleiras">Esvaziar todas</button><button id="dev-preencher-prateleiras">Encher todas</button></div>
        </section>
        <section class="dev-cartao" aria-label="Estoque do depósito">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Estoque</span><strong>Depósito</strong></div>
          <p>Esvazie ou complete as estantes dos produtos importados já liberados. Pedidos a caminho são preservados.</p>
          <div class="dev-acoes dev-acoes-duplas"><button id="dev-esvaziar-deposito" ${this.sim.depositoEntregaEmAndamento ? 'disabled' : ''}>Esvaziar estantes</button><button id="dev-preencher-deposito" ${this.sim.depositoEntregaEmAndamento ? 'disabled' : ''}>Encher estantes</button></div>
        </section>
        <section class="dev-cartao" aria-label="Tempo até o assalto">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Prazo para depositar</span><strong>${this.sim.tempoEsperaAssalto}<small> s</small></strong></div>
          <p>Com R$ 1.000 ou mais no caixa, o assalto começa após esse tempo. Decorridos: ${Math.floor(this.sim.estado.banco.tempoRisco)} s. A mudança vale imediatamente.</p>
          <div class="dev-acoes dev-acoes-duplas" aria-label="Prazo até o assalto">
            <button data-tempo-assalto="5" aria-pressed="${this.sim.tempoEsperaAssalto === 5}">5 segundos</button>
            <button data-tempo-assalto="60" aria-pressed="${this.sim.tempoEsperaAssalto === 60}">60 segundos</button>
          </div>
        </section>
        <section class="dev-cartao" aria-label="Assaltos">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Assaltos</span><strong>${this.sim.assaltosAtivos ? 'Ativados' : 'Desativados'}</strong></div>
          <p>Desativar cancela o assalto atual e impede novos assaltos. A escolha fica salva neste navegador.</p>
          <div class="dev-acoes"><button id="dev-assaltos" aria-pressed="${!this.sim.assaltosAtivos}">${this.sim.assaltosAtivos ? 'Desativar assaltos' : 'Ativar assaltos'}</button></div>
        </section>
        <section class="dev-cartao" aria-label="Temporizador de entrega">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Temporizador de entrega</span><strong>${this.sim.temporizadorEntregaAtivo ? 'Ativado' : 'Desativado'}</strong></div>
          <p>Desativar remove a espera de 60 segundos antes da chegada do caminhão. A escolha fica salva neste navegador.</p>
          <div class="dev-acoes"><button id="dev-temporizador-entrega" aria-pressed="${!this.sim.temporizadorEntregaAtivo}">${this.sim.temporizadorEntregaAtivo ? 'Desativar temporizador' : 'Ativar temporizador'}</button></div>
        </section>
        <div class="dev-progresso">
          <section class="dev-cartao" aria-label="Nível">
            <div class="dev-cartao-topo"><span class="dev-rotulo">Nível</span><strong>${this.sim.nivel}</strong></div>
            <p>Clientes por nível. A escolha vale até recarregar a página.</p>
            <div class="dev-acoes dev-acoes-duplas" aria-label="Clientes necessários para subir de nível">
              <button data-clientes-por-nivel="1" aria-pressed="${CONFIG.clientesPorNivel === 1}">1 cliente</button>
              <button data-clientes-por-nivel="25" aria-pressed="${CONFIG.clientesPorNivel === 25}">25 clientes</button>
            </div>
            <div class="dev-acoes"><button id="dev-nivel">+ 1 nível</button></div>
          </section>
          <section class="dev-cartao" aria-label="Reputação">
            <div class="dev-cartao-topo"><span class="dev-rotulo">Reputação</span><strong>${this.sim.reputacao}<small> / 100</small></strong></div>
            <progress value="${this.sim.reputacao}" max="100" aria-label="Reputação atual"></progress>
            <div class="dev-acoes"><button id="dev-reputacao" ${this.sim.reputacao >= 100 ? 'disabled' : ''}>${this.sim.reputacao >= 100 ? 'No máximo' : `Aumentar para ${proximaReputacao}`}</button></div>
          </section>
        </div>
        <div class="dev-rodape"><button id="dev-reset">${icone('reiniciar')} Zerar todo o progresso</button></div>
      </div>`;
    } else {
      conteudo = `<p class="painel-subtitulo">O dinheiro, as melhorias e o progresso deste mercadinho serão apagados neste navegador.</p><button class="botao-principal perigo" id="confirmar-reinicio">${icone('reiniciar')} Apagar e começar de novo</button><button class="botao-secundario" id="cancelar-reinicio">Voltar para minha loja</button>`;
    }
    this.el('painel-conteudo').innerHTML = `<div class="painel-cabecalho"><span class="painel-simbolo">${icone(tipo === 'melhorias' ? 'folha' : tipo === 'importacoes' ? 'importacao' : tipo === 'dev' ? 'dev' : tipo === 'opcoes' ? 'celular' : 'loja')}</span><button class="botao-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button></div><h2 id="painel-titulo">${titulos[tipo]}</h2>${conteudo}`;
    this.el('painel').querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => this.fechar());
    this.el('painel').querySelectorAll('[data-descartar]').forEach(b => b.onclick = () => {
      const resultado = this.acoes.descartar(b.dataset.descartar === 'tudo' ? null : b.dataset.descartar);
      if (!resultado.sucesso) { this.mensagem(resultado.motivo); return; }
      this.atualizar();
      if (this.sim.estado.jogador.inventario.length) this.renderizarPainel();
      else this.fechar();
      this.mensagem(`${resultado.quantidade} ${resultado.quantidade === 1 ? 'produto descartado' : 'produtos descartados'}.`);
    });
    this.el('painel').querySelectorAll('[data-aba-melhoria]').forEach(b => b.onclick = () => {
      this.abaMelhorias = b.dataset.abaMelhoria;
      this.renderizarPainel();
    });
    this.el('painel').querySelectorAll('[data-melhoria]').forEach(b => b.onclick = () => {
      const resultado = this.acoes.comprar(b.dataset.melhoria);
      if (resultado.selecionarProduto) {
        this.fechar();
        this.iniciarSelecaoHorta();
        this.acoes.iniciarSelecaoHorta();
      } else if (resultado.sucesso) {
        this.renderizarPainel();
      } else this.mensagem(resultado.motivo);
      this.atualizar();
    });
    this.el('painel').querySelectorAll('[data-importacao-quantidade]').forEach(b => b.onclick = () => {
      this.quantidadesImportacao[b.dataset.importacao] += Number(b.dataset.importacaoQuantidade);
      this.renderizarPainel();
    });
    if (tipo === 'importacoes') this.el('finalizar-importacao').onclick = () => {
      const resultado = this.acoes.encomendarImportacoes(this.quantidadesImportacao);
      this.quantidadesImportacao = {};
      this.atualizar();
      if (resultado.sucesso) this.fechar();
      else this.renderizarPainel();
      if (!resultado.sucesso) this.mensagem(resultado.motivo);
    };
    if (tipo === 'opcoes') {
      this.el('depositar-banco').onclick = () => {
        const resultado = this.acoes.depositarBanco();
        if (resultado.sucesso) { this.fechar(); this.mensagem('Carro-forte chamado! Um agente vai recolher o dinheiro no caixa.'); }
        else this.mensagem(resultado.motivo);
        this.atualizar();
      };
      this.el('abrir-melhorias').onclick = () => this.abrir('melhorias');
      const abrirImportacoes = this.el('abrir-importacoes');
      if (abrirImportacoes) abrirImportacoes.onclick = () => this.abrir('importacoes');
      this.el('abrir-personalizacao').onclick = () => this.abrir('personalizacao');
      this.el('alternar-loja').onclick = () => {
        const aberta = this.acoes.alternarLoja();
        this.renderizarPainel();
        this.mensagem(aberta ? 'Mercado aberto!' : 'Mercado fechado para novos clientes.');
      };
    }
    if (tipo === 'melhorias' || tipo === 'importacoes') this.el('voltar-opcoes').onclick = () => this.abrir('opcoes');
    if (tipo === 'reiniciar') {
      this.el('cancelar-reinicio').onclick = () => this.fechar();
      this.el('confirmar-reinicio').onclick = () => this.acoes.reiniciar();
    }
    if (tipo === 'dev') {
      this.el('dev-assaltos').onclick = () => this.acoes.alternarAssaltosDev();
      this.el('dev-temporizador-entrega').onclick = () => this.acoes.alternarTemporizadorEntregaDev();
      this.el('painel-conteudo').querySelectorAll('[data-tempo-assalto]').forEach(botao => {
        botao.onclick = () => this.acoes.definirTempoAssalto(Number(botao.dataset.tempoAssalto));
      });
      this.el('dev-remover').onclick = () => this.acoes.alterarSaldo(-1000);
      this.el('dev-adicionar').onclick = () => this.acoes.alterarSaldo(1000);
      this.el('dev-preencher-prateleiras').onclick = () => this.acoes.preencherPrateleirasDev();
      this.el('dev-esvaziar-prateleiras').onclick = () => this.acoes.esvaziarPrateleirasDev();
      this.el('dev-preencher-deposito').onclick = () => this.acoes.preencherDepositoDev();
      this.el('dev-esvaziar-deposito').onclick = () => this.acoes.esvaziarDepositoDev();
      this.el('dev-nivel').onclick = () => this.acoes.aumentarNivelDev();
      this.el('dev-reputacao').onclick = () => this.acoes.aumentarReputacaoDev();
      this.el('dev-reset').onclick = () => this.abrir('reiniciar');
      this.el('painel-conteudo').querySelectorAll('[data-clientes-por-nivel]').forEach(botao => {
        botao.onclick = () => this.acoes.definirClientesPorNivel(Number(botao.dataset.clientesPorNivel));
      });
    }
    if (tipo === 'personalizacao') {
      const form = this.el('form-personalizacao');
      this.el('nome-loja').value = this.sim.estado.personalizacao.nome;
      this.el('slogan-loja').value = this.sim.estado.personalizacao.slogan;
      const atualizarPrevia = () => {
        const paleta = PALETAS.find(p => p.id === form.elements.paleta.value) || PALETAS[0];
        this.el('previa-nome').textContent = form.elements.nome.value || 'Seu mercadinho';
        this.el('previa-slogan').textContent = form.elements.slogan.value;
        this.el('previa-loja').style.setProperty('--cor-loja', paleta.principal);
        this.el('previa-loja').style.setProperty('--cor-toldo', paleta.destaque);
      };
      form.oninput = atualizarPrevia; atualizarPrevia();
      form.onsubmit = evento => {
        evento.preventDefault();
        const salvo = this.acoes.personalizar(Object.fromEntries(new FormData(form)));
        if (salvo) this.mensagem('Seu mercadinho ganhou uma nova identidade!');
      };
      this.el('voltar-personalizacao').onclick = () => this.abrir('opcoes');
    }
  }
  mensagem(texto) {
    clearTimeout(this.tempoMensagem); this.el('mensagens').textContent = texto;
    this.el('mensagens').classList.add('visivel');
    this.tempoMensagem = setTimeout(() => this.el('mensagens').classList.remove('visivel'), 3200);
  }
  iniciarSelecaoHorta() {
    this.el('mundo').classList.add('selecionando-horta');
    this.el('cursor-melhoria').hidden = false;
    this.mensagem('Clique na horta de tomate ou milho para aplicar o produto.');
  }
  moverCursorHorta(x, y) {
    const cursor = this.el('cursor-melhoria');
    cursor.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
  }
  finalizarSelecaoHorta() {
    this.el('mundo').classList.remove('selecionando-horta');
    this.el('cursor-melhoria').hidden = true;
  }
  subiuDeNivel(nivel) {
    const indicador = this.el('nivel');
    indicador.textContent = `NÍVEL ${nivel}`;
    indicador.classList.remove('subindo');
    void indicador.offsetWidth;
    indicador.classList.add('subindo');
    clearTimeout(this.tempoAnimacaoNivel);
    this.tempoAnimacaoNivel = setTimeout(() => indicador.classList.remove('subindo'), 1800);
  }
  venda(valor, ponto) {
    const el = document.createElement('div'); el.className = 'dinheiro-flutuante'; el.textContent = `+ ${reais(valor)}`;
    el.style.left = `${ponto.x}px`; el.style.top = `${ponto.y}px`; this.el('efeitos').append(el);
    setTimeout(() => el.remove(), 1600);
    this.el('saldo').animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 350 });
  }
}
