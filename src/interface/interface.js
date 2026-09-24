import { icone } from './icones.js';
import { MELHORIAS, PRODUTOS, MISSOES } from '../jogo/configuracao.js';
const reais = v => `R$ ${v.toLocaleString('pt-BR')}`;

export class Interface {
  constructor(sim, acoes) {
    this.sim = sim; this.acoes = acoes; this.ultimoInventario = ''; this.ultimaAtualizacao = '';
    document.getElementById('app').innerHTML = `
      <main class="jogo" aria-label="Mercadinho do Bairro">
        <div id="mundo"></div><div id="etiquetas" aria-hidden="true"></div>
        <header class="cabecalho">
          <div class="marca"><span class="marca-icone">${icone('loja')}</span><div><h1>Mercadinho<span>do Bairro</span></h1></div><span class="nivel" id="nivel">NÍVEL 1</span></div>
          <div class="saldo" aria-label="Dinheiro disponível"><span class="moeda">${icone('moeda')}</span><div><small>SEU CAIXA</small><strong id="saldo">R$ 0</strong></div><div class="vendas"><span>${icone('pessoa')}<b id="clientes">0</b></span><small>clientes felizes</small></div></div>
          <nav class="ferramentas" aria-label="Opções do jogo">
            <button class="botao-icone" id="som" title="Ativar som" aria-label="Ativar som">${icone('mudo')}</button>
            <button class="botao-icone" id="ajuda" title="Como jogar" aria-label="Como jogar">${icone('ajuda')}</button>
            <button class="botao-icone" id="pausa" title="Pausar" aria-label="Pausar">${icone('pausa')}</button>
            ${import.meta.env.DEV ? `<button class="botao-icone reset-dev" id="dev-menu" title="Abrir menu de desenvolvimento" aria-label="Abrir menu de desenvolvimento">${icone('dev')}<small>DEV</small></button>` : ''}
          </nav>
        </header>
        <aside class="objetivo" aria-label="Objetivo atual">
          <div class="objetivo-topo"><span>${icone('alvo')} PRÓXIMO PASSO</span><span id="passo">01 / 06</span></div>
          <h2 id="objetivo-titulo">Da horta para a loja</h2><p id="objetivo-texto"></p>
          <div class="progresso-linha"><progress id="objetivo-progresso" value="0" max="3" aria-label="Progresso do objetivo"></progress><span id="objetivo-contagem">0 / 3</span></div>
        </aside>
        <div id="atividade" role="status"></div>
        <div class="controles-dica"><span class="teclas"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span><span><b>Seu ritmo. Seu mercadinho.</b><span>Use as setas ou arraste para andar</span></span></div>
        <footer class="rodape">
          <div class="inventario"><span class="cesta-icone">${icone('cesta')}</span><div class="inventario-conteudo"><div class="inventario-titulo"><b id="nivel-cesta">Sua cesta · Nível ${this.sim.estado.melhorias.mochila + 1}</b><span id="capacidade">${this.sim.estado.jogador.inventario.length} / ${this.sim.capacidade}</span></div><div id="itens"></div></div></div>
          <button class="botao-melhorias" id="melhorias">${icone('melhorar')}<span>Melhorias<small id="melhorias-dica">Faça sua loja crescer</small></span><span class="aviso-melhoria" id="aviso-melhoria" hidden></span>${icone('seta')}</button>
        </footer>
        <div id="joystick" aria-hidden="true"><span></span></div>
        <div id="mensagens" aria-live="polite" aria-atomic="true"></div>
        <div id="efeitos" aria-hidden="true"></div>
        <dialog id="painel" aria-labelledby="painel-titulo"><div id="painel-conteudo"></div></dialog>
      </main>`;
    this.el = id => document.getElementById(id);
    this.el('som').onclick = () => { this.acoes.som(); this.atualizarSom(); };
    this.el('ajuda').onclick = () => this.abrir('ajuda');
    this.el('pausa').onclick = () => this.abrir('pausa');
    if (import.meta.env.DEV) this.el('dev-menu').onclick = () => this.abrir('dev');
    this.el('melhorias').onclick = () => this.abrir('melhorias');
    this.el('painel').addEventListener('cancel', e => { e.preventDefault(); this.fechar(); });
    this.el('painel').addEventListener('click', e => { if (e.target === this.el('painel')) this.fechar(); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.el('painel').open) { e.preventDefault(); this.abrir('pausa'); }
    });
    this.atualizarSom(); this.atualizar();
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
    this.el('saldo').textContent = reais(e.dinheiro);
    this.el('clientes').textContent = e.estatisticas.clientes;
    this.el('nivel').textContent = `NÍVEL ${s.nivel}`;
    this.el('objetivo-titulo').textContent = m.titulo;
    this.el('objetivo-texto').textContent = m.texto;
    this.el('passo').textContent = m.completa ? 'CONCLUÍDO' : `${String(m.indice + 1).padStart(2, '0')} / ${String(MISSOES.length).padStart(2, '0')}`;
    this.el('objetivo-progresso').max = m.alvo; this.el('objetivo-progresso').value = m.valor;
    this.el('objetivo-contagem').textContent = `${m.valor} / ${m.alvo}`;
    const inv = e.jogador.inventario;
    const chave = `${s.capacidade}:${inv.join(',')}`;
    if (chave !== this.ultimoInventario) {
      this.el('capacidade').textContent = `${inv.length} / ${s.capacidade}`;
      this.el('nivel-cesta').textContent = `Sua cesta · Nível ${e.melhorias.mochila + 1}`;
      this.el('itens').style.setProperty('--colunas', Math.min(s.capacidade, 8));
      this.el('itens').innerHTML = Array.from({ length: s.capacidade }, (_, i) => `<span class="item ${inv[i] || ''}" title="${inv[i] ? PRODUTOS[inv[i]].nome : 'Espaço livre'}">${inv[i] ? icone(inv[i]) : '<i></i>'}</span>`).join('');
      this.el('itens').setAttribute('aria-label', inv.length ? `${inv.filter(i => i === 'tomate').length} tomates e ${inv.filter(i => i === 'milho').length} milhos.` : 'Cesta vazia');
      this.ultimoInventario = chave;
    }
    const disponiveis = MELHORIAS.filter(m => e.melhorias[m.id] < m.max && e.dinheiro >= s.custoMelhoria(m.id));
    this.el('aviso-melhoria').hidden = !disponiveis.length;
    this.el('melhorias-dica').textContent = disponiveis.length ? `${disponiveis.length} ${disponiveis.length === 1 ? 'melhoria disponível' : 'melhorias disponíveis'}` : 'Faça sua loja crescer';
    this.el('atividade').textContent = s.atividade;
    this.el('atividade').classList.toggle('visivel', !!s.atividade);
  }
  abrir(tipo) {
    this.tipoPainel = tipo; this.acoes.pausar(true); this.renderizarPainel();
    if (!this.el('painel').open) this.el('painel').showModal();
  }
  fechar() { this.el('painel').close(); this.tipoPainel = null; this.acoes.pausar(false); }
  renderizarPainel() {
    const tipo = this.tipoPainel;
    const titulos = { melhorias: 'Um mercadinho maior', ajuda: 'Vamos cuidar da loja?', pausa: 'Uma pausa para respirar', reiniciar: 'Começar do zero?', dev: 'Menu de desenvolvimento' };
    let conteudo = '';
    if (tipo === 'melhorias') {
      conteudo = `<p class="painel-subtitulo">Cada venda abre novas possibilidades.</p><div class="saldo-painel">${icone('moeda')} Disponível <b>${reais(this.sim.estado.dinheiro)}</b></div><div class="lista-melhorias">${MELHORIAS.map(m => {
        const nivel = this.sim.estado.melhorias[m.id], completa = nivel >= m.max, custo = this.sim.custoMelhoria(m.id), pode = this.sim.estado.dinheiro >= custo;
        const nivelExibido = m.id === 'mochila' ? nivel + 1 : nivel;
        const maxExibido = m.id === 'mochila' ? m.max + 1 : m.max;
        return `<div class="melhoria ${completa ? 'concluida' : ''}"><span class="melhoria-icone ${m.id}">${icone(m.icone)}</span><div><h3>${m.titulo}</h3><p>${m.descricao}</p>${m.max > 1 ? `<span class="nivel-melhoria">Nível ${nivel} de ${m.max}</span>` : ''}</div><button class="comprar" data-melhoria="${m.id}" ${completa || !pode ? 'disabled' : ''} aria-label="${completa ? m.titulo + ' concluída' : 'Comprar ' + m.titulo + ' por ' + reais(custo)}">${completa ? icone('certo') + ' Pronto' : reais(custo)}</button></div>`;
      }).join('')}</div>`;
    } else if (tipo === 'ajuda') {
      conteudo = `<p class="painel-subtitulo">Colha, abasteça, venda. E veja a loja crescer.</p>
        <div class="guia-controles">${icone('toque')}<div><h3>Arraste para andar</h3><p>Toque e segure em qualquer parte do cenário. Arraste na direção desejada. Solte para parar.</p><p>No computador, também vale usar <b>W A S D</b> ou as <b>setas</b>.</p></div></div>
        <ol class="guia-passos"><li><span>1</span><div><b>Colha na horta</b><p>Fique perto dos tomates ou do milho.</p></div></li><li><span>2</span><div><b>Abasteça a loja</b><p>Leve os produtos à prateleira correspondente.</p></div></li><li><span>3</span><div><b>Atenda no caixa</b><p>Fique no círculo verde para receber o pagamento.</p></div></li><li><span>4</span><div><b>Invista no mercadinho</b><p>Abra Melhorias para liberar produtos e contratar ajuda.</p></div></li></ol>
        <p class="nota">As ações acontecem automaticamente quando você se aproxima. Seu progresso é salvo neste navegador.</p><button class="botao-principal" data-fechar>Vamos jogar ${icone('seta')}</button>`;
    } else if (tipo === 'pausa') {
      conteudo = `<p class="painel-subtitulo">A loja espera por você.</p><div class="resumo-pausa"><div><strong>${reais(this.sim.estado.dinheiro)}</strong><span>em caixa</span></div><div><strong>${this.sim.estado.estatisticas.clientes}</strong><span>clientes atendidos</span></div></div><button class="botao-principal" data-fechar>${icone('jogar')} Continuar jogando</button><button class="botao-secundario" id="como-jogar">${icone('ajuda')} Como jogar</button><button class="botao-secundario" id="tela-cheia">${icone('tela')} ${document.fullscreenElement ? 'Sair da tela cheia' : 'Jogar em tela cheia'}</button><button class="botao-texto" id="reiniciar">Começar um novo jogo</button><p class="nota central">O progresso fica salvo neste navegador.</p>`;
    } else if (tipo === 'dev') {
      conteudo = `<p class="painel-subtitulo">Ferramentas para ajustar esta sessão de desenvolvimento.</p><div class="saldo-painel">${icone('moeda')} Saldo atual <b>${reais(this.sim.estado.dinheiro)}</b></div><div class="dev-saldo-controles"><button class="botao-secundario" id="dev-remover" ${this.sim.estado.dinheiro < 100 ? 'disabled' : ''}>− R$ 100</button><button class="botao-secundario" id="dev-adicionar">+ R$ 100</button></div><button class="botao-principal perigo" id="dev-reset">${icone('reiniciar')} Zerar todo o progresso</button>`;
    } else {
      conteudo = `<p class="painel-subtitulo">O dinheiro, as melhorias e o progresso deste mercadinho serão apagados neste navegador.</p><button class="botao-principal perigo" id="confirmar-reinicio">${icone('reiniciar')} Apagar e começar de novo</button><button class="botao-secundario" id="cancelar-reinicio">Voltar para minha loja</button>`;
    }
    this.el('painel-conteudo').innerHTML = `<div class="painel-cabecalho"><span class="painel-simbolo">${icone(tipo === 'melhorias' ? 'folha' : 'loja')}</span><button class="botao-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button></div><h2 id="painel-titulo">${titulos[tipo]}</h2>${conteudo}`;
    this.el('painel').querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => this.fechar());
    this.el('painel').querySelectorAll('[data-melhoria]').forEach(b => b.onclick = () => {
      const resultado = this.acoes.comprar(b.dataset.melhoria);
      if (resultado.sucesso) this.renderizarPainel(); else this.mensagem(resultado.motivo);
      this.atualizar();
    });
    if (tipo === 'pausa') {
      const somBotao = document.createElement('button'); somBotao.className = 'botao-secundario';
      somBotao.innerHTML = `${icone(this.sim.estado.som ? 'som' : 'mudo')} ${this.sim.estado.som ? 'Desativar sons' : 'Ativar sons'}`;
      somBotao.onclick = () => { this.acoes.som(); this.atualizarSom(); this.renderizarPainel(); };
      this.el('como-jogar').after(somBotao);
      this.el('como-jogar').onclick = () => this.abrir('ajuda');
      this.el('reiniciar').onclick = () => this.abrir('reiniciar');
      const botaoTela = this.el('tela-cheia');
      botaoTela.hidden = !document.fullscreenEnabled && !document.fullscreenElement;
      botaoTela.onclick = async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); this.renderizarPainel(); }
        catch { this.mensagem('Este navegador não permite tela cheia.'); }
      };
    }
    if (tipo === 'reiniciar') {
      this.el('cancelar-reinicio').onclick = () => this.abrir('pausa');
      this.el('confirmar-reinicio').onclick = () => this.acoes.reiniciar();
    }
    if (tipo === 'dev') {
      this.el('dev-remover').onclick = () => this.acoes.alterarSaldo(-100);
      this.el('dev-adicionar').onclick = () => this.acoes.alterarSaldo(100);
      this.el('dev-reset').onclick = () => this.abrir('reiniciar');
    }
  }
  mensagem(texto) {
    clearTimeout(this.tempoMensagem); this.el('mensagens').textContent = texto;
    this.el('mensagens').classList.add('visivel');
    this.tempoMensagem = setTimeout(() => this.el('mensagens').classList.remove('visivel'), 3200);
  }
  venda(valor, ponto) {
    const el = document.createElement('div'); el.className = 'dinheiro-flutuante'; el.textContent = `+ ${reais(valor)}`;
    el.style.left = `${ponto.x}px`; el.style.top = `${ponto.y}px`; this.el('efeitos').append(el);
    setTimeout(() => el.remove(), 1600);
    this.el('saldo').animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 350 });
  }
}
