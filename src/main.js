import './interface/estilos.css';
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

const sim = new Simulacao(carregar());
const sons = new Sons();
let controles, cena;
let avisoSalvamento = false;
function gravar() {
  const sucesso = salvar(sim.estado, sim.clientes);
  if (!sucesso && !avisoSalvamento) { avisoSalvamento = true; ui.mensagem('O navegador não permitiu salvar. O progresso dura até fechar a página.'); }
  return sucesso;
}
function pausar(valor) { sim.pausado = valor; if (controles) { controles.bloqueado = valor; controles.limpar(); } }
function comprar(id) { const r = sim.comprarMelhoria(id); if (r.sucesso) gravar(); return r; }
const ui = new Interface(sim, {
  pausar, comprar,
  som: () => { sim.estado.som = !sim.estado.som; sons.ativar(sim.estado.som); gravar(); },
  reiniciar: () => { salvar(estadoInicial()); window.location.reload(); }
});
try {
  cena = new Cena(document.getElementById('mundo'), sim);
  controles = new Controles(document.getElementById('mundo'), document.getElementById('joystick'));
  document.addEventListener('pointerdown', () => { if (sim.estado.som) sons.ativar(true); }, { once: true });
  let anterior = performance.now(), proximaUI = 0, acumulado = 0;
  const quadro = agora => {
    const dt = Math.min((agora - anterior) / 1000, 0.25); anterior = agora;
    if (!document.hidden) {
      acumulado += dt;
      const entrada = controles.ler();
      while (acumulado >= 1 / 60) { sim.atualizar(1 / 60, entrada); acumulado -= 1 / 60; }
      cena.atualizar(sim.pausado ? 0 : dt);
      for (const evento of sim.consumirEventos()) {
        sons.tocar(evento.tipo);
        if (evento.tipo === 'venda') ui.venda(evento.valor, cena.projetar(evento.ponto));
        if (evento.tipo === 'melhoria') ui.mensagem(`${evento.texto} · melhoria adquirida!`);
        if (evento.tipo === 'missao') ui.mensagem(evento.texto);
      }
      if (agora >= proximaUI) { ui.atualizar(); proximaUI = agora + 100; }
    } else acumulado = 0;
    if (cena.modoCompativel) setTimeout(() => requestAnimationFrame(quadro), 25);
    else requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
  setInterval(gravar, 5000);
  window.addEventListener('pagehide', gravar);
  document.addEventListener('visibilitychange', () => { controles.limpar(); if (document.hidden) gravar(); });
  // Ferramentas opcionais do navegador: usam as mesmas ações da interface.
  if (document.modelContext?.registerTool) {
    const opcoes = { signal: new AbortController().signal };
    for (const ferramenta of [
      { name: 'consultar_mercadinho', title: 'Consultar mercadinho', description: 'Consulta dinheiro, estoque, melhorias e o objetivo atual do jogo.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => sim.resumo() },
      { name: 'comprar_melhoria', title: 'Comprar melhoria', description: 'Gasta o dinheiro do jogo para comprar uma melhoria, como o botão Melhorias. Não envolve dinheiro real.', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: ['milho','mochila','velocidade','caixa','ajudante'] } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (entrada) => {
        if (!entrada || typeof entrada.id !== 'string' || Object.keys(entrada).length !== 1) throw new Error('Informe apenas o identificador da melhoria.');
        const resultado = comprar(entrada.id); ui.atualizar(); if (ui.tipoPainel === 'melhorias') ui.renderizarPainel(); return resultado;
      } }
    ]) {
      try { Promise.resolve(document.modelContext.registerTool(ferramenta, opcoes)).catch(() => {}); } catch { /* O jogo funciona sem essa API opcional. */ }
    }
  }
} catch (erro) {
  console.error('Não foi possível iniciar o mercadinho.', erro);
  document.getElementById('app').innerHTML = '<section class="erro-inicial"><h2>Não conseguimos abrir o mercadinho</h2><p>O navegador encontrou um problema ao desenhar o jogo. Recarregue a página ou tente um navegador atualizado.</p><button class="botao-principal" onclick="location.reload()">Tentar novamente</button></section>';
}
