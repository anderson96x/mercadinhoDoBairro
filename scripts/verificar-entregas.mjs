// Com npm run dev ativo, gera capturas em perfil temporário sem ler saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-entregas-'));
const porta = 9337;
const navegador = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const processo = spawn(navegador, ['--headless=new', '--no-first-run', '--disable-extensions', '--disable-background-networking',
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${porta}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let paginas;
  for (let i = 0; i < 80; i++) {
    try { paginas = await (await fetch(`http://localhost:${porta}/json/list`)).json(); if (paginas.length) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!paginas?.length) throw new Error('Edge não disponibilizou a conexão de verificação.');
  socket = new WebSocket(paginas.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pendentes = new Map(), erros = [];
  socket.addEventListener('message', evento => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails);
    if (mensagem.id) { const p = pendentes.get(mensagem.id); pendentes.delete(mensagem.id); mensagem.error ? p.reject(mensagem.error) : p.resolve(mensagem.result); }
  });
  const chamar = (method, params = {}) => new Promise((resolve, reject) => { const numero = ++id; pendentes.set(numero, { resolve, reject }); socket.send(JSON.stringify({ id: numero, method, params })); });
  const avaliar = async expression => {
    const r = await chamar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await chamar('Runtime.enable'); await chamar('Page.enable');
  const estabilizar = () => avaliar('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 150))))');
  await mkdir('docs/previews', { recursive: true });
  for (const canvas of [false, true]) for (const mobile of [false, true]) {
    await chamar('Emulation.setDeviceMetricsOverride', { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile });
    await chamar('Page.navigate', { url: `http://localhost:4173/scripts/entregas-preview.html${canvas ? '?canvas' : ''}` });
    for (let i = 0; i < 200; i++) {
      if (await avaliar('!!window.verificacao')) break;
      await new Promise(r => setTimeout(r, 100));
    }
    const sufixo = `${mobile ? 'mobile' : 'desktop'}${canvas ? '-canvas' : ''}`;
    const fase = await avaliar("window.verificacao.fase('levar')");
    if (fase.fase !== 'levar') throw new Error(JSON.stringify(fase));
    await estabilizar();
    const captura = await chamar('Page.captureScreenshot', { format: 'png' });
    await writeFile(`docs/previews/entregas-${sufixo}.png`, Buffer.from(captura.data, 'base64'));
    const entrega = await avaliar('window.verificacao.concluir()');
    if (entrega.pacotes !== 4 || entrega.unidades !== 36) throw new Error(JSON.stringify(entrega));
    await avaliar('window.verificacao.catalogo()');
    await avaliar(`for(let i=0;i<3;i++)document.querySelector('[data-importacao-quantidade="1"]').click()`);
    await estabilizar();
    const largura = await avaliar('({documento:document.documentElement.scrollWidth,janela:innerWidth})');
    if (mobile && (largura.documento !== 390 || largura.janela !== 390)) throw new Error(`Layout móvel excede 390 px: ${JSON.stringify(largura)}`);
    const catalogo = await chamar('Page.captureScreenshot', { format: 'png' });
    await writeFile(`docs/previews/catalogo-entregas-${sufixo}.png`, Buffer.from(catalogo.data, 'base64'));
    const pedido = await avaliar('document.getElementById("finalizar-importacao").click(); ({pedidos:verificacao.sim.estado.deposito.pedidos.length,caixas:verificacao.sim.estado.deposito.pedidos[0]?.pacotes.length})');
    if (pedido.pedidos !== 1 || pedido.caixas !== 3) throw new Error(`Pedido pela interface: ${JSON.stringify(pedido)}`);
    console.log(JSON.stringify({ modo: sufixo, ...fase, ...entrega, largura }));
  }
  if (erros.length) throw new Error(JSON.stringify(erros));
} finally {
  socket?.close(); processo.kill();
}
