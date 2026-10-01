import './interface/estilos.css';
import './interface/progresso.css';
import './interface/banco.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/outfit/latin-800.css';
import { Simulacao, estadoInicial } from './jogo/simulacao.js';
import { carregar, salvar } from './jogo/salvamento.js';
import { Cena } from './jogo/cena.js';
import { Controles } from './jogo/controles.js';
import { Sons } from './jogo/audio.js';
import { Interface } from './interface/interface.js';
import { validarPersonalizacao } from './jogo/personalizacao.js';
import { CONFIG, MELHORIAS } from './jogo/configuracao.js';

const sim = new Simulacao(carregar());
const chavePrazoAssaltoDev = 'mercadinho-do-bairro-dev-prazo-assalto';
if (import.meta.env.DEV) {
  try { sim.definirTempoEsperaAssalto(Number(localStorage.getItem(chavePrazoAssaltoDev))); } catch { /* armazenamento opcional */ }
}
const sons = new Sons();
let controles, cena;
let anterior = performance.now(), proximaUI = 0, acumulado = 0;
let focoQuadroAnterior = false;
let avisoSalvamento = false;
let reiniciando = false;
function gravar() {
  if (reiniciando) return true;
  const sucesso = salvar(sim.estado, sim.clientes);
  if (!sucesso && !avisoSalvamento) { avisoSalvamento = true; ui.mensagem('O navegador não permitiu salvar. O progresso dura até fechar a página.'); }
  return sucesso;
}
function pausar(valor) {
  sim.pausado = valor;
  anterior = performance.now(); acumulado = 0;
  if (controles) { controles.bloqueado = valor || sim.estado.melhoriaPendente === 'fertilizante'; controles.limpar(); }
}
function comprar(id) { const r = sim.comprarMelhoria(id); if (r.sucesso) gravar(); return r; }
function iniciarSelecaoHorta() {
  if (!controles) return;
  controles.limpar(); controles.bloqueado = true;
}
function alterarSaldo(valor) {
  if (!import.meta.env.DEV || !Number.isFinite(valor)) return;
  sim.estado.dinheiro = Math.max(0, sim.estado.dinheiro + valor);
  const banco = sim.estado.banco;
  const reservado = banco.coleta && !banco.coleta.retirado ? banco.coleta.valor : 0;
  banco.noCaixa = Math.max(reservado, banco.noCaixa + valor);
  gravar();
  ui.atualizar();
  if (ui.tipoPainel === 'dev') ui.renderizarPainel();
}
function aumentarNivelDev() {
  if (!import.meta.env.DEV) return;
  sim.aumentarNivelDev();
  gravar(); ui.atualizar();
  if (ui.tipoPainel === 'dev') ui.renderizarPainel();
}
function definirClientesPorNivel(valor) {
  if (!import.meta.env.DEV || ![1, 25].includes(valor)) return;
  CONFIG.clientesPorNivel = valor;
  ui.atualizar();
  if (ui.tipoPainel === 'dev') ui.renderizarPainel();
}
function definirTempoAssalto(valor) {
  if (!import.meta.env.DEV || !sim.definirTempoEsperaAssalto(valor)) return false;
  try { localStorage.setItem(chavePrazoAssaltoDev, String(valor)); } catch { /* vale até recarregar */ }
  if (ui.tipoPainel === 'dev') ui.renderizarPainel();
  return true;
}
function aumentarReputacaoDev() {
  if (!import.meta.env.DEV) return;
  sim.aumentarReputacaoDev();
  gravar(); ui.atualizar();
  if (ui.tipoPainel === 'dev') ui.renderizarPainel();
}
function reiniciar() {
  if (!salvar(estadoInicial())) {
    ui.mensagem('Não foi possível apagar o progresso salvo. Verifique o armazenamento do navegador.');
    return;
  }
  // Impede que pagehide, visibilitychange ou o salvamento automático restaurem o jogo antigo.
  reiniciando = true;
  pausar(true);
  window.location.reload();
}
const ui = new Interface(sim, {
  depositarBanco: () => {
    const resultado = sim.solicitarDeposito();
    if (resultado.sucesso) gravar();
    return resultado;
  },
  pausar, comprar, alterarSaldo, aumentarNivelDev, definirClientesPorNivel, definirTempoAssalto, aumentarReputacaoDev, iniciarSelecaoHorta,
  alternarLoja: () => {
    sim.estado.lojaAberta = !sim.estado.lojaAberta;
    gravar(); return sim.estado.lojaAberta;
  },
  personalizar: dados => {
    sim.estado.personalizacao = validarPersonalizacao(dados);
    const salvo = gravar(); ui.atualizar();
    return salvo;
  },
  som: () => { sim.estado.som = !sim.estado.som; sons.ativar(sim.estado.som); gravar(); },
  reiniciar
});
try {
  cena = new Cena(document.getElementById('mundo'), sim);
  controles = new Controles(document.getElementById('mundo'), document.getElementById('joystick'), (dx, dy) => cena.moverCamera(dx, dy));
  const mundo = document.getElementById('mundo');
  mundo.addEventListener('pointermove', e => { if (sim.estado.melhoriaPendente === 'fertilizante') ui.moverCursorHorta(e.clientX, e.clientY); });
  mundo.addEventListener('click', e => {
    if (sim.estado.melhoriaPendente !== 'fertilizante') return;
    const id = cena.selecionarHorta(e.clientX, e.clientY);
    if (!id) { ui.mensagem('Clique diretamente em uma horta para aplicar o produto.'); return; }
    const resultado = sim.aplicarFertilizante(id);
    if (!resultado.sucesso) { ui.mensagem(resultado.motivo); return; }
    controles.bloqueado = false; ui.finalizarSelecaoHorta(); gravar(); ui.atualizar();
  });
  if (sim.estado.melhoriaPendente === 'fertilizante') { ui.iniciarSelecaoHorta(); iniciarSelecaoHorta(); }
  document.addEventListener('pointerdown', () => { if (sim.estado.som) sons.ativar(true); }, { once: true });
  const janelaEmFoco = () => !document.hidden && document.hasFocus();
  const atualizarFoco = () => {
    anterior = performance.now();
    acumulado = 0;
    controles.limpar();
    ui.mostrarPausaFoco(!janelaEmFoco());
    if (document.hidden) gravar();
  };
  const quadro = agora => {
    const emFoco = janelaEmFoco();
    const dt = emFoco && focoQuadroAnterior ? Math.min((agora - anterior) / 1000, 0.25) : 0;
    anterior = agora; focoQuadroAnterior = emFoco;
    ui.mostrarPausaFoco(!emFoco);
    if (emFoco) {
      if (sim.pausado) acumulado = 0;
      else {
        acumulado += dt;
        const entrada = controles.ler();
        while (acumulado >= 1 / 60 && !sim.pausado) { sim.atualizar(1 / 60, entrada); acumulado -= 1 / 60; }
        if (sim.pausado) acumulado = 0;
      }
      cena.atualizar(sim.pausado ? 0 : dt);
      for (const evento of sim.consumirEventos()) {
        if (evento.tipo === 'depositoConcluido') {
          gravar(); ui.mensagem(`Depósito de ${evento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} concluído. Dinheiro em segurança!`);
        }
        if (evento.tipo === 'assaltoChegando') { gravar(); ui.mensagem('Um carro suspeito está chegando ao mercadinho!'); }
        if (evento.tipo === 'assaltoIniciado') { gravar(); ui.mensagem('Assalto! Os clientes estão apavorados.'); }
        if (evento.tipo === 'dinheiroRoubado') { gravar(); ui.mensagem(`Roubaram ${evento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} do caixa!`); }
        if (evento.tipo === 'assaltoEncerrado') { gravar(); ui.mensagem('O assaltante fugiu. A reputação do mercadinho caiu para zero.'); }
        if (evento.tipo === 'assaltoConcluido') gravar();
        sons.tocar(evento.tipo);
        if (evento.tipo === 'venda') ui.venda(evento.valor, cena.projetar(evento.ponto));
        if (evento.tipo === 'nivel') { ui.subiuDeNivel(evento.nivel); ui.mensagem(`Nível ${evento.nivel}! Bônus de R$ ${CONFIG.bonusNivel}.${evento.nivel === 6 ? ' Dica: contrate o Repositor no escritório por R$ 900.' : ''}`); }
        if (evento.tipo === 'melhoria') ui.mensagem(evento.texto);
        if (evento.tipo === 'hortaMelhorada') { cena.animarMelhoriaHorta(evento.id); ui.mensagem(evento.texto); }
        if (['expansao', 'ovoPronto', 'leitePronto'].includes(evento.tipo)) ui.mensagem(evento.texto);
        if (evento.tipo === 'escritorio') ui.abrir('escritorio');
      }
      if (agora >= proximaUI) { ui.atualizar(); proximaUI = agora + 100; }
    } else acumulado = 0;
    if (cena.modoCompativel) setTimeout(() => requestAnimationFrame(quadro), 25);
    else requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
  setInterval(gravar, 5000);
  window.addEventListener('pagehide', gravar);
  window.addEventListener('blur', atualizarFoco);
  window.addEventListener('focus', atualizarFoco);
  document.addEventListener('visibilitychange', atualizarFoco);
  ui.mostrarPausaFoco(!janelaEmFoco());
  // Ferramentas opcionais do navegador: usam as mesmas ações da interface.
  if (document.modelContext?.registerTool) {
    const opcoes = { signal: new AbortController().signal };
    for (const ferramenta of [
      { name: 'consultar_mercadinho', title: 'Consultar mercadinho', description: 'Consulta dinheiro, estoque, melhorias e o objetivo atual do jogo.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => sim.resumo() },
      { name: 'comprar_melhoria', title: 'Comprar melhoria', description: 'Gasta o dinheiro do jogo para comprar uma melhoria, como o botão Melhorias. Não envolve dinheiro real.', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: MELHORIAS.map(m => m.id) } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (entrada) => {
        if (!entrada || typeof entrada.id !== 'string' || Object.keys(entrada).length !== 1) throw new Error('Informe apenas o identificador da melhoria.');
        const resultado = comprar(entrada.id);
        if (resultado.selecionarProduto) { if (ui.tipoPainel) ui.fechar(); ui.iniciarSelecaoHorta(); iniciarSelecaoHorta(); }
        ui.atualizar(); if (ui.tipoPainel === 'melhorias') ui.renderizarPainel(); return resultado;
      } }
    ]) {
      try { Promise.resolve(document.modelContext.registerTool(ferramenta, opcoes)).catch(() => {}); } catch { /* O jogo funciona sem essa API opcional. */ }
    }
  }
} catch (erro) {
  console.error('Não foi possível iniciar o mercadinho.', erro);
  document.getElementById('app').innerHTML = '<section class="erro-inicial"><h2>Não conseguimos abrir o mercadinho</h2><p>O navegador encontrou um problema ao desenhar o jogo. Recarregue a página ou tente um navegador atualizado.</p><button class="botao-principal" onclick="location.reload()">Tentar novamente</button></section>';
}
