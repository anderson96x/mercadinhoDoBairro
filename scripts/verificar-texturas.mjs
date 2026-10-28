// Sem imagens por padrão; --snapshots exige autorização explícita do usuário.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const pasta = await mkdtemp(path.join(tmpdir(), 'mercadinho-texturas-'));
const processo = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--no-first-run', '--disable-extensions', `--user-data-dir=${path.join(pasta, 'perfil')}`, '--remote-debugging-port=0', 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let paginas;
  for (let i = 0; i < 100; i++) {
    try {
      const porta = Number((await readFile(path.join(pasta, 'perfil', 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      paginas = await (await fetch(`http://127.0.0.1:${porta}/json/list`, { signal: AbortSignal.timeout(500) })).json();
      if (paginas.length) break;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!paginas?.length) throw Error('Edge não disponibilizou a conexão.');
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
    const prazo = setTimeout(() => { pendentes.delete(numero); reject(Error(`Sem resposta: ${method}`)); }, 30000);
    pendentes.set(numero, { resolve, reject, prazo }); socket.send(JSON.stringify({ id: numero, method, params }));
  });
  const avaliar = async expression => {
    const r = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await chamar('Page.enable');
  await chamar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
  for (const mobile of [false, true]) for (const canvas of [false, true]) {
    await chamar('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1000, height: 800, deviceScaleFactor: 1, mobile });
    await chamar('Page.navigate', { url: 'http://localhost:4173/' });
    for (let i = 0; i < 100; i++) {
      if (await avaliar("document.readyState === 'complete'")) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log(await avaliar(`(async () => {
      const { Simulacao } = await import('/src/jogo/simulacao.js');
      const { CONFIG, SEQUENCIA_MELHORIAS } = await import('/src/jogo/configuracao.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const sim = new Simulacao();
      sim.estado.estatisticas.clientes = 23 * CONFIG.clientesPorNivel; sim.estado.dinheiro = 100000;
      for (const id of SEQUENCIA_MELHORIAS) if (!sim.comprarMelhoria(id).sucesso) throw Error(id);
      sim.proximoCliente = Infinity; sim.definirAssaltosAtivos(false);
      for (const p of Object.values(sim.estado.produtos)) p.prateleira = 6;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;inset:0;z-index:10000'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      try { window.cenaTexturas = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      const cena = window.cenaTexturas; cena.atualizar(0);
      if (cena.modoCompativel !== ${canvas}) throw Error('Renderizador incorreto');
      return JSON.stringify({ mobile: ${mobile}, canvas: cena.modoCompativel, renderer: cena.renderer.getContext?.().getParameter(cena.renderer.getContext().VERSION) });
    })()`));
    for (const [nome, x, z] of [['geladeira', 0.6, -7], ['parede', 19.8, 5.8]]) {
      console.log(await avaliar(`(async () => {
        const THREE = await import('/node_modules/three/build/three.module.js');
        const cena = window.cenaTexturas;
        for (let passo = 0; passo < 8; passo++) {
          const x = ${x} + passo * 0.037, z = ${z} - passo * 0.023;
          cena.sim.estado.jogador.x = x; cena.sim.estado.jogador.z = z;
          cena.sim.estado.jogador.andando = true; cena.atualizar(1 / 60);
          cena.camera.zoom = ${mobile ? 2 : 3.5}; cena.camera.updateProjectionMatrix();
          cena.alvoCamera.set(x, 0, z);
          cena.camera.position.set(x + 18, 18, z + 18); cena.camera.lookAt(cena.alvoCamera);
          cena.renderer.render(cena.cena, cena.camera);
          if (!cena.modoCompativel) {
            const ponto = '${nome}' === 'geladeira'
              ? new THREE.Vector3(0.6, 0.47, -7.815)
              : new THREE.Vector3(20.98, 0.34, 6.7175);
            ponto.project(cena.camera);
            const gl = cena.renderer.getContext(), pixel = new Uint8Array(4);
            gl.readPixels(Math.floor((ponto.x + 1) * gl.drawingBufferWidth / 2),
              Math.floor((ponto.y + 1) * gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            if (pixel[1] <= pixel[0] * 1.03) throw Error('${nome}: superfície clara invadiu o acabamento escuro no passo ' + passo + ': ' + pixel);
          }
        }
        return JSON.stringify({ mobile: ${mobile}, canvas: ${canvas}, area: '${nome}', quadros: 8, pixelsVerificados: !cena.modoCompativel });
      })()`));
      if (process.argv.includes('--snapshots')) {
        const { data } = await chamar('Page.captureScreenshot', { format: 'png' });
        const arquivo = path.join(pasta, `${mobile ? 'mobile' : 'desktop'}-${canvas ? 'canvas' : 'webgl'}-${nome}.png`);
        await writeFile(arquivo, Buffer.from(data, 'base64')); console.log(arquivo);
      }
    }
  }
} finally {
  socket?.close(); processo.kill();
}
