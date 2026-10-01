import { CONFIG, PRODUTOS } from '../jogo/configuracao.js';
import { icone } from './icones.js';

export function atualizarPainelClientes(painel, clientes, produtos, retratos) {
  const lista = painel.querySelector('#lista-clientes');
  const visiveis = clientes.filter(c => c.z <= CONFIG.portaEntrada.z && c.fase !== 'passando' && c.fase !== 'fim' && !c.recusado);
  painel.querySelector('#clientes-ativos').textContent = String(visiveis.length);
  painel.querySelector('#clientes-vazio').hidden = visiveis.length > 0;
  const ids = new Set(visiveis.map(c => String(c.id)));
  for (const cartao of Array.from(lista.children)) if (!ids.has(cartao.dataset.id)) cartao.remove();

  for (const c of visiveis) {
    let cartao = Array.from(lista.children).find(el => el.dataset.id === String(c.id));
    if (!cartao) {
      cartao = document.createElement('article');
      cartao.className = 'cliente-cartao';
      cartao.dataset.id = String(c.id);
      cartao.innerHTML = `<div class="cliente-avatar"><div class="cliente-rosto"><img alt="" hidden></div><span class="cliente-tempo" hidden></span></div>
        <div class="cliente-detalhes"><div class="cliente-pedido"></div></div>`;
      lista.append(cartao);
    }
    const retrato = retratos?.get(c.aparencia);
    const imagem = cartao.querySelector('.cliente-rosto img');
    if (retrato && imagem.src !== retrato) { imagem.src = retrato; imagem.hidden = false; }
    const compra = c.compras?.[c.compraAtual ?? 0] ?? { produto: c.produto, desejado: c.desejado ?? 1, quantidade: c.quantidade ?? 0 };
    const finalizado = ['indoCaixa', 'fila', 'saindo'].includes(c.fase);
    const pedido = cartao.querySelector('.cliente-pedido');
    const pedidoChave = finalizado ? c.fase : `${compra.produto}:${compra.desejado}:${compra.quantidade}`;
    if (pedido.dataset.chave !== pedidoChave) {
      pedido.dataset.chave = pedidoChave;
      pedido.innerHTML = finalizado ? `${icone('cesta')} <span>${c.fase === 'saindo' ? 'Saindo da loja' : 'Aguardando atendimento'}</span>`
        : `${icone(compra.produto)} <span>${PRODUTOS[compra.produto]?.nome ?? 'Produto'} <b>${compra.quantidade ?? 0}/${compra.desejado}</b></span>`;
    }
    const esperando = c.fase === 'comprando' && produtos[compra.produto]?.prateleira === 0 && compra.quantidade < compra.desejado;
    const avatar = cartao.querySelector('.cliente-avatar');
    const tempo = cartao.querySelector('.cliente-tempo');
    avatar.classList.toggle('esperando', esperando);
    tempo.hidden = !esperando;
    if (esperando) {
      const restante = Math.max(0, CONFIG.tempoEsperaCliente - (c.esperaSemEstoque ?? 0));
      avatar.style.setProperty('--tempo-restante', `${restante / CONFIG.tempoEsperaCliente * 100}%`);
      tempo.textContent = `${Math.ceil(restante)}s`;
      avatar.setAttribute('aria-label', `${Math.ceil(restante)} segundos até desistir do produto`);
    } else {
      avatar.style.removeProperty('--tempo-restante');
      avatar.removeAttribute('aria-label');
    }
  }
}
