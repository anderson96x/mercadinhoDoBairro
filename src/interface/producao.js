import { produtosDaLoja, ALA_PADARIA, CONFIG, OFICINAS, PRODUTOS } from '../jogo/configuracao.js';
import { distanciaEstacao, geometriaEstacao } from '../jogo/estacoes.js';
import { icone } from './icones.js';
import { CONFEITARIA, podeProduzirConfeitaria, situacaoConfeiteiro } from '../jogo/confeitaria.js';
import { trabalhoPadaria } from '../jogo/producao-padaria.js';

function resumoPadaria(estado) {
  const producao = estado.producao;
  const prontos = estado.produtos.pao.prateleira;
  const { cheia: vitrineCheia, assando, moendo } = trabalhoPadaria(estado);
  const status = vitrineCheia ? 'Vitrine cheia' : assando ? 'Assando pães' : moendo ? 'Moendo trigo' : 'Aguardando trigo';
  const progresso = assando ? producao.progressoForno / ALA_PADARIA.tempoForno
    : moendo ? producao.progressoMoagem / ALA_PADARIA.tempoMoagem : 0;
  return {
    id: 'pao', nome: 'Padaria', prontos, capacidade: PRODUTOS.pao.capacidadePrateleira, prontosTexto: `${prontos} / ${PRODUTOS.pao.capacidadePrateleira}`,
    ingredientes: [
      { id: 'trigo', nome: 'Trigo', disponivel: producao.trigoPadaria, quantidade: ALA_PADARIA.capacidadeTrigo, faltando: !producao.trigoPadaria },
      { id: 'farinha', nome: 'Farinha', disponivel: producao.farinha, quantidade: 3, faltando: !producao.farinha && !producao.trigoPadaria }
    ],
    receitaTexto: `Por lote: 1 trigo → ${ALA_PADARIA.paesPorTrigo} pães · moagem ${ALA_PADARIA.tempoMoagem}s + forno ${ALA_PADARIA.tempoForno}s`,
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
  const confeitaria = [];
  if (estado.melhorias.confeitaria) {
    const producao = estado.confeitaria;
    const ingredientes = Object.keys(CONFEITARIA.ingredientes).map(id => ({ id, disponivel: producao[id], quantidade: CONFEITARIA.capacidadeIngredientes, faltando: producao[id] < 1 }));
    const prontos = Object.keys(CONFEITARIA.produtos).reduce((total, id) => total + estado.produtos[id].prateleira, 0);
    const capacidade = Object.values(CONFEITARIA.produtos).reduce((total, produto) => total + produto.capacidade, 0);
    const cheia = Object.entries(CONFEITARIA.produtos).every(([id, p]) => estado.produtos[id].prateleira >= p.capacidade);
    const entregando = producao.etapaEntrega >= 0;
    const situacao = situacaoConfeiteiro(estado);
    const faltantes = ingredientes.filter(item => item.faltando).map(item => item.id === 'ovos' ? 'ovos' : 'mel');
    confeitaria.push({ id: 'confeitaria', nome: 'Confeitaria', prontos, capacidade, prontosTexto: `${prontos} / ${capacidade}`, ingredientes,
      receitaTexto: 'Por lote: 1 mel + 1 ovo → até 1 bolo, 1 donut e 1 éclair, conforme as vagas · preparo 6s + entrega',
      status: entregando ? situacao.carga.length ? 'Abastecendo as vitrines' : 'Voltando à batedeira'
        : cheia ? 'Vitrine cheia' : faltantes.length ? `Aguardando ${faltantes.join(' e ')}` : 'Misturando na batedeira',
      progresso: entregando ? 100 : Math.floor(producao.progresso / CONFEITARIA.segundos * 100), produzindo: entregando || podeProduzirConfeitaria(estado) });
  }
  return estado.melhorias.alaPadaria ? [resumoPadaria(estado), ...confeitaria, ...oficinas] : oficinas;
}

export function atualizarPainelProducao(painel, estado) {
  const oficinas = resumoProducao(estado).filter(({ id }) =>
    (id === 'confeitaria' ? [CONFEITARIA.entrada]
      : id === 'pao' ? [ALA_PADARIA.entrada, ALA_PADARIA.moinho, ALA_PADARIA.forno, PRODUTOS.pao.prateleira]
      : [geometriaEstacao(id, 'coleta', produtosDaLoja(estado))]).some(estacao => distanciaEstacao(estado.jogador, estacao) < CONFIG.raioInteracao));
  painel.hidden = !oficinas.length;
  if (!oficinas.length) return;
  const chave = JSON.stringify(oficinas);
  if (painel.dataset.estado === chave) return;
  painel.dataset.estado = chave;
  painel.querySelector('#lista-producao').innerHTML = oficinas.map(o => `<article class="producao-cartao ${o.id}">
    <div class="producao-cartao-topo">${icone(o.id)}<h3>${o.nome}</h3><span class="producao-prontos">${o.prontosTexto ?? `${o.prontos} prontos`}</span></div>
    <div class="producao-ingredientes">${o.ingredientes.map(item => `<span class="${item.faltando ?? item.disponivel < item.quantidade ? 'faltando' : ''}">${icone(item.id)}<span>${item.nome ?? PRODUTOS[item.id].nome}</span><b>${item.disponivel} / ${item.quantidade}</b></span>`).join('')}</div>
    <p class="producao-receita">${o.receitaTexto ?? `Por lote: ${o.rendimento} ${PRODUTOS[o.id].plural.toLocaleLowerCase('pt-BR')} · ${o.segundos}s`}</p>
    <div class="producao-status"><span>${o.status}</span>${o.produzindo ? `<b>${o.progresso}%</b>` : ''}</div>
    ${o.produzindo ? `<progress max="100" value="${o.progresso}" aria-label="Progresso do lote: ${o.nome}" aria-valuetext="${o.progresso}%, ${o.status}"></progress>` : ''}
  </article>`).join('');
}
