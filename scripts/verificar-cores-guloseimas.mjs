// Mede pixels em memória para detectar texturas pretas no WebGL; não salva imagens.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-enlatados-'));
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
    // Perfil temporário: a página não acessa os saves do navegador do jogador.
    await chamar('Page.navigate', { url: 'http://localhost:4173/' });
    for (let i = 0; i < 100; i++) {
      if (await avaliar("location.pathname === '/' && document.readyState === 'complete'")) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const resultado = await avaliar(`(async () => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { criarGuloseima } = await import('/src/jogo/guloseimas.js');
      const { RenderizadorCompativel } = await import('/src/jogo/renderizador-compativel.js');
      const modelos = [0, 3, 6, 9].map(variante => criarGuloseima(variante));
      const materiais = new Set();
      for (const modelo of modelos) modelo.traverse(o => { if (o.material?.map) materiais.add(o.material); });
      for (let i = 0; i < 100; i++) {
        if ([...materiais].every(m => m.map.image?.complete && m.map.image.naturalWidth > 0)) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (![...materiais].every(m => m.map.image?.naturalWidth > 0)) throw new Error('SVG não carregado');
      const renderizador = ${canvas} ? new RenderizadorCompativel() : new THREE.WebGLRenderer();
      const leituras = [];
      const { criarSol } = await import('/src/jogo/iluminacao.js');
      for (const modelo of modelos) {
        const amostra = modelo.clone();
        amostra.scale.setScalar(0.82); amostra.rotation.y = -Math.PI / 2;
        amostra.position.set(0, 0, 0);
        const cenaTeste = new THREE.Scene(); cenaTeste.background = new THREE.Color(0x78c85a);
        cenaTeste.add(amostra, new THREE.HemisphereLight(0xfff4dc, 0x70a85d, 2.55));
        const sol = criarSol(); cenaTeste.add(sol, sol.target);
        const cam = new THREE.OrthographicCamera(-0.35, 0.35, 0.35, -0.35, 0.1, 50);
        renderizador.setSize(128, 128);
        for (const lado of [-1, 1]) {
          cam.position.set(lado * 2, 1.2, 2); cam.lookAt(0, 0, 0);
          let pixels;
          if (${canvas}) {
            renderizador.render(cenaTeste, cam);
            pixels = renderizador.ctx.getImageData(0, 0, 128, 128).data;
          } else {
            const alvo = new THREE.WebGLRenderTarget(128, 128); alvo.texture.colorSpace = THREE.SRGBColorSpace;
            renderizador.setRenderTarget(alvo); renderizador.render(cenaTeste, cam);
            pixels = new Uint8Array(128 * 128 * 4); renderizador.readRenderTargetPixels(alvo, 0, 0, 128, 128, pixels);
            renderizador.setRenderTarget(null); alvo.dispose();
          }
          let pretos = 0; const centro = Array.from(pixels.slice((64 * 128 + 64) * 4, (64 * 128 + 64) * 4 + 4));
          for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) < 25) pretos++;
          if (pretos > 128) throw new Error('Face preta: ' + amostra.userData.variedade + ', lado ' + lado + ', pixels ' + pretos);
          leituras.push({ tipo: amostra.userData.variedade, lado, pretos, centro });
        }
      }
      const saida = { mobile: ${mobile}, canvas: ${canvas}, leituras };
      renderizador.dispose?.(); return saida;
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
