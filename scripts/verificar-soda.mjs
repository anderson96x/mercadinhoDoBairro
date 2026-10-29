// Verifica os soda no Edge, sem salvar imagens ou acessar saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-soda-'));
const processo = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--no-first-run', '--disable-extensions', `--user-data-dir=${perfil}`, '--remote-debugging-port=0', 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let paginas;
  for (let i = 0; i < 100; i++) {
    try {
      const porta = Number((await readFile(path.join(perfil, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      paginas = await (await fetch(`http://localhost:${porta}/json/list`)).json();
      if (paginas.length) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!paginas?.length) throw new Error('Edge não disponibilizou a conexão de verificação.');
  socket = new WebSocket(paginas.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pendentes = new Map();
  socket.addEventListener('message', evento => {
    const mensagem = JSON.parse(evento.data), p = pendentes.get(mensagem.id);
    if (!p) return;
    pendentes.delete(mensagem.id); clearTimeout(p.prazo);
    mensagem.error ? p.reject(mensagem.error) : p.resolve(mensagem.result);
  });
  const chamar = (method, params = {}) => new Promise((resolve, reject) => {
    const numero = ++id;
    const prazo = setTimeout(() => { pendentes.delete(numero); reject(new Error(`Sem resposta: ${method}`)); }, 20000);
    pendentes.set(numero, { resolve, reject, prazo }); socket.send(JSON.stringify({ id: numero, method, params }));
  });
  const avaliar = async expression => {
    const r = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await chamar('Page.enable');
  for (const mobile of [false, true]) for (const canvas of [false, true]) {
    await chamar('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile });
    await chamar('Page.navigate', { url: 'http://localhost:4173/' });
    for (let i = 0; i < 100; i++) {
      if (await avaliar("document.readyState === 'complete'")) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const resultado = await avaliar(`(async () => {
      const { Simulacao, validarEstado } = await import('/src/jogo/simulacao.js');
      const { CONFIG, SEQUENCIA_MELHORIAS } = await import('/src/jogo/configuracao.js');
      const { SODA } = await import('/src/jogo/soda.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const verificar = (ok, msg) => { if (!ok) throw Error(msg); };
      const sim = new Simulacao(); sim.estado.estatisticas.clientes = 24 * CONFIG.clientesPorNivel; sim.estado.dinheiro = 100000;
      for (const id of SEQUENCIA_MELHORIAS.slice(0, SEQUENCIA_MELHORIAS.indexOf('geladeiraSoda'))) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div'); container.style.cssText = 'position:fixed;inset:0'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0); verificar(!cena.produtos.soda.grupo.visible, 'Soda antes da compra');
      verificar(sim.comprarMelhoria('geladeiraSoda').sucesso, 'Compra N25'); cena.atualizar(0);
      verificar(cena.produtos.soda.grupo.visible, 'Geladeira ausente');
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador');
      sim.proximoCliente = Infinity; sim.temporizadorEntregaAtivo = false;
      verificar(sim.encomendarImportacoes({ importarSoda: 4 }).quantidade === 96, 'Pedido');
      for (let i = 0; i < 20000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
      verificar(sim.estado.produtos.soda.horta === 96, 'Entrega'); cena.atualizar(0);
      const caixas = []; cena.cena.traverse(o => { if (o.name === 'caixa-soda' && o.visible && o.parent.name === 'deposito') caixas.push(o); });
      verificar(caixas.length === 4, 'Caixas no canto');
      Object.assign(sim.estado.jogador, SODA.coleta); sim.tempo++; sim.interagir();
      verificar(sim.estado.jogador.inventario[0] === 'soda', 'Coleta');
      Object.assign(sim.estado.jogador, SODA.cliente); sim.tempo++; sim.interagir();
      verificar(sim.estado.produtos.soda.prateleira === 1, 'Reposição');
      sim.estado.produtos.soda.prateleira = 24; cena.atualizar(0); cena.atualizar(0.4);
      verificar(cena.produtos.soda.frutas.filter(o => o.visible).length === 24, '24 latas visíveis');
      verificar(new Set(cena.produtos.soda.frutas.map(o => o.position.y)).size === 4, 'Quatro níveis');
      verificar(validarEstado(sim.estado).produtos.soda.prateleira === 24, 'Recarga');
      await new Promise(r => setTimeout(r, 800)); cena.atualizar(0);
      verificar(document.documentElement.scrollWidth <= innerWidth, 'Transbordamento');
      cena.renderer.dispose?.(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, compra: true, caixasNoChao: 4, latas: 24, entrega: true, coleta: true, reposicao: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
