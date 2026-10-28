// Verifica os sucos no Edge, sem salvar imagens ou acessar saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-sucos-'));
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
      const { CONFIG, SEQUENCIA_MELHORIAS } = await import('/src/jogo/configuracao.js');
      const { SUCOS } = await import('/src/jogo/sucos.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const { atualizarPainelProducao } = await import('/src/interface/producao.js');
      const verificar = (condicao, mensagem) => { if (!condicao) throw Error(mensagem); };
      const sim = new Simulacao();
      sim.estado.estatisticas.clientes = 22 * CONFIG.clientesPorNivel;
      sim.estado.dinheiro = 100000;
      for (const id of SEQUENCIA_MELHORIAS.slice(0, SEQUENCIA_MELHORIAS.indexOf('sucos'))) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;inset:0;z-index:1000'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0);
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador incorreto');
      verificar(!cena.produtos.sucoLaranja.grupo.visible, 'Geladeira visível antes da compra');
      verificar(sim.comprarMelhoria('sucos').sucesso, 'Compra de sucos');
      cena.atualizar(0);
      verificar(cena.cena.getObjectByName('geladeira-sucos') && cena.cena.getObjectByName('maquina-sucos') && cena.cena.getObjectByName('balcao-sucos'), 'Modelos ausentes');
      verificar(cena.produtos.sucoLaranja.grupo.visible, 'Modelo oculto após compra');
      const maquina = cena.cena.getObjectByName('maquina-sucos'), modelo = maquina.userData.sucos;
      verificar(!modelo.liquido.visible && !modelo.superficie.visible && !modelo.giro.visible, 'Cuba não começa vazia');
      verificar(maquina.getObjectByName('cuba-transparente-sucos').material.transparent && maquina.getObjectByName('cupula-sucos'), 'Cuba transparente ausente');
      const geladeira = cena.cena.getObjectByName('geladeira-sucos');
      verificar(geladeira.children.filter(o => o.name === 'porta-vidro-sucos').length === 1, 'Geladeira deve ter porta única');
      verificar(geladeira.children.filter(o => o.userData.sabor).length === 4, 'Geladeira deve ter quatro prateleiras');
      for (const id of Object.keys(SUCOS.sabores)) sim.estado.produtos[id].prateleira = 6;
      cena.atualizar(0);
      for (const id of Object.keys(SUCOS.sabores)) {
        const garrafas = cena.produtos[id].frutas;
        verificar(garrafas.filter(o => o.visible).length === 6 && new Set(garrafas.map(o => o.position.z)).size === 1, 'Garrafas não formam fileira completa por sabor');
        sim.estado.produtos[id].prateleira = 0;
      }
      for (const [indice, [id, sabor]] of Object.entries(SUCOS.sabores).entries()) {
        sim.estado.sucos.proximo = indice;
        sim.estado.sucos.ingredientes = { laranja: 8, morango: 8, maca: 8 };
        sim.estado.sucos.progresso[id] = 0.1;
        const antes = modelo.giro.rotation.y;
        cena.atualizar(0.1);
        verificar(modelo.liquido.visible && modelo.giro.rotation.y > antes && modelo.liquido.material.color.getHex() === sabor.cor, 'Giro ou cor incorretos: ' + id);
        verificar(cena.produtos[id].frutas[0].getObjectByName('rotulo-verde-suco'), 'Garrafa sem rótulo');
      }
      sim.pausado = true;
      const pausado = modelo.giro.rotation.y;
      cena.atualizar(0.1);
      verificar(modelo.giro.rotation.y === pausado, 'Líquido gira durante a pausa');
      sim.pausado = false;
      sim.estado.sucos.ingredientes = { laranja: 0, morango: 0, maca: 0 };
      cena.atualizar(0.1);
      verificar(modelo.giro.rotation.y === pausado, 'Líquido gira sem frutas');
      verificar(!modelo.liquido.visible && !modelo.superficie.visible && !modelo.giro.visible, 'Cuba mantém líquido sem produção');
      for (const id of Object.keys(SUCOS.sabores)) sim.estado.sucos.progresso[id] = 0;
      Object.assign(sim.estado.jogador, SUCOS.entrega);
      sim.estado.jogador.inventario = ['laranja', 'maca', 'morango'];
      for (let i = 0; i < 3; i++) { sim.tempo++; sim.interagir(); }
      verificar(sim.estado.jogador.inventario.length === 0, 'Entrega não aceita as três frutas');
      sim.estado.sucos.proximo = 3;
      sim.atualizarProducao(2);
      const retomado = new Simulacao(JSON.parse(JSON.stringify(sim.estado)));
      retomado.atualizarProducao(3);
      verificar(retomado.estado.produtos.sucoMisto.horta === 3 && retomado.estado.produtos.sucoMisto.prateleira === 0, 'Mix não aguarda no balcão ao recarregar');
      cena.atualizar(0.1);
      verificar(modelo.liquido.visible, 'Cuba vazia durante preparo');
      sim.atualizarProducao(3); cena.atualizar(0.1);
      verificar(!modelo.liquido.visible && !modelo.superficie.visible && !modelo.giro.visible, 'Cuba não esvaziou após engarrafar');
      sim.estado.sucos.ingredientes = { laranja: 8, morango: 8, maca: 8 };
      const painel = document.createElement('aside');
      painel.innerHTML = '<div id="lista-producao"></div>'; document.body.append(painel);
      atualizarPainelProducao(painel, sim.estado);
      verificar(painel.querySelectorAll('[class*="producao-cartao suco"]').length === 4, 'Painel sem quatro receitas');
      for (let i = 0; i < 16; i++) sim.atualizarProducao(5);
      cena.atualizar(0);
      for (const id of Object.keys(SUCOS.sabores)) {
        verificar(sim.estado.produtos[id].horta > 0 && sim.estado.produtos[id].prateleira === 0, 'Sabor não aguarda coleta: ' + id);
        verificar(cena.produtos[id].frutos.filter(o => o.visible).length === sim.estado.produtos[id].horta, 'Estoque do balcão divergente');
        verificar(cena.produtos[id].frutas.filter(o => o.visible).length === sim.estado.produtos[id].prateleira, 'Estoque visual divergente');
      }
      Object.assign(sim.estado.jogador, SUCOS.entrega); sim.tempo++; sim.interagir();
      verificar(sim.estado.jogador.inventario[0] === 'sucoLaranja', 'Garrafas não podem ser recolhidas');
      Object.assign(sim.estado.jogador, SUCOS.cliente); sim.tempo++; sim.interagir();
      verificar(sim.estado.produtos.sucoLaranja.prateleira === 1 && sim.estado.jogador.inventario.length === 0, 'Geladeira não aceita garrafas');
      cena.atualizar(0);
      cena.atualizar(0.4);
      verificar(cena.produtos.sucoLaranja.frutas.filter(o => o.visible).length === 1, 'Garrafa ausente na geladeira após reposição');
      verificar(document.documentElement.scrollWidth <= innerWidth, 'Layout transborda a tela');
      cena.renderer.dispose?.(); painel.remove(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, compra: true, modelos: true, liquidoAnimado: true, cubaVaziaAposLote: true, prateleirasPorSabor: 4, fileirasCompletas: true, cores: 4, pausa: true, garrafas: true, balcao: true, coleta: true, reposicao: true, painel: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
