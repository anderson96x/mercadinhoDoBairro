// Verificações de navegador sem imagens e sem acessar saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-cafeteria-'));
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
    const prazo = setTimeout(() => { pendentes.delete(numero); reject(new Error(`Sem resposta: ${method}`)); }, 45000);
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
      const { CAFETERIA, INSUMOS_CAFETERIA } = await import('/src/jogo/cafeteria.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const { limitesRua } = await import('/src/jogo/bairro.js');
      const { resumoProducao } = await import('/src/interface/producao.js');
      const { atualizarPainelClientes } = await import('/src/interface/clientes.js');
      const verificar = (ok, msg) => { if (!ok) throw Error(msg); };
      const sim = new Simulacao(); sim.estado.estatisticas.clientes = 26 * CONFIG.clientesPorNivel; sim.estado.dinheiro = 100000;
      sim.assaltosAtivos = false; sim.temporizadorEntregaAtivo = false; sim.proximoCliente = Infinity; sim.proximoClienteCafe = Infinity;
      for (const id of SEQUENCIA_MELHORIAS.slice(0, SEQUENCIA_MELHORIAS.indexOf('cafeteria'))) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div'); container.style.cssText = 'position:fixed;inset:0'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0); verificar(!cena.cafeteria.grupo.visible, 'Antes da compra');
      verificar(sim.comprarMelhoria('cafeteria').sucesso, 'Compra N27'); cena.atualizar(0);
      verificar(cena.cafeteria.grupo.visible, 'Ala da cafeteria');
      verificar(!cena.cafeteria.grupo.getObjectByName('prateleira-cafeteria'), 'Prateleiras da parede removidas');
      verificar(CAFETERIA.balcao.w === 4 && CAFETERIA.fechamento.x === 24.075, 'Prolongamento de quatro unidades');
      verificar(Math.abs(CAFETERIA.balcao.x - CAFETERIA.balcao.w / 2 - 20.4) < 1e-8 && CAFETERIA.balcao.d === 0.65, 'Emenda alinhada à padaria');
      const tamposCafe = [];
      cena.cafeteria.grupo.traverse(o => { if (o.name === 'tampo-balcao-padaria') tamposCafe.push(o); });
      verificar(tamposCafe.length === 2 && tamposCafe.every(o => o.position.y === 1.18 && o.material.color.getHex() === 0xf0e6d3), 'Mesmo tampo claro da padaria');
      const equipamentos = cena.cafeteria.grupo.getObjectByName('equipamentos-cafeteria');
      verificar(equipamentos.rotation.y === Math.PI / 2 && sim.barista.angulo === Math.PI / 2, 'Máquina e barista virados à direita');
      const painelMaquina = equipamentos.getObjectByName('painel-espresso'), corpoMaquina = equipamentos.getObjectByName('maquina-espresso');
      verificar(painelMaquina.getWorldPosition(painelMaquina.position.clone()).x > corpoMaquina.getWorldPosition(corpoMaquina.position.clone()).x, 'Frente da máquina aponta para +x');
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador');
      verificar(!cena.cena.getObjectByName('parede-lateral-continua').parent.visible, 'Remoção da lateral antiga');
      const asfalto = cena.cena.getObjectByName('rua-cafeteria');
      verificar(asfalto.position.y === 0 && asfalto.position.z === 11.3 && asfalto.geometry.parameters.depth === 4.4, 'Alinhamento da rua');
      verificar(asfalto.material.color.getHex() === 0x48525e, 'Cor do asfalto');
      verificar(cena.cena.getObjectByName('guia-cafeteria') && cena.cena.getObjectByName('faixa-rua-cafeteria'), 'Guia e sinalização');
      const pisoMaquinas = cena.cena.getObjectByName('piso-maquinas-cafeteria');
      verificar(pisoMaquinas.position.z === -12.3 && pisoMaquinas.geometry.parameters.width === 12, 'Prolongamento das máquinas');
      cena.trafego.atualizarExpansao(true, true); cena.trafego.faixasReservadas.clear();
      verificar(cena.trafego.criarNaFaixa(0), 'Novo carro');
      verificar(cena.trafego.carros.at(-1).grupo.position.x > 30, 'Nascimento na borda ampliada');
      cena.coletaBanco.atualizar({ tempo: 0 }, limitesRua(true, true));
      verificar(cena.coletaBanco.van.position.x > 30, 'Carro-forte na borda ampliada'); cena.coletaBanco.atualizar(null);
      cena.assaltoVisual.atualizar({ tempo: 0 }, limitesRua(true, true));
      verificar(cena.assaltoVisual.carro.position.x > 30, 'Carro do assalto na borda ampliada'); cena.assaltoVisual.atualizar(null);
      const contar = nome => { let total = 0; cena.cafeteria.grupo.traverse(o => { if (o.name === nome) total++; }); return total; };
      verificar(contar('mesa-cafeteria') === 4 && contar('cadeira-cafeteria') === 8, 'Mesas e cadeiras');
      verificar(sim.encomendarImportacoes({ importarCafe: 1 }).quantidade === 24, 'Importação');
      for (let i = 0; i < 18000 && (sim.estado.deposito.pedidos.length || sim.entregas.caminhao); i++) sim.entregas.atualizar(sim, 0.05);
      verificar(sim.estado.produtos.cafe.horta === 24, 'Entrega de café'); cena.atualizar(0);
      const caixas = []; cena.cena.traverse(o => { if (o.name === 'caixa-cafe' && o.visible) caixas.push(o); });
      verificar(caixas.length === 1, 'Caixa visível');
      Object.assign(sim.estado.jogador, CAFETERIA.coleta); sim.tempo++; sim.interagir();
      verificar(sim.estado.jogador.inventario[0] === 'cafe', 'Coleta de café');
      Object.assign(sim.estado.jogador, CAFETERIA.entrega); sim.tempo++; sim.interagir();
      verificar(sim.estado.cafeteria.ingredientes.cafe === 1, 'Abastecimento');
      for (const id of INSUMOS_CAFETERIA) sim.estado.cafeteria.ingredientes[id] = 24;
      for (const id of ['pao', 'bolo', 'donut', 'eclair']) sim.estado.produtos[id].prateleira = 12;
      verificar(resumoProducao(sim.estado).some(p => p.id === 'cafeteria'), 'Painel de insumos');
      sim.criarClienteCafeteria(); const cliente = sim.clientes[0]; cliente.pedidoCafe = ['cappuccino', 'donut'];
      for (let i = 0; i < 4000 && cliente.fase !== 'cafeConsumindo'; i++) {
        sim.atualizar(0.05);
        if (i % 40 === 0) cena.atualizar(0.05);
      }
      verificar(cliente.fase === 'cafeConsumindo', 'Pedido servido: ' + JSON.stringify(cliente));
      cena.atualizar(0.3);
      const modelo = cena.clientes.get(cliente.id);
      verificar(!modelo.userData.cesta.visible && !cliente.temCesta && !cliente.usaCarrinho, 'Cliente sem cesta/carrinho');
      verificar(cliente.sentado && sim.estado.cafeteria.atendidos === 1, 'Consumo sentado');
      const painel = document.createElement('div'); painel.innerHTML = '<span id="clientes-ativos"></span><span id="clientes-vazio"></span><div id="lista-clientes"></div>';
      atualizarPainelClientes(painel, sim.clientes, sim.estado.produtos, cena.retratosClientes);
      verificar(painel.textContent.includes('Cappuccino + Donut') && painel.textContent.includes('Consumindo na mesa'), 'Pedido no painel');
      verificar(validarEstado(sim.estado).cafeteria.atendidos === 1, 'Recarga');
      const antes = sim.estado.cafeteria.atendidos; sim.pausado = true; sim.atualizar(0.05); cena.atualizar(0);
      verificar(sim.estado.cafeteria.atendidos === antes, 'Pausa');
      verificar(document.documentElement.scrollWidth <= innerWidth, 'Transbordamento');
      cena.renderer.dispose?.(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, mesas: 4, lugares: 8, importacao: true, abastecimento: true, barista: true, clienteSentado: true, recarga: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
