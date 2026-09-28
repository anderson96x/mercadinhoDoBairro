// Headless pacing experiment, not a human playtest or optimal-play solver.
// Run: node scripts/analyze-progression.mjs [seed count, default 3]
// Uses live economy/navigation, 60 Hz, and immediate remote upgrade purchases.
import { Simulacao, distancia } from '../src/jogo/simulacao.js';
import { CONFIG, PRODUTOS, MELHORIAS } from '../src/jogo/configuracao.js';

function random(seed) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

function run(seed, mode) {
  const originalRandom = Math.random;
  Math.random = random(seed);
  try {
    const sim = new Simulacao();
    sim.aleatorio = Math.random;
    const dt = 1 / 60;
    let phase = 'harvest', product = 'tomate';
    let firstSaleMinutes;
    const milestones = {}, purchases = [];
    const order = ['mochila', 'caixa', 'ajudante', 'milho', 'velocidade', 'velocidadeAjudante', 'fertilizante'];
    const choose = () => Object.keys(PRODUTOS).filter(id => sim.estado.produtos[id].liberado)
      .sort((a, b) => sim.estado.produtos[a].prateleira - sim.estado.produtos[b].prateleira)[0];
    for (let tick = 0; tick < 60 * 60 / dt; tick++) {
      const e = sim.estado, player = e.jogador;
      let input = { x: 0, y: 0 };
      const walk = target => {
        const start = { x: player.x, z: player.z };
        sim.caminharCliente(player, target, dt, sim.velocidade);
        const dx = (player.x - start.x) / (dt * sim.velocidade);
        const dz = (player.z - start.z) / (dt * sim.velocidade);
        Object.assign(player, start);
        const a = CONFIG.anguloCamera;
        input = { x: dx * Math.cos(a) - dz * Math.sin(a), y: dx * Math.sin(a) + dz * Math.cos(a) };
      };
      for (const id of order) {
        const m = MELHORIAS.find(item => item.id === id);
        if (e.melhorias[id] >= m.max || !sim.disponibilidadeMelhoria(id).disponivel) continue;
        const result = sim.comprarMelhoria(id);
        if (result.sucesso) {
          if (result.selecionarProduto) sim.aplicarFertilizante(Object.keys(PRODUTOS).find(p => e.produtos[p].liberado && !e.produtos[p].crescimentoMelhorado));
          purchases.push({ id, minutes: +(sim.tempo / 60).toFixed(2), level: sim.nivel });
        }
        // Save toward the next upgrade, rather than spending around it.
        if (e.melhorias[id] < m.max) break;
      }
      const queue = sim.clientes.filter(c => ['indoCaixa', 'fila'].includes(c.fase)).length;
      if (mode === 'ideal-stock') {
        // Counterfactual ceiling: unlimited free shelf supply and remote checkout.
        for (const [id, stock] of Object.entries(e.produtos)) if (stock.liberado) stock.prateleira = PRODUTOS[id].capacidadePrateleira;
        Object.assign(player, CONFIG.cadeiraCaixa);
      } else if (mode === 'staff-only-after-hire' && e.melhorias.ajudante && e.melhorias.caixa) {
        // Stop helping once both employees have been purchased.
        walk(CONFIG.inicio);
      } else {
        if (phase === 'harvest' && player.inventario.length >= sim.capacidade) phase = 'stock';
        if (phase === 'harvest' && player.inventario.length && !e.produtos[product].horta && distancia(player, PRODUTOS[product].coleta) < 0.2) phase = 'stock';
        if (phase === 'stock' && (!player.inventario.length || e.produtos[product].prateleira >= PRODUTOS[product].capacidadePrateleira)) {
          phase = !e.melhorias.caixa && queue ? 'checkout' : 'harvest';
          if (!player.inventario.length) product = choose();
        }
        if (phase === 'checkout' && (!queue || e.melhorias.caixa)) { phase = 'harvest'; product = choose(); }
        const target = phase === 'checkout' ? CONFIG.cadeiraCaixa : phase === 'stock' ? PRODUTOS[product].reposicao : PRODUTOS[product].coleta;
        // Use the game's obstacle-aware navigation at the player's real speed.
        // atualizar() still handles all harvest/stock/checkout interactions.
        walk(target);
      }
      sim.atualizar(dt, input);
      sim.consumirEventos();
      if (firstSaleMinutes === undefined && e.estatisticas.clientes > 0) firstSaleMinutes = +(sim.tempo / 60).toFixed(2);
      for (const level of [2, 3, 4, 5]) if (sim.nivel >= level && milestones[level] === undefined) milestones[level] = +(sim.tempo / 60).toFixed(2);
      if (MELHORIAS.every(m => e.melhorias[m.id] >= m.max)) break;
    }
    return { seed, mode, firstSaleMinutes, milestones, purchases, elapsedMinutes: +(sim.tempo / 60).toFixed(2), allUpgrades: MELHORIAS.every(m => sim.estado.melhorias[m.id] >= m.max), level: sim.nivel, customers: sim.estado.estatisticas.clientes, revenue: sim.estado.estatisticas.faturamento, reputation: sim.reputacao };
  } finally { Math.random = originalRandom; }
}

const count = Math.max(1, Math.min(20, Number(process.argv[2]) || 3));
for (const mode of ['ideal-stock', 'active', 'staff-only-after-hire']) {
  for (let seed = 1; seed <= count; seed++) console.log(JSON.stringify(run(seed, mode)));
}
