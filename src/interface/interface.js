import { icone } from './icones.js';
import { PALETAS } from '../jogo/personalizacao.js';
import { CONFIG, MELHORIAS, PRODUTOS } from '../jogo/configuracao.js';
import { BANCO, statusColeta } from '../jogo/banco.js';
import { statusAssalto } from '../jogo/assalto.js';
import { atualizarPainelClientes } from './clientes.js';
const reais = v => `R$ ${v.toLocaleString('pt-BR')}`;
const ABAS_MELHORIAS = [
  { id: 'mercado', titulo: 'Mercado' },
  { id: 'funcionarios', titulo: 'Funcionários' },
  { id: 'jogador', titulo: 'Jogador' }
];

export class Interface {
  constructor(sim, acoes) {
    this.sim = sim; this.acoes = acoes; this.ultimoInventario = ''; this.ultimaAtualizacao = ''; this.abaMelhorias = 'mercado';
    document.getElementById('app').innerHTML = `
      <main class="jogo" aria-label="Mercadinho do Bairro">
        <div id="mundo"></div><div id="etiquetas" aria-hidden="true"><div id="dica-mundo" hidden></div></div>
        <header class="cabecalho">
          <div class="marca"><div class="marca-topo"><span class="marca-icone">${icone('loja')}</span><div><h1>Mercadinho<span>do Bairro</span></h1></div></div><div class="progresso-nivel"><progress id="nivel-progresso" value="0" max="25" aria-label="Progresso para o próximo nível"></progress><span id="nivel-contagem">0 / 25</span><span class="nivel" id="nivel" role="status" aria-live="polite">NÍVEL 1</span></div></div>
          <div class="saldo" aria-label="Resumo do mercado"><div class="saldo-linha"><span class="moeda">${icone('moeda')}</span><div><small>SEU CAIXA</small><strong id="saldo">R$ 0</strong></div><div class="vendas"><span>${icone('pessoa')}<b id="clientes">0</b></span><small>clientes atendidos</small></div><div class="vendas cestas-topo"><span>${icone('cesta')}<b id="cestas">${this.sim.cestasNoSuporte}</b></span><small>cestas livres</small></div></div><div class="reputacao-topo media" id="reputacao-painel" aria-label="Satisfação média, 60 de 100"><span class="satisfacao-rosto" id="satisfacao-rosto">${icone('neutro')}</span><progress id="reputacao-progresso" value="60" max="100" aria-label="Satisfação do mercadinho"></progress><small id="reputacao-meta">Média · 60 / 100</small></div></div>
          <nav class="ferramentas" aria-label="Opções do jogo">
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
        <aside class="objetivo" id="objetivo" aria-label="Objetivo atual">
          <div class="objetivo-topo"><span>${icone('alvo')} PRÓXIMO PASSO</span><span id="passo">01 / 04</span></div>
          <h2 id="objetivo-titulo">Da horta para a loja</h2><p id="objetivo-texto"></p>
        </aside>
        <div id="atividade" role="status"></div>
        <div class="controles-dica"><span class="teclas"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span><b>Seu ritmo. Seu mercadinho.</b><span>Arraste para andar · botão direito ou dois dedos para mover o mapa</span></span></div>
        <footer class="rodape">
          <div class="inventario" id="inventario" hidden><div class="inventario-conteudo"><div class="inventario-titulo"><b id="nivel-inventario">Inventário</b><span id="capacidade">${this.sim.estado.jogador.inventario.length} / ${this.sim.capacidade}</span></div><div id="itens"></div></div></div>
        </footer>
        <div id="joystick" aria-hidden="true"><span></span></div>
        <div id="mensagens" hidden aria-live="polite" aria-atomic="true"></div>
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
    this.el('saldo').previousElementSibling.textContent = 'SALDO DISPONÍVEL';
    const dinheiroCaixa = document.createElement('div'); dinheiroCaixa.id = 'dinheiro-caixa'; dinheiroCaixa.className = 'dinheiro-caixa';
    this.el('saldo').closest('.saldo').append(dinheiroCaixa);
    this.el('som').onclick = () => { this.acoes.som(); this.atualizarSom(); };
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
      escritorio: { ponto: CONFIG.cadeiraEscritorio, nome: 'ESCRITÓRIO' }
    };
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
    const riscoAtivo = banco.noCaixa >= BANCO.limite && !banco.coleta && !assalto;
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
    const chave = `${banco.noCaixa}:${status}:${assalto ? `${statusAssalto(assalto)}:${assalto.valor}` : ''}`;
    if (chave === this.ultimoBanco) return;
    this.ultimoBanco = chave;
    const alerta = banco.noCaixa >= BANCO.limite && !banco.coleta;
    this.el('dinheiro-caixa').textContent = `No caixa: ${reais(banco.noCaixa)}`;
    this.el('aviso-banco').hidden = !alerta && !banco.coleta && !assalto;
    this.el('aviso-banco').classList.toggle('coleta-em-andamento', !!banco.coleta);
    this.el('aviso-banco').classList.toggle('assalto-em-andamento', !!assalto);
    this.el('aviso-banco-titulo').textContent = assalto ? statusAssalto(assalto) : banco.coleta ? status : 'Dinheiro acumulado no caixa!';
    this.el('aviso-banco-texto').textContent = assalto
      ? assalto.roubado ? `${reais(assalto.valor)} foram roubados do caixa. Reputação: ${this.sim.reputacao} / 100.` : 'Os clientes estão assustados. O caixa corre perigo!'
      : banco.coleta
      ? `Coleta de ${reais(banco.coleta.valor)}. Seu saldo disponível permanece o mesmo.`
      : `${reais(banco.noCaixa)} no caixa. Vá ao escritório e deposite no banco. Sem depósito, o mercadinho pode ser assaltado.`;
  }
  renderizarPainel() {
    const tipo = this.tipoPainel;
    const titulos = { escritorio: 'Gerenciamento do mercado', melhorias: 'Um mercadinho maior', ajuda: 'Vamos cuidar da loja?', reiniciar: 'Começar do zero?', dev: 'Ferramentas de teste' };
    let conteudo = '';
    if (tipo === 'escritorio') {
      const aberta = this.sim.estado.lojaAberta;
      conteudo = `<p class="painel-subtitulo">Gerencie o mercadinho sem sair do escritório.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div><button class="botao-secundario" id="abrir-melhorias">${icone('melhorar')} Melhorias</button><button class="botao-secundario" id="abrir-personalizacao">${icone('loja')} Personalizar mercadinho</button><button class="botao-principal acao-loja ${aberta ? 'fechar' : 'abrir'}" id="alternar-loja">${icone(aberta ? 'fecharLoja' : 'abrirLoja')} ${aberta ? 'Fechar mercado' : 'Abrir mercado'}</button><p class="nota central">${aberta ? 'O mercado está aberto para novos clientes.' : 'O mercado está fechado. Clientes que já entraram continuam suas compras.'}</p>`;
      const banco = this.sim.estado.banco;
      conteudo += `<section class="deposito-banco"><h3>Depósito bancário</h3>
        <dl><div><dt>Dinheiro no caixa</dt><dd>${reais(banco.noCaixa)}</dd></div><div><dt>Total depositado</dt><dd>${reais(banco.depositado)}</dd></div></dl>
        <p>${banco.assalto ? statusAssalto(banco.assalto) + '.' : banco.coleta ? statusColeta(banco.coleta) + '.' : 'A partir de R$ 1.000, solicite o carro-forte para recolher o dinheiro.'}</p>
        <button class="botao-principal" id="depositar-banco" ${banco.coleta || banco.assalto || banco.noCaixa < BANCO.limite ? 'disabled' : ''}>${icone('moeda')} ${banco.assalto ? 'Aguarde o fim do assalto' : banco.coleta ? 'Coleta em andamento' : 'Depositar no banco'}</button>
        <p class="deposito-nota">O depósito protege o dinheiro sem alterar seu saldo disponível.</p></section>`;
    } else if (tipo === 'melhorias') {
      const abasDisponiveis = ABAS_MELHORIAS.filter(aba => MELHORIAS.some(m => m.categoria === aba.id && m.ativa !== false));
      const abaAtiva = abasDisponiveis.find(aba => aba.id === this.abaMelhorias) ?? abasDisponiveis[0];
      const melhorias = MELHORIAS.filter(m => m.categoria === abaAtiva.id && m.ativa !== false);
      const abas = `<div class="abas-melhorias" role="tablist" aria-label="Tipo de melhoria">${abasDisponiveis.map(aba => `<button class="aba-melhoria ${aba.id === abaAtiva.id ? 'ativa' : ''}" id="aba-${aba.id}" role="tab" aria-selected="${aba.id === abaAtiva.id}" aria-controls="lista-melhorias" tabindex="${aba.id === abaAtiva.id ? 0 : -1}" data-aba-melhoria="${aba.id}">${aba.titulo}</button>`).join('')}</div>`;
      conteudo = `<p class="painel-subtitulo">Cada venda abre novas possibilidades.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div>${abas}<div class="lista-melhorias" id="lista-melhorias" role="tabpanel" aria-labelledby="aba-${abaAtiva.id}">${melhorias.map(m => {
        const nivel = this.sim.estado.melhorias[m.id], completa = nivel >= m.max, custo = this.sim.custoMelhoria(m.id);
        const disponibilidade = this.sim.disponibilidadeMelhoria(m.id), pode = disponibilidade.disponivel && this.sim.estado.dinheiro >= custo;
        const nivelExibido = m.id === 'mochila' ? nivel + 1 : nivel;
        const maxExibido = m.id === 'mochila' ? m.max + 1 : m.max;
        const rotulo = completa ? icone('certo') + ' Pronto' : m.ativa === false ? 'Em breve' : !disponibilidade.disponivel ? disponibilidade.requisitoProduto ? 'Ovos' : disponibilidade.requisitoMelhoria ? 'Repositor' : `Nível ${disponibilidade.nivelMinimo}` : reais(custo);
        const aria = completa ? `${m.titulo} concluída` : !disponibilidade.disponivel ? disponibilidade.motivo : `Comprar ${m.titulo} por ${reais(custo)}`;
        return `<div class="melhoria ${completa ? 'concluida' : ''}"><span class="melhoria-icone ${m.id}">${icone(m.icone)}</span><div><h3>${m.titulo}</h3><p>${m.descricao}</p>${m.max > 1 ? `<span class="nivel-melhoria">Nível ${nivelExibido} de ${maxExibido}</span>` : ''}</div><button class="comprar" data-melhoria="${m.id}" ${completa || !pode ? 'disabled' : ''} aria-label="${aria}">${rotulo}</button></div>`;
      }).join('')}</div><button class="botao-secundario" id="voltar-escritorio">Voltar ao gerenciamento</button>`;
    } else if (tipo === 'personalizacao') {
      titulos.personalizacao = 'Sua loja, do seu jeito';
      conteudo = `<p class="painel-subtitulo">Dê personalidade ao seu cantinho do bairro.</p>
        <form id="form-personalizacao" class="form-personalizacao">
          <div class="previa-loja" id="previa-loja"><small>SEU MERCADINHO</small><strong id="previa-nome"></strong><span id="previa-slogan"></span><div class="previa-toldo"></div></div>
          <label for="nome-loja">Nome do mercadinho</label><input id="nome-loja" name="nome" maxlength="32" required autocomplete="off">
          <label for="slogan-loja">Slogan</label><input id="slogan-loja" name="slogan" maxlength="60" required autocomplete="off">
          <fieldset><legend>Paleta de cores</legend><div class="paletas-loja">${PALETAS.map(p => `<label class="paleta-loja"><input type="radio" name="paleta" value="${p.id}" ${p.id === this.sim.estado.personalizacao.paleta ? 'checked' : ''}><span class="paleta-cores" aria-hidden="true">${[p.principal,p.destaque,p.parede,p.piso].map(cor => `<i style="background:${cor}"></i>`).join('')}</span><span>${p.nome}</span></label>`).join('')}</div></fieldset>
          <button type="submit" class="botao-principal">Salvar personalização</button><button type="button" class="botao-secundario" id="voltar-personalizacao">Voltar ao gerenciamento</button>
        </form>`;
    } else if (tipo === 'ajuda') {
      conteudo = `<p class="painel-subtitulo">Colha, abasteça, venda. E veja a loja crescer.</p>
        <div class="guia-controles">${icone('toque')}<div><h3>Arraste para andar</h3><p>Toque e segure em qualquer parte do cenário. Arraste na direção desejada. Solte para parar.</p><p>No computador, também vale usar <b>W A S D</b> ou as <b>setas</b>.</p><p>Para mover o mapa, arraste com o <b>botão direito</b> ou <b>Shift</b>; no celular, use <b>dois dedos</b>. <b>Shift + setas</b> também move a câmera.</p></div></div>
          <ol class="guia-passos"><li><span>1</span><div><b>Colha na horta</b><p>Fique perto dos tomates ou do milho.</p></div></li><li><span>2</span><div><b>Abasteça a loja</b><p>Leve os produtos à prateleira correspondente.</p></div></li><li><span>3</span><div><b>Atenda no caixa</b><p>Sente-se na cadeira do caixa para receber o pagamento. Cada 25 clientes atendidos aumenta o nível.</p></div></li><li><span>4</span><div><b>Abra a ala dos ovos</b><p>No nível 4, construa o galinheiro. As galinhas produzem ovos automaticamente.</p></div></li><li><span>5</span><div><b>Abra a ala do leite</b><p>No nível 5, construa o curral por R$ 800. Recolha as garrafas de vidro e abasteça a prateleira de leite.</p></div></li><li><span>6</span><div><b>Cuide da satisfação</b><p>Pedido completo vale 10 pontos; parcial, 5; vazio, 0.</p></div></li><li><span>7</span><div><b>Gerencie no escritório</b><p>Sente-se diante do computador para melhorar e personalizar o mercadinho.</p></div></li></ol>
        <p class="nota">No nível 7, abra a ala do trigo por R$ 400. Colha na plantação entre o galinheiro e o curral e abasteça a nova prateleira. Cada trigo vale R$ 5.</p>
        <p class="nota">No nível 9, abra a padaria por R$ 1.400. Deixe trigo na caixa à esquerda do balcão de vidro, em frente aos ovos. Dois padeiros fazem farinha e assam três pães por trigo. Cada pão vale R$ 10.</p>
        <p class="nota">As ações acontecem automaticamente quando você se aproxima. Seu progresso é salvo neste navegador.</p><button class="botao-principal" data-fechar>Vamos jogar ${icone('seta')}</button>`;
    } else if (tipo === 'dev') {
      const proximaReputacao = Math.min(100, Math.ceil((this.sim.reputacao + 1) / 10) * 10);
      conteudo = `<div class="dev-painel">
        <p class="painel-subtitulo">Ajuste o progresso para testar o jogo.</p>
        <section class="dev-cartao dev-dinheiro" aria-label="Dinheiro">
          <div class="dev-cartao-topo"><span class="dev-rotulo">${icone('moeda')} Saldo disponível</span><strong>${reais(this.sim.estado.dinheiro)}</strong></div>
          <p>No caixa: ${reais(this.sim.estado.banco.noCaixa)}. Os botões ajustam os dois valores para testar depósitos.</p>
          <div class="dev-acoes dev-acoes-duplas"><button id="dev-remover" ${this.sim.estado.dinheiro < 100 ? 'disabled' : ''}>− R$ 100</button><button id="dev-adicionar">+ R$ 100</button></div>
        </section>
        <section class="dev-cartao" aria-label="Tempo até o assalto">
          <div class="dev-cartao-topo"><span class="dev-rotulo">Prazo para depositar</span><strong>${this.sim.tempoEsperaAssalto}<small> s</small></strong></div>
          <p>Com R$ 1.000 ou mais no caixa, o assalto começa após esse tempo. Decorridos: ${Math.floor(this.sim.estado.banco.tempoRisco)} s. A mudança vale imediatamente.</p>
          <div class="dev-acoes dev-acoes-duplas" aria-label="Prazo até o assalto">
            <button data-tempo-assalto="5" aria-pressed="${this.sim.tempoEsperaAssalto === 5}">5 segundos</button>
            <button data-tempo-assalto="60" aria-pressed="${this.sim.tempoEsperaAssalto === 60}">60 segundos</button>
          </div>
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
    this.el('painel-conteudo').innerHTML = `<div class="painel-cabecalho"><span class="painel-simbolo">${icone(tipo === 'melhorias' ? 'folha' : tipo === 'dev' ? 'dev' : 'loja')}</span><button class="botao-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button></div><h2 id="painel-titulo">${titulos[tipo]}</h2>${conteudo}`;
    this.el('painel').querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => this.fechar());
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
    if (tipo === 'escritorio') {
      this.el('depositar-banco').onclick = () => {
        const resultado = this.acoes.depositarBanco();
        if (resultado.sucesso) { this.fechar(); this.mensagem('Carro-forte chamado! Um agente vai recolher o dinheiro no caixa.'); }
        else this.mensagem(resultado.motivo);
        this.atualizar();
      };
      this.el('abrir-melhorias').onclick = () => this.abrir('melhorias');
      this.el('abrir-personalizacao').onclick = () => this.abrir('personalizacao');
      this.el('alternar-loja').onclick = () => {
        const aberta = this.acoes.alternarLoja();
        this.renderizarPainel();
        this.mensagem(aberta ? 'Mercado aberto!' : 'Mercado fechado para novos clientes.');
      };
    }
    if (tipo === 'melhorias') this.el('voltar-escritorio').onclick = () => this.abrir('escritorio');
    if (tipo === 'reiniciar') {
      this.el('cancelar-reinicio').onclick = () => this.fechar();
      this.el('confirmar-reinicio').onclick = () => this.acoes.reiniciar();
    }
    if (tipo === 'dev') {
      this.el('painel-conteudo').querySelectorAll('[data-tempo-assalto]').forEach(botao => {
        botao.onclick = () => this.acoes.definirTempoAssalto(Number(botao.dataset.tempoAssalto));
      });
      this.el('dev-remover').onclick = () => this.acoes.alterarSaldo(-100);
      this.el('dev-adicionar').onclick = () => this.acoes.alterarSaldo(100);
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
      this.el('voltar-personalizacao').onclick = () => this.abrir('escritorio');
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
