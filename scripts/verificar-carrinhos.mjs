// Verifica desktop/celular e WebGL/Canvas sem capturar ou salvar imagens.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-carrinhos-'));
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
  await chamar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
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
      const { Cena } = await import('/src/jogo/cena.js');
      const { PALETAS } = await import('/src/jogo/personalizacao.js');
      const { Interface } = await import('/src/interface/interface.js');
      const verificar = (condicao, mensagem) => { if (!condicao) throw Error(mensagem); };
      const sim = new Simulacao();
      sim.estado.estatisticas.clientes = 23 * CONFIG.clientesPorNivel; sim.estado.dinheiro = 100000;
      for (const id of SEQUENCIA_MELHORIAS.slice(0, SEQUENCIA_MELHORIAS.indexOf('carrinhos'))) verificar(sim.comprarMelhoria(id).sucesso, id);
      sim.proximoCliente = Infinity; sim.definirAssaltosAtivos(false); sim.tempo = 5; sim.aleatorio = () => 0;
      const ui = new Interface(sim, { pausar() {}, somAtivo: () => false });
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(document.getElementById('mundo'), sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0);
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador incorreto');
      const suporte = cena.estacionamento.grupo.getObjectByName('carrinhos-estacionamento');
      verificar(!suporte.visible, 'Carrinhos visíveis antes da compra');
      ui.abrir('melhorias');
      const botao = document.querySelector('[data-melhoria="carrinhos"]');
      verificar(botao && !botao.disabled && botao.textContent.includes('500'), 'Compra indisponível no celular');
      verificar(sim.comprarMelhoria('carrinhos').sucesso, 'Compra de carrinhos'); ui.fechar(); ui.atualizar(); cena.atualizar(0);
      verificar(suporte.visible && suporte.children.filter(c => c.visible).length === 5, 'Cinco carrinhos ausentes');
      verificar(!document.getElementById('contador-carrinhos-topo').hidden,
        'Ícone de carrinho ausente na barra superior');
      const corCesta = PALETAS.find(({ id }) => id === sim.estado.personalizacao.paleta).principal.slice(1);
      verificar(suporte.children.every(c => c.userData.barrasCesta.every(barra => barra.material.color.getHexString() === corCesta)),
        'Barras dos carrinhos encaixados não acompanham a cor das cestas');
      verificar(document.getElementById('cestas').textContent === '10'
        && document.getElementById('carrinhos-topo').textContent === '5', 'Contagem do HUD incorreta');
      sim.criarCliente(); const c = sim.clientes[0];
      const passo = () => { sim.tempo += 0.05; sim.estado.produtos.tomate.prateleira = 12; cena.atualizarTrafego(0.05); sim.atualizarClientes(0.05); sim.atualizarCaixa(0.05); };
      let chegouManobra = false, puxou = false;
      for (let i = 0; i < 6000 && !(c.temCarrinho && c.fase === 'chegando'); i++) {
        const x = c.x; passo();
        chegouManobra ||= !c.temCarrinho && c.etapa === -3;
        puxou ||= c.fase === 'retirandoCarrinho' && c.x < x;
      }
      verificar(c.temCarrinho, 'Motorista não retirou carrinho'); cena.atualizar(0.05);
      verificar(chegouManobra && puxou, 'Cliente não chegou e puxou o carrinho por trás');
      const modelo = cena.clientes.get(c.id), dados = modelo.userData;
      verificar(dados.carrinho.visible && dados.visualCestaNormal.every(p => !p.visible), 'Retirada duplica a cesta do cliente');
      verificar(dados.carrinho.userData.barrasCesta.every(barra => barra.material.color.getHexString() === corCesta),
        'Barra do carrinho do cliente não acompanha a cor das cestas');
      sim.estado.personalizacao.paleta = 'lavanda'; cena.atualizar(0);
      const corLavanda = PALETAS.find(({ id }) => id === 'lavanda').principal.slice(1);
      verificar(suporte.children.every(carrinho => carrinho.userData.barrasCesta.every(
        barra => barra.material.color.getHexString() === corLavanda)),
      'Carrinhos encaixados não acompanham a troca de paleta');
      verificar(dados.carrinho.userData.barrasCesta.every(
        barra => barra.material.color.getHexString() === corLavanda),
      'Carrinho do cliente não acompanha a troca de paleta');
      verificar(Math.abs(dados.carrinho.position.x) < 0.01 && dados.carrinho.position.z > 1
        && Math.abs(dados.carrinho.rotation.y) < 0.01, 'Carrinho não fica à frente durante o deslocamento');
      const fase = c.fase; c.fase = 'comprando'; cena.atualizar(0);
      verificar(dados.carrinho.position.x > 0.8 && Math.abs(dados.carrinho.position.z) < 0.01
        && Math.abs(dados.carrinho.rotation.y - Math.PI / 2) < 0.01, 'Carrinho não fica ao lado na prateleira');
      c.fase = fase; cena.atualizar(0);
      verificar(suporte.children.filter(c => c.visible).length === 4, 'Carrinho retirado continua no suporte');
      for (let i = 0; i < 6000 && !c.embalado; i++) passo();
      verificar(c.embalado && c.quantidade === 20 && c.temCarrinho, 'Compra de vinte itens não completou'); cena.atualizar(0.05);
      const sacola = dados.sacolas.children[0];
      verificar(dados.carga.children.length === 20 && dados.carga.children.every(p => !p.visible), 'Produtos continuam soltos após o caixa');
      verificar(sacola.visible && sacola.userData.conteudo.children.length === 20 && sacola.position.z > 1
        && sacola.scale.x < 0.8, 'Sacola com produtos não está dentro do carrinho');
      const roda = dados.carrinho.userData.rodas[0];
      c.andando = true; sim.pausado = true; const giro = roda.rotation.x; cena.atualizar(0.1);
      verificar(roda.rotation.x === giro, 'Rodas giram durante pausa'); sim.pausado = false;
      let empurrou = false;
      for (let i = 0; i < 6000 && c.temCarrinho; i++) {
        const x = c.x; passo(); empurrou ||= c.fase === 'devolvendoCarrinho' && c.x > x;
      }
      cena.atualizar(0.05); ui.atualizar();
      verificar(empurrou, 'Cliente não empurrou o carrinho por trás na devolução');
      verificar(!dados.carrinho.visible && sim.carrinhosDisponiveis === 5 && suporte.children.every(c => c.visible), 'Devolução não restaurou carrinhos');
      verificar(c.etapa === 2, 'Motorista voltou em direção à porta depois de devolver o carrinho');
      verificar(sacola.visible && Math.abs(sacola.position.z - 0.58) < 0.01 && sacola.scale.x > 0.8,
        'Cliente não pega a sacola ao devolver o carrinho');
      verificar(new Simulacao(structuredClone(sim.estado)).totalCarrinhos === 5, 'Compra não persiste');
      verificar(document.documentElement.scrollWidth <= innerWidth, 'HUD transborda a tela');
      cena.renderer.dispose?.();
      return { mobile: ${mobile}, canvas: ${canvas}, compra: true, cincoEncaixados: true, retirada: true, vinteItens: true, devolucao: true, pausa: true, hud: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
