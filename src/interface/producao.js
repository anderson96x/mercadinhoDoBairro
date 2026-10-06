import { OFICINAS, PRODUTOS } from '../jogo/configuracao.js';
import { icone } from './icones.js';

export function resumoProducao(estado) {
  return Object.entries(OFICINAS).filter(([id]) => estado.produtos[id]?.liberado).map(([id, receita]) => {
    const oficina = estado.oficinas[id], estoque = estado.produtos[id];
    const ingredientes = Object.entries(receita.ingredientes).map(([item, quantidade]) => ({
      id: item, quantidade, disponivel: oficina.ingredientes[item]
    }));
    const cheio = estoque.horta + receita.rendimento > PRODUTOS[id].capacidadeHorta;
    const faltantes = ingredientes.filter(item => item.disponivel < item.quantidade);
    const progresso = Math.max(0, Math.min(100, Math.floor(oficina.progresso / receita.segundos * 100)));
    return { id, nome: receita.nome, ingredientes, rendimento: receita.rendimento, segundos: receita.segundos,
      prontos: estoque.horta, progresso, status: cheio ? 'Recolha os produtos para continuar' : faltantes.length
        ? `Aguardando ${faltantes.map(item => PRODUTOS[item.id].nome.toLocaleLowerCase('pt-BR')).join(' e ')}`
        : 'Produzindo', produzindo: !cheio && !faltantes.length };
  });
}

export function atualizarPainelProducao(painel, estado) {
  const oficinas = resumoProducao(estado);
  painel.hidden = !oficinas.length;
  if (!oficinas.length) return;
  const chave = JSON.stringify(oficinas);
  if (painel.dataset.estado === chave) return;
  painel.dataset.estado = chave;
  const total = oficinas.reduce((soma, oficina) => soma + oficina.prontos, 0);
  painel.querySelector('#producao-resumo').textContent = `${total} ${total === 1 ? 'pronto' : 'prontos'}`;
  painel.querySelector('#lista-producao').innerHTML = oficinas.map(o => `<article class="producao-cartao ${o.id}">
    <div class="producao-cartao-topo">${icone(o.id)}<h3>${o.nome}</h3><span class="producao-prontos">${o.prontos} prontos</span></div>
    <div class="producao-ingredientes">${o.ingredientes.map(item => `<span class="${item.disponivel < item.quantidade ? 'faltando' : ''}">${icone(item.id)}<span>${PRODUTOS[item.id].nome}</span><b>${item.disponivel} / ${item.quantidade}</b></span>`).join('')}</div>
    <p class="producao-receita">Por lote: ${o.rendimento} ${PRODUTOS[o.id].plural.toLocaleLowerCase('pt-BR')} · ${o.segundos}s</p>
    <div class="producao-status"><span>${o.status}</span><b>${o.progresso}%</b></div>
    <progress max="100" value="${o.progresso}" aria-label="Progresso do lote: ${o.nome}" aria-valuetext="${o.progresso}%, ${o.status}"></progress>
  </article>`).join('');
}
