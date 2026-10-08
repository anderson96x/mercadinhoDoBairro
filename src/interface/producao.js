import { ALA_PADARIA, CONFIG, OFICINAS, PRODUTOS } from '../jogo/configuracao.js';
import { distanciaEstacao, geometriaEstacao } from '../jogo/estacoes.js';
import { icone } from './icones.js';

function resumoPadaria(estado) {
  const producao = estado.producao;
  const prontos = estado.produtos.pao.prateleira;
  const vitrineCheia = prontos + ALA_PADARIA.paesPorTrigo > PRODUTOS.pao.capacidadePrateleira;
  const assando = producao.farinha > 0 && !vitrineCheia;
  const moendo = producao.trigoPadaria > 0 && producao.farinha < 3 && !vitrineCheia;
  const status = vitrineCheia ? 'Vitrine cheia' : assando ? 'Assando pães' : moendo ? 'Moendo trigo' : 'Aguardando trigo';
  const progresso = assando ? producao.progressoForno / ALA_PADARIA.tempoForno
    : moendo ? producao.progressoMoagem / ALA_PADARIA.tempoMoagem : 0;
  return {
    id: 'pao', nome: 'Padaria', prontos, prontosTexto: `${prontos} na vitrine`,
    ingredientes: [
      { id: 'trigo', nome: 'Trigo', disponivel: producao.trigoPadaria, quantidade: ALA_PADARIA.capacidadeTrigo, faltando: !producao.trigoPadaria },
      { id: 'farinha', nome: 'Farinha', disponivel: producao.farinha, quantidade: 3, faltando: !producao.farinha && !producao.trigoPadaria }
    ],
    receitaTexto: `Por trigo: ${ALA_PADARIA.paesPorTrigo} pães · moagem ${ALA_PADARIA.tempoMoagem}s + forno ${ALA_PADARIA.tempoForno}s`,
    status, progresso: Math.max(0, Math.min(100, Math.floor(progresso * 100))), produzindo: assando || moendo
  };
}

export function resumoProducao(estado) {
  const oficinas = Object.entries(OFICINAS).filter(([id]) => estado.produtos[id]?.liberado).map(([id, receita]) => {
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
  return estado.melhorias.alaPadaria ? [resumoPadaria(estado), ...oficinas] : oficinas;
}

export function atualizarPainelProducao(painel, estado) {
  const oficinas = resumoProducao(estado).filter(({ id }) =>
    (id === 'pao' ? [ALA_PADARIA.entrada, ALA_PADARIA.moinho, ALA_PADARIA.forno, PRODUTOS.pao.prateleira]
      : [geometriaEstacao(id, 'coleta')]).some(estacao => distanciaEstacao(estado.jogador, estacao) < CONFIG.raioInteracao));
  painel.hidden = !oficinas.length;
  if (!oficinas.length) return;
  const chave = JSON.stringify(oficinas);
  if (painel.dataset.estado === chave) return;
  painel.dataset.estado = chave;
  const total = oficinas.reduce((soma, oficina) => soma + oficina.prontos, 0);
  painel.querySelector('#producao-resumo').textContent = oficinas[0].id === 'pao'
    ? `${total} ${total === 1 ? 'pão' : 'pães'}` : `${total} ${total === 1 ? 'pronto' : 'prontos'}`;
  painel.querySelector('#lista-producao').innerHTML = oficinas.map(o => `<article class="producao-cartao ${o.id}">
    <div class="producao-cartao-topo">${icone(o.id)}<h3>${o.nome}</h3><span class="producao-prontos">${o.prontosTexto ?? `${o.prontos} prontos`}</span></div>
    <div class="producao-ingredientes">${o.ingredientes.map(item => `<span class="${item.faltando ?? item.disponivel < item.quantidade ? 'faltando' : ''}">${icone(item.id)}<span>${item.nome ?? PRODUTOS[item.id].nome}</span><b>${item.disponivel} / ${item.quantidade}</b></span>`).join('')}</div>
    <p class="producao-receita">${o.receitaTexto ?? `Por lote: ${o.rendimento} ${PRODUTOS[o.id].plural.toLocaleLowerCase('pt-BR')} · ${o.segundos}s`}</p>
    <div class="producao-status"><span>${o.status}</span><b>${o.progresso}%</b></div>
    <progress max="100" value="${o.progresso}" aria-label="Progresso do lote: ${o.nome}" aria-valuetext="${o.progresso}%, ${o.status}"></progress>
  </article>`).join('');
}
