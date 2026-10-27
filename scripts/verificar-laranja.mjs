// Verifica a loja compacta, a expansão ao comprar laranja e o pomar, sem imagens ou saves pessoais.
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
      sim.proximoCliente = Infinity;
      sim.estado.dinheiro = 100000;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;inset:0;z-index:1000'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0);
      verificar(cena.cestasEntrada[0].parent.position.x === CONFIG.cestas.x, 'Suporte de cestas acompanha a nova posicao');
      verificar(cena.caixeiro.position.x === CONFIG.cadeiraCaixa.x, 'Funcionario acompanha o caixa');
      verificar(cena.cena.children.some(g => g.isGroup && g.position.x === CONFIG.balcao.x
        && g.position.z === CONFIG.balcao.z && g.rotation.y === Math.PI / 2), 'Conjunto completo do caixa acompanha a planta');
      for (let i = 1; i <= 3; i++) {
        const arvore = cena.cena.getObjectByName('arvore-bairro-' + i);
        verificar(arvore && arvore.children.length === 9, 'Modelo ramificado da arvore decorativa');
        verificar(arvore.children.every(m => m.castShadow && m.receiveShadow), 'Sombras das arvores');
      }
      const manchas = [];
      cena.cena.traverse(m => { if (m.name === 'mancha-grama') manchas.push(m); });
      verificar(manchas.length === 10 && manchas.every(m => m.receiveShadow), 'Grama recebe sombras sem recortes claros');
      verificar(sim.compacta, 'Inicio compacto');
      verificar(cena.cena.getObjectByName('piso-inicial').scale.z === 0.5, 'Piso com metade da profundidade');
      verificar(cena.cena.getObjectByName('entrada-producao').position.z === 8, 'Porta compacta');
      const verificarPortaProducao = () => {
        const entrada = cena.cena.getObjectByName('entrada-producao');
        const folhas = entrada.children.filter(o => o.name.startsWith('porta-producao-'));
        verificar(folhas.length === 1 && folhas[0].position.x === 5.1, 'Apenas a folha direita original');
        const contratado = sim.estado.melhorias.ajudante;
        sim.estado.melhorias.ajudante = 0;
        Object.assign(sim.estado.jogador, { x: sim.portaProducao.x, z: sim.portaProducao.z + 2 });
        sim.atualizar(0.05); cena.atualizar(0.05);
        verificar(folhas[0].rotation.y < 0 && folhas[0].rotation.y > -Math.PI / 2, 'Abertura gradual');
        const parcial = sim.aberturasPortasProducao[0];
        sim.pausado = true; sim.atualizar(0.05);
        verificar(sim.aberturasPortasProducao[0] === parcial, 'Pausa congela a porta');
        sim.pausado = false;
        for (let i = 0; i < 15; i++) sim.atualizar(0.05);
        cena.atualizar(0);
        verificar(folhas[0].rotation.y === -Math.PI / 2, 'Porta totalmente aberta');
        Object.assign(sim.estado.jogador, CONFIG.inicio);
        for (let i = 0; i < 15; i++) sim.atualizar(0.05);
        cena.atualizar(0);
        verificar(folhas[0].rotation.y === 0, 'Porta fecha ao afastar');
        const lixeira = cena.cena.getObjectByName('lixeira');
        verificar(lixeira.position.x === 2.85 && lixeira.position.y < 0, 'Lixeira apoiada no gramado');
        verificar(lixeira.position.z === sim.lixeira.z && sim.lixeira.z + sim.lixeira.d / 2 < sim.portaProducao.z, 'Lixeira fora da loja');
        sim.estado.melhorias.ajudante = contratado;
      };
      verificarPortaProducao();
      cena.renderer.render(cena.cena, cena.camera);
      sim.estado.estatisticas.clientes = 3 * CONFIG.clientesPorNivel;
      for (const id of ['caixa', 'milho', 'alaTrigo']) verificar(sim.comprarMelhoria(id).sucesso, id);
      cena.atualizar(0); cena.atualizar(10);
      for (const id of ['trigo', 'milho']) {
        sim.estado.produtos[id].horta = 1;
        Object.assign(sim.estado.jogador, sim.produtos[id].coleta);
        sim.tempo++; sim.interagir();
        Object.assign(sim.estado.jogador, sim.produtos[id].reposicao);
        sim.tempo++; sim.interagir();
        cena.atualizar(1);
        verificar(sim.estado.produtos[id].prateleira === 1, 'Reposicao compacta de ' + id);
        verificar(cena.produtos[id].frutas.filter(f => f.visible).length === 1, 'Estoque visual compacto de ' + id);
        verificar(Math.abs(cena.produtos[id].frutas[0].position.z - sim.produtos[id].prateleira.z) < 1, 'Expositor acompanha parede');
      }
      cena.renderer.render(cena.cena, cena.camera);
      sim.estado.estatisticas.clientes = 4 * CONFIG.clientesPorNivel;
      verificar(sim.comprarMelhoria('ajudante').sucesso, 'Repositor no N5');
      const saldo = sim.estado.dinheiro;
      sim.aumentarNivelDev(); cena.atualizar(0);
      verificar(sim.compacta && cena.cena.getObjectByName('piso-inicial').scale.z === 0.5, 'N6 permanece compacto');
      verificar(sim.estado.dinheiro === saldo + CONFIG.bonusNivel, 'Bonus de nivel preservado');
      verificar(cena.cena.getObjectByName('entrada-producao').position.z === 8, 'Porta permanece compacta');
      const retomadoN6 = new Simulacao(structuredClone(sim.estado));
      verificar(retomadoN6.compacta && retomadoN6.estado.produtos.milho.prateleira === 1, 'Recarga N6 sem laranja');
      cena.renderer.render(cena.cena, cena.camera);
      for (const [nivel, produto, modelo] of [[6, 'laranja', 'laranjeira'], [7, 'maca', 'macieira']]) {
        sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
        sim.estado.jogador.inventario = [];
        verificar(!cena.produtos[produto].grupo.visible, 'Arvore antes da compra');
        const saldoAntes = sim.estado.dinheiro;
        verificar(sim.comprarMelhoria(produto).sucesso, 'Compra');
        cena.atualizar(0);
        if (produto === 'laranja') {
          verificar(!sim.compacta && cena.cena.getObjectByName('piso-inicial').scale.z === 1, 'Expansao ao comprar laranja');
          verificar(sim.estado.dinheiro === saldoAntes - 800, 'Aumento incluido na compra');
          verificar(cena.cena.getObjectByName('entrada-producao').position.z === 0, 'Porta restaurada');
          verificarPortaProducao();
          verificar(cena.produtos.trigo.frutas.filter(f => f.visible).length === 1, 'Estoque preservado na expansao');
          verificar(!new Simulacao(structuredClone(sim.estado)).compacta, 'Recarga apos compra de laranja');
        }
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
      for (const [nivel, id] of [[8, 'cestasExtras'], [9, 'alaArtesanal'], [10, 'logistica'], [11, 'alaProducao'],
        [12, 'alaLeite'], [13, 'alaPadaria'], [14, 'apiario'], [15, 'queijaria'], [16, 'irrigacao'],
        [17, 'cozinhaGeleia'], [18, 'estacionamento'], [19, 'confeitaria']]) {
        sim.estado.estatisticas.clientes = (nivel - 1) * CONFIG.clientesPorNivel;
        verificar(sim.comprarMelhoria(id).sucesso, 'Compra N' + nivel + ': ' + id);
        cena.atualizar(0); cena.atualizar(10);
        verificar(cena.cena.getObjectByName('ampliacao-padaria').visible === (nivel >= 13), 'Padaria amplia somente no N13');
        if (nivel === 9) {
          verificar(cena.produtos.morango.grupo.visible, 'Morango visivel sem padaria');
          verificar(!cena.produtos.ovos.grupo.visible && !cena.produtos.leite.grupo.visible, 'Animais ainda bloqueados');
        }
      }
      cena.renderer.render(cena.cena, cena.camera);
      cena.renderer.dispose?.(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, portaUnicaAnimada: true, lixeiraExterna: true, progressaoAteN19: true, trigoCompactoN4: true, expansaoAoComprarLaranja: true, pomarN6N7: true, morangoN9: true, padariaN13: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
