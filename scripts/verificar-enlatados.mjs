// Com npm run dev ativo, verifica os modelos e SVGs sem salvar imagens nem ler saves.
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
      const { Cena, personagem } = await import('/src/jogo/cena.js');
      const { PRODUTOS } = await import('/src/jogo/configuracao.js');
      const { RenderizadorCompativel } = await import('/src/jogo/renderizador-compativel.js');
      const { construirPrateleirasImportados } = await import('/src/jogo/prateleiras-importados.js');
      const visual = { cena: new THREE.Scene(), produtos: {}, criarLabel() {} };
      const movel = construirPrateleirasImportados((pai, w, h, d, cor, x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: cor }));
        mesh.position.set(x, y, z); pai.add(mesh); return mesh;
      });
      movel.atualizar({ prateleirasImportados: 1 });
      visual.cena.add(movel.grupo);
      for (const id of ['enlatado', 'cereal']) Cena.prototype.construirImportado.call(visual, id, PRODUTOS[id]);
      visual.cena.updateMatrixWorld(true);
      const tabuas = movel.grupo.children[0].children.filter(o => o.name === 'nivel-prateleira-importados')
        .map(o => new THREE.Box3().setFromObject(o));
      for (const id of ['enlatado', 'cereal']) for (const [i, produto] of visual.produtos[id].frutas.entries()) {
        const limite = new THREE.Box3().setFromObject(produto), nivel = Math.floor(i / 9);
        if (Math.abs(limite.min.y - tabuas[nivel].max.y) > 0.001
          || limite.min.x < tabuas[nivel].min.x || limite.max.x > tabuas[nivel].max.x
          || (nivel < 3 && limite.max.y >= tabuas[nivel + 1].min.y)) throw new Error('Produto fora da prateleira: ' + id);
      }
      const latas = visual.produtos.enlatado.frutas, materiais = new Set();
      visual.cena.traverse(o => { if (o.material?.userData.svg) materiais.add(o.material); });
      for (let i = 0; i < 100; i++) {
        if ([...materiais].every(m => m.map?.image?.complete && m.map.image.naturalWidth > 0)) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (![...materiais].every(m => m.map?.image?.naturalWidth > 0)) throw new Error('SVG não carregado');
      const jogador = personagem(0x478e65, 0xf2c49c, true);
      const ator = { x: PRODUTOS.enlatado.prateleira.x - 1.4, z: PRODUTOS.enlatado.prateleira.z, andando: false };
      const inventario = Array(8).fill('cereal');
      Cena.prototype.animarPersonagem.call({}, jogador, ator, 1, 0, inventario);
      visual.cena.add(jogador);
      const volumes = jogador.userData.carga.children.map(p => new THREE.Box3().setFromObject(p.clone()));
      if (volumes.some((a, i) => volumes.slice(i + 1).some(b => a.intersectsBox(b)))) throw new Error('Carga sobreposta');
      if (volumes.some(v => v.max.z - v.min.z < 0.1)) throw new Error('Caixa sem profundidade suficiente no transporte');
      const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 50);
      const caixa = new THREE.Box3().setFromObject(visual.cena), centro = caixa.getCenter(new THREE.Vector3());
      camera.position.copy(centro).add(new THREE.Vector3(-7, 5, 7)); camera.lookAt(centro);
      visual.cena.add(new THREE.HemisphereLight(0xffffff, 0x777777, 2));
      const renderizador = ${canvas} ? new RenderizadorCompativel() : new THREE.WebGLRenderer();
      renderizador.setSize(innerWidth, innerHeight); renderizador.render(visual.cena, camera);
      for (const angulo of [0.7, 1.7, 3.2]) {
        ator.angulo = angulo;
        Cena.prototype.animarPersonagem.call({}, jogador, ator, 1, 0, inventario);
        renderizador.render(visual.cena, camera);
      }
      const saida = { mobile: ${mobile}, canvas: ${canvas}, unidades: latas.length,
        variedades: [...new Set(latas.map(l => l.userData.variedade))], svgs: materiais.size,
        variedadesCereais: [...new Set(visual.produtos.cereal.frutas.map(p => p.userData.variedade))],
        gondolaCheia: visual.produtos.cereal.frutas.length === 36, apoiados: true,
        cargaSemSobreposicao: volumes.length === 8,
        profundidadeCarga: Math.min(...volumes.map(v => v.max.z - v.min.z)),
        largura: renderizador.domElement.width, altura: renderizador.domElement.height };
      renderizador.dispose?.(); return saida;
    })()`);
    if (resultado.unidades !== 36 || resultado.variedades.length !== 4 || resultado.variedadesCereais.length !== 4 || resultado.svgs !== 11) throw new Error(JSON.stringify(resultado));
    console.log(JSON.stringify(resultado));
  }
} finally {
  socket?.close(); processo.kill();
}
