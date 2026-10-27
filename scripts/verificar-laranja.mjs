// Verifica as duas árvores do pomar sem imagens ou saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-laranja-'));
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
      const { Simulacao } = await import('/src/jogo/simulacao.js');
      const { CONFIG, PRODUTOS } = await import('/src/jogo/configuracao.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const verificar = (ok, mensagem) => { if (!ok) throw Error(mensagem); };
      const sim = new Simulacao();
      sim.estado.estatisticas.clientes = 18 * CONFIG.clientesPorNivel;
      sim.estado.dinheiro = 100000;
      for (const id of ['milho', 'alaProducao', 'alaLeite', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'apiario']) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;inset:0;z-index:1000'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0);
      for (const [produto, modelo] of [['laranja', 'laranjeira'], ['maca', 'macieira']]) {
        sim.estado.jogador.inventario = [];
        verificar(!cena.produtos[produto].grupo.visible, 'Arvore antes da compra');
        verificar(sim.comprarMelhoria(produto).sucesso, 'Compra');
        cena.atualizar(0);
        verificar(cena.modoCompativel === ${canvas}, 'Renderizador');
        const objetos = cena.produtos[produto];
        verificar(objetos.grupo.visible && objetos.grupo.getObjectByName(modelo), 'Modelo da arvore');
        verificar(objetos.frutos.filter(f => f.visible).length === 8, 'Frutas da copa');
        verificar(objetos.frutas.every(f => !f.visible), 'Expositor inicialmente vazio');
        Object.assign(sim.estado.jogador, PRODUTOS[produto].coleta);
        sim.tempo += 1; sim.interagir(); cena.atualizar(0);
        verificar(sim.estado.jogador.inventario[0] === produto, 'Colheita');
        verificar(objetos.frutos.filter(f => f.visible).length === 7, 'Copa apos colher');
        Object.assign(sim.estado.jogador, PRODUTOS[produto].reposicao);
        sim.tempo += 1; sim.interagir(); cena.atualizar(0);
        for (let i = 0; i < 10; i++) cena.atualizar(0.1);
        verificar(objetos.frutas.filter(f => f.visible).length === 1, 'Reposicao visual');
        verificar(objetos.grupo.getObjectByName('placa-produto-' + produto), 'Placa');
        const retomado = new Simulacao(structuredClone(sim.estado));
        verificar(retomado.estado.produtos[produto].prateleira === 1, 'Recarga');
      }
      cena.renderer.render(cena.cena, cena.camera);
      cena.renderer.dispose?.(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, produtos: ['laranja', 'maca'], compra: true, arvore: true, colheita: true, reposicao: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
