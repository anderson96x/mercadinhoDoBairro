// Verifica os laticínios no Edge, sem salvar imagens ou acessar saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-laticinios-'));
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
      const { LATICINIOS } = await import('/src/jogo/laticinios.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const verificar = (ok, msg) => { if (!ok) throw Error(msg); };
      const sim = new Simulacao(); sim.estado.estatisticas.clientes = 25 * CONFIG.clientesPorNivel; sim.estado.dinheiro = 100000;
      for (const id of SEQUENCIA_MELHORIAS.slice(0, SEQUENCIA_MELHORIAS.indexOf('geladeiraLaticinios'))) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div'); container.style.cssText = 'position:fixed;inset:0'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0); verificar(!cena.produtos.laticinio.grupo.visible, 'Antes da compra');
      verificar(sim.comprarMelhoria('geladeiraLaticinios').sucesso, 'Compra N26'); cena.atualizar(0);
      verificar(cena.produtos.laticinio.grupo.visible, 'Geladeira ausente');
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador');
      sim.proximoCliente = Infinity; sim.temporizadorEntregaAtivo = false;
      const pedido = { importarLaticinios: 4 };
      verificar(sim.encomendarImportacoes(pedido).quantidade === 36, 'Pedido misto');
      for (let i = 0; i < 20000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
      verificar(sim.estado.produtos.laticinio.horta === 36, 'Entrega'); cena.atualizar(0);
      const caixas = []; cena.cena.traverse(o => { if (o.name === 'caixa-laticinios' && o.visible && o.parent?.name === 'deposito') caixas.push(o); });
      verificar(caixas.length === 4, 'Caixas no depósito');
      verificar(new Set(caixas.map(o => o.position.x)).size === 1 && new Set(caixas.map(o => o.position.z)).size === 1, 'Uma pilha vertical');
      verificar(new Set(caixas.map(o => o.position.y)).size === 4, 'Quatro caixas empilhadas');
      Object.assign(sim.estado.jogador, LATICINIOS.coleta); sim.tempo++; sim.interagir();
      verificar(sim.estado.jogador.inventario[0] === 'laticinio', 'Coleta sem ambiguidade');
      verificar(sim.estado.deposito.pacotes.find(p => p.slot === 23).unidades === 8, 'Consumo da caixa do topo');
      for (let i = 0; i < 8; i++) sim.retirarProdutoDeposito('laticinio');
      cena.atualizar(0);
      verificar(caixas.filter(o => o.visible).length === 3, 'Caixa do topo desaparece ao esvaziar');
      verificar(caixas.filter(o => o.visible).every(o => o.position.y < 0.23 + 3 * (LATICINIOS.alturaCaixa + 0.02)), 'Base permanece apoiada no chão');
      Object.assign(sim.estado.jogador, LATICINIOS.cliente); sim.tempo++; sim.interagir();
      verificar(sim.estado.produtos.laticinio.prateleira === 1, 'Reposição');
      sim.estado.produtos.laticinio.prateleira = 36;
      cena.atualizar(0); cena.atualizar(0.4);
      verificar(cena.produtos.laticinio.frutas.filter(o => o.visible).length === 36, '36 embalagens visíveis');
      verificar(cena.cena.getObjectByName('refrigerador-parede-laticinios'), 'Mesmo gabinete dos queijos');
      verificar(validarEstado(sim.estado).produtos.laticinio.prateleira === 36, 'Recarga');
      await new Promise(r => setTimeout(r, 800)); cena.atualizar(0);
      const rotulos = [];
      cena.produtos.laticinio.grupo.traverse(o => {
        if (o.material?.userData.svg?.startsWith('produtos/laticinios/')) rotulos.push(o.material);
      });
      verificar(rotulos.length > 36, 'Rótulos nas tampas e frentes');
      verificar(rotulos.every(m => m.map?.image?.complete && m.map.image.naturalWidth > 0), 'Artes dos rótulos carregadas');
      verificar(new Set(cena.produtos.laticinio.frutas.map(o => o.position.y)).size === 4, 'Quatro níveis de nove');
      if (${canvas}) {
        const tampas = [];
        cena.produtos.laticinio.grupo.traverse(o => {
          if (o.geometry?.type === 'CircleGeometry' && o.material?.map) tampas.push(o);
        });
        verificar(tampas.some(o => cena.renderer.texturas.has(o.material.map.image)), 'Canvas desenhou a arte das tampas');
      }
      verificar(document.documentElement.scrollWidth <= innerWidth, 'Transbordamento');
      cena.renderer.dispose?.(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, compra: true, caixas: 4, embalagens: 36, entrega: true, coleta: true, reposicao: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
