// Verifica a confeitaria no Edge, sem salvar imagens ou acessar saves pessoais.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const perfil = await mkdtemp(path.join(tmpdir(), 'mercadinho-confeitaria-'));
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
      const { CONFIG } = await import('/src/jogo/configuracao.js');
      const { CONFEITARIA } = await import('/src/jogo/confeitaria.js');
      const { Cena } = await import('/src/jogo/cena.js');
      const { Interface } = await import('/src/interface/interface.js');
      const { atualizarPainelProducao } = await import('/src/interface/producao.js');
      const verificar = (condicao, mensagem) => { if (!condicao) throw Error(mensagem); };
      const sim = new Simulacao();
      sim.estado.estatisticas.clientes = 17 * CONFIG.clientesPorNivel;
      sim.estado.dinheiro = 100000;
      for (const id of ['alaProducao', 'alaTrigo', 'alaPadaria', 'alaArtesanal', 'apiario', 'caixa']) verificar(sim.comprarMelhoria(id).sucesso, id);
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;inset:0;z-index:1000'; document.body.append(container);
      const original = HTMLCanvasElement.prototype.getContext;
      if (${canvas}) HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      let cena;
      try { cena = new Cena(container, sim); } finally { HTMLCanvasElement.prototype.getContext = original; }
      cena.atualizar(0);
      verificar(cena.modoCompativel === ${canvas}, 'Renderizador incorreto');
      const padaria = cena.produtos.pao;
      verificar(padaria.padeiros.length === 1, 'Padaria deve ter apenas um padeiro');
      verificar(padaria.moinho.parent === padaria.forno && padaria.moinho.position.y > 1.4, 'Processador deve ficar sobre o forno');
      verificar(padaria.forno.getObjectByName('porta-forno-industrial') && padaria.forno.getObjectByName('bandeja-forno'), 'Modelo industrial incompleto');
      verificar(padaria.forno.getObjectByName('carenagem-forno').material.color.getHex() === 0xadb7b9, 'Forno não voltou ao cinza claro');
      const entreMaquinas = padaria.batedeira.grupo.position.clone().sub(padaria.forno.position).normalize();
      verificar(padaria.forno.getWorldDirection(entreMaquinas.clone()).dot(entreMaquinas) > 0.999, 'Forno não aponta para a batedeira');
      verificar(padaria.batedeira.grupo.getWorldDirection(entreMaquinas.clone()).dot(entreMaquinas) < -0.999, 'Batedeira não aponta para o forno');
      verificar(!padaria.vitrinesConfeitaria.visible && !padaria.confeiteiro.visible, 'Vitrines ou funcionário antes da compra');
      verificar(padaria.grupo.getObjectByName('tampo-balcao-padaria'), 'Balcão plano ausente');
      verificar(!sim.comprarMelhoria('confeitaria').sucesso, 'Compra antes do N17');
      sim.estado.estatisticas.clientes += CONFIG.clientesPorNivel;
      sim.estado.dinheiro = 1000;
      const root = document.createElement('div');
      root.innerHTML = '<div id="painel"><div id="painel-conteudo"></div></div><aside id="producao" class="painel-producao"><details open><summary>Produção</summary><div id="lista-producao" class="lista-producao"></div></details></aside>';
      root.querySelector('#producao summary').replaceWith(document.querySelector('#painel-producao summary').cloneNode(true));
      document.body.append(root);
      const ui = Object.create(Interface.prototype);
      ui.sim = sim; ui.abaMelhorias = 'mercado'; ui.acoes = { comprar: id => sim.comprarMelhoria(id) };
      ui.el = id => root.querySelector('#' + id);
      ui.atualizar = () => {}; ui.mensagem = () => {};
      ui.tipoPainel = 'melhorias'; ui.renderizarPainel();
      const botao = root.querySelector('[data-melhoria="confeitaria"]');
      verificar(botao && !botao.disabled, 'Compra indisponível no N17'); botao.click();
      verificar(sim.estado.melhorias.confeitaria === 1 && sim.estado.dinheiro === 0, 'Compra não aplicada');
      cena.atualizar(0);
      verificar(padaria.vitrinesConfeitaria.visible && padaria.confeiteiro.visible, 'Vitrines ou confeiteiro ausentes');
      verificar(padaria.batedeira.grupo.visible, 'Batedeira ausente');
      verificar(padaria.confeiteiro.userData.alertaTrigo.visible, 'Exclamação ausente sem ingredientes e com vitrines vazias');
      const descanso = padaria.confeiteiro.position.clone();
      const cabeca = padaria.confeiteiro.userData.cabecaPadaria.quaternion.clone();
      for (let i = 0; i < 120; i++) cena.animarConfeiteiro(padaria, 1 / 60);
      verificar(descanso.equals(padaria.confeiteiro.position), 'Confeiteiro se move durante descanso');
      verificar(!cabeca.equals(padaria.confeiteiro.userData.cabecaPadaria.quaternion), 'Cabeça parada durante descanso');
      const donuts = sim.produtos.donut.prateleira;
      verificar(padaria.confeiteiro.userData.atorConfeitaria.angulo === Math.atan2(donuts.x - descanso.x, donuts.z - descanso.z), 'Descanso não olha para os donuts');
      Object.assign(sim.estado.jogador, CONFEITARIA.entrega, { inventario: ['mel', 'ovos'] });
      for (let i = 0; i < 2; i++) { sim.tempo += 1; sim.interagir(); }
      verificar(!sim.estado.jogador.inventario.length, 'Ingredientes não entregues');
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(root.querySelector('.producao-cartao.confeitaria')?.textContent.includes('1 mel + 1 ovo'), 'Receita ausente');
      Object.assign(sim.estado.jogador, CONFEITARIA.entrega);
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      const cartao = root.querySelector('.producao-cartao.confeitaria');
      verificar(!root.querySelector('#producao').hidden && cartao, 'Cartão não aparece junto à bandeja de mel e ovos');
      verificar(!cena.labels.some(label => label.id === 'confeitaria-ingredientes'), 'Balão MEL + OVOS ainda presente');
      verificar(getComputedStyle(cartao.querySelector('h3')).color === 'rgb(166, 93, 43)', 'Título não acompanha o estilo da padaria');
      verificar(cartao.scrollWidth <= cartao.clientWidth, 'Conteúdo ultrapassa a largura do cartão');
      const limites = root.querySelector('#producao').getBoundingClientRect();
      verificar(limites.left >= 0 && limites.right <= innerWidth, 'Painel fora da tela');
      Object.assign(sim.estado.produtos.bolo, { prateleira: 4 });
      Object.assign(sim.estado.produtos.donut, { prateleira: 10 });
      Object.assign(sim.estado.produtos.eclair, { prateleira: 5 });
      sim.estado.produtos.pao.prateleira = 11;
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(!root.querySelector('#producao-resumo'), 'Contagem duplicada no cabeçalho');
      verificar(root.querySelector('.confeitaria .producao-prontos').textContent === '19 / 24', 'Selo dos doces sem capacidade');
      verificar(root.querySelector('.confeitaria progress'), 'Barra ausente durante o preparo dos doces');
      sim.estado.produtos.bolo.prateleira = CONFEITARIA.produtos.bolo.capacidade;
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(root.querySelector('.confeitaria progress'), 'Uma vitrine cheia bloqueou os outros doces');
      for (const [id, produto] of Object.entries(CONFEITARIA.produtos)) sim.estado.produtos[id].prateleira = produto.capacidade;
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(!root.querySelector('.confeitaria progress') && !root.querySelector('.confeitaria .producao-status b'), 'Progresso visível com vitrine cheia');
      Object.assign(sim.estado.jogador, sim.produtos.pao.cliente);
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(!root.querySelector('#producao-resumo'), 'Contagem duplicada no cabeçalho');
      verificar(root.querySelector('.pao .producao-prontos').textContent === '11 / 18', 'Selo dos pães sem capacidade');
      verificar(!root.querySelector('.pao progress') && !root.querySelector('.pao .producao-status b'), 'Progresso visível enquanto padeiros aguardam trigo');
      for (const id of ['bolo', 'donut', 'eclair', 'pao']) sim.estado.produtos[id].prateleira = 0;
      Object.assign(sim.estado.jogador, CONFEITARIA.posto);
      atualizarPainelProducao(root.querySelector('#producao'), sim.estado);
      verificar(root.querySelector('#producao').hidden || !root.querySelector('.producao-cartao.confeitaria'), 'Cartão aparece na batedeira sem estar perto da bandeja');
      const inicio = padaria.confeiteiro.position.clone();
      const rotor = padaria.batedeira.rotor.rotation.y;
      for (let i = 0; i < 450; i++) { sim.atualizarProducao(1 / 60); cena.animarConfeiteiro(padaria, 1 / 60); }
      verificar(padaria.batedeira.rotor.rotation.y !== rotor, 'Batedeira não gira durante o preparo');
      verificar(inicio.distanceTo(padaria.confeiteiro.position) > 1, 'Confeiteiro não se desloca');
      verificar(padaria.confeiteiro.userData.cargaPadaria.visible, 'Bandeja ausente');
      const pausado = padaria.confeiteiro.position.clone(); cena.animarConfeiteiro(padaria, 0);
      verificar(pausado.equals(padaria.confeiteiro.position), 'Pausa move o confeiteiro');
      verificar(padaria.entregaConfeitaria.name === 'entrega-confeitaria', 'Bandeja de recebimento ausente');
      const entregues = new Set();
      for (let i = 0; i < 800 && sim.estado.confeitaria.etapaEntrega >= 0; i++) {
        const antes = Object.fromEntries(Object.keys(CONFEITARIA.produtos).map(id => [id, sim.estado.produtos[id].prateleira]));
        sim.atualizarProducao(1 / 120); cena.animarConfeiteiro(padaria, 1 / 120);
        for (const id of Object.keys(CONFEITARIA.produtos)) if (sim.estado.produtos[id].prateleira > antes[id]) entregues.add(id);
        if (entregues.size === 3) verificar(padaria.docesNaBandeja.every(o => !o.visible), 'Doces continuam na bandeja depois da entrega');
      }
      verificar(entregues.size === 3, 'Não abasteceu as três vitrines');
      cena.atualizar(0);
      verificar(inicio.distanceTo(padaria.confeiteiro.position) < 0.01, 'Confeiteiro não voltou após acabar o ingrediente');
      for (const id of Object.keys(CONFEITARIA.produtos)) {
        verificar(cena.produtos[id].frutas.filter(p => p.visible).length === 1, 'Estoque visual incorreto: ' + id);
        verificar(new Simulacao(sim.estado).estado.produtos[id].prateleira === 1, 'Estoque perdido ao carregar: ' + id);
      }
      sim.estado.produtos.pao.prateleira = 0;
      const cargasPadeiro = new Set();
      for (let i = 0; i < 900; i++) {
        cena.animarPadeiros(padaria, { trigoPadaria: 2, farinha: 1 }, i / 60, 1 / 60);
        const d = padaria.padeiros[0].userData;
        for (const carga of ['Trigo', 'Farinha', 'Pao']) if (d['carga' + carga].visible) cargasPadeiro.add(carga);
      }
      verificar(cargasPadeiro.size === 3, 'Único padeiro não transportou trigo, farinha e pão');
      const posicaoPadeiro = padaria.padeiros[0].position.clone();
      cena.animarPadeiros(padaria, { trigoPadaria: 2, farinha: 1 }, 15, 0);
      verificar(posicaoPadeiro.equals(padaria.padeiros[0].position), 'Pausa move o padeiro');
      let transportouPaoSemTrigo = false;
      for (let i = 0; i < 900; i++) {
        cena.animarPadeiros(padaria, { trigoPadaria: 0, farinha: 1 }, 15 + i / 60, 1 / 60);
        transportouPaoSemTrigo ||= padaria.padeiros[0].userData.cargaPao.visible;
      }
      verificar(transportouPaoSemTrigo, 'Padeiro não termina a farinha restante');
      sim.estado.produtos.pao.prateleira = 16;
      Object.assign(sim.estado.producao, { trigoPadaria: 8, farinha: 0, paesReserva: 0, progressoMoagem: 0, progressoForno: 0, entregaPadaria: { modo: '', tempo: 0, paes: 0, entregou: false } });
      sim.atualizarProducao(1 / 60);
      cena.animarPadeiros(padaria, sim.estado.producao, sim.tempo, 1 / 60);
      verificar(padaria.padeiros[0].userData.ativoPadaria, 'Moinho parado com trigo e 16/18 pães');
      for (let i = 0; i < 300; i++) sim.atualizarProducao(0.1);
      verificar(sim.estado.produtos.pao.prateleira === 18 && sim.estado.producao.paesReserva === 1, 'Pães não completaram a vitrine preservando o excedente');
      Object.assign(sim.estado.confeitaria, { mel: 1, ovos: 1 });
      sim.estado.produtos.bolo.prateleira = 6;
      sim.estado.produtos.donut.prateleira = 11;
      sim.estado.produtos.eclair.prateleira = 5;
      sim.atualizarProducao(30); cena.atualizar(0);
      verificar(sim.estado.produtos.donut.prateleira === 12 && sim.estado.produtos.eclair.prateleira === 6, 'Confeitaria parou porque bolos estavam cheios');
      sim.estado.produtos.pao.prateleira = 0;
      Object.assign(sim.estado.producao, { trigoPadaria: 1, farinha: 0, paesReserva: 0, progressoMoagem: 0, progressoForno: 0, entregaPadaria: { modo: '', tempo: 0, paes: 0, entregou: false } });
      const d = padaria.padeiros[0].userData;
      for (const campo of ['cicloPadaria', 'tempoPadaria', 'modoPadaria', 'atorPadaria', 'ativoPadaria', 'caminhoPadaria']) delete d[campo];
      const etapasPao = new Set();
      for (let i = 0; i < 1800; i++) {
        sim.atualizarProducao(1 / 60);
        cena.animarPadeiros(padaria, sim.estado.producao, i / 60, 1 / 60);
        const naVitrine = padaria.frutas.filter(pao => pao.visible).length;
        if (!sim.estado.producao.entregaPadaria.entregou && sim.estado.producao.entregaPadaria.modo) verificar(naVitrine === 0 && sim.estado.produtos.pao.prateleira === 0, 'Pães apareceram antes da entrega da bandeja');
        if (naVitrine > 0 && !etapasPao.has('entregou')) {
          verificar(d.acaoPadaria === 'expor' && d.fasePadaria >= 0.7, 'Estoque não está sincronizado ao gesto de expor');
          etapasPao.add('entregou');
        }
        if (!['receber', 'colocar', 'assar', 'retirar', 'expor'].includes(d.acaoPadaria) || d.fasePadaria < 0.6 || d.fasePadaria > 0.7) continue;
        if (d.acaoPadaria === 'colocar' || d.acaoPadaria === 'retirar') verificar(padaria.portaForno.position.y > 1.5, 'Porta fechada durante transferência');
        if (d.acaoPadaria === 'retirar') verificar(d.cargaPao.visible && !padaria.paesNoForno.visible, 'Pães não saíram da câmara para a bandeja');
        if (!etapasPao.has(d.acaoPadaria)) cena.renderer.render(cena.cena, cena.camera);
        etapasPao.add(d.acaoPadaria);
      }
      verificar([...etapasPao].join(',') === 'receber,colocar,assar,retirar,expor,entregou', 'Último trigo interrompe a sequência visual');
      verificar(sim.estado.produtos.pao.prateleira === 3 && !d.ativoPadaria, 'Lote visual altera estoque ou não termina');
      cena.renderer.dispose?.(); root.remove(); container.remove();
      return { mobile: ${mobile}, canvas: ${canvas}, compra: true, batedeira: true, fornoCinza: true, sequenciaPao: [...etapasPao], padeiroUnico: true, farinhaSemTrigo: true, alerta: true, ingredientes: true, vitrines: true, estoque: true, funcionario: true, pausa: true };
    })()`);
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
