# Expansão N18 — verificação em 2026-10-21

Versão 0.51.0. Compra única de R$ 10.000 em Escritório → Melhorias → Mercado, disponível a partir do nível 18 e após a padaria.

- Testes automatizados: compra, nível, saldo, pré-requisito, limite, ausência da expansão em saves antigos, persistência de posições no terreno ampliado, preservação de estoques e ingredientes, isolamento entre partidas, coleta, receitas, reposição, painel de produção, vendas e modelos.
- Preservação: todas as posições de venda e as divisórias do salão permanecem iguais. A cozinha mantém seu piso e seus equipamentos; suas bancadas recuam até a face interna da nova parede, acompanhadas pelos pontos de entrega/coleta. A porta de produção original permanece no lugar.
- Paredes: abertura junto à cozinha fechada com colisão; uma única lateral direita de 22 u, com altura de 0,75 u e espessura de 0,28 u, sem sobrepor os trechos anteriores. A mureta atrás das bancadas é removida da renderização e das colisões, permitindo passar entre as bancadas até a nova parede.
- Rotas: coleta, reposição, todos os pontos de compra e retorno ao caixa até N18; viagens reais do repositor através da porta original, do anexo e da saída restante.
- Edge: botão disponível por R$ 10.000; compra pelo painel acrescenta o anexo sem remover as paredes existentes. A aplicação principal abre e recarrega o save expandido mantendo nível 18 e saldo.
- Visual: desktop 1440 × 1000 e celular 390 × 844, nos renderizadores WebGL e Canvas. Nenhuma exceção JavaScript durante as verificações.
- Compatibilidade: mantém o formato de salvamento e a planta de partidas sem a compra. A ampliação não libera produtos nem altera receitas ou demanda.

Capturas:

- [Detalhe das paredes contínuas da cozinha](previews/paredes-cozinha-n18-desktop.png)
- [Antes da compra](previews/expansao-n18-antes-desktop.png)
- [Compra no escritório](previews/expansao-n18-compra.png)
- [Desktop WebGL](previews/expansao-n18-desktop.png)
- [Celular WebGL](previews/expansao-n18-mobile.png)
- [Desktop Canvas](previews/expansao-n18-canvas-desktop.png)
- [Celular Canvas](previews/expansao-n18-canvas-mobile.png)

Comandos: `npm test`, `npm run build`, `node scripts/check-store-layout.mjs` e `node scripts/render-floor-plan.mjs`.
