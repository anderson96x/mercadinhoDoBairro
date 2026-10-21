# Como ajustar e expandir o jogo

O início da loja usa a [nova planta N1](PLANTA-LOJA-N1.md), seguida pelo [milho no N3](PLANTA-LOJA-N3.md). Edite `src/jogo/planta.js` para o terreno, salão, porta posterior, canteiros e compartimentos de hortifruti; `configuracao.js` consome essa geometria. `FAZENDAS_HORTIFRUTI` mantém milho alinhado atrás do tomate e reserva trigo ainda mais ao fundo. Todo canteiro deve terminar antes de `PLANTA_INICIAL.limites.minZ`, inteiramente atrás da loja. As seções do móvel têm alvos independentes na face do corredor e volumes contíguos agrupados. Não aplique a exigência de espaçamento entre móveis independentes às divisórias desse conjunto. `node scripts/render-floor-plan.mjs` gera os marcos N1 e N3; as plantas V2 são históricas.

## Regras rápidas

O [N4](PLANTA-LOJA-N4.md) usa `PLANTA_OVOS` e o [N5](PLANTA-LOJA-N5.md), `PLANTA_LEITE`. Os estágios 1 e 2 registram instalações de equipamentos mantendo o salão inicial. O N7 também mantém o salão inicial. No N9, `PLANTA_AMPLIADA` define o salão 24 × 16 u; `ALA_PADARIA` ativa o piso lateral e substitui a parede direita inicial. `MODELO_PADARIA`, `pontoPadaria()` e `volumePadaria()` mantêm coordenadas locais, rotação de 90° e volumes coerentes entre modelos, animações e colisão. `selecionarExpositorPosterior()` delimita as faixas de reposição pela frente de ovos e leite; na divisória, ovos têm prioridade estável. Verificações de espaçamento permitem alcances próximos com seleção exclusiva ou parede contínua cobrindo toda a projeção compartilhada. O gerador produz N1, N3, N4, N5, N7 e N9.

Abra `src/jogo/configuracao.js`. Ele concentra os ajustes mais frequentes:

| O que mudar | Onde |
| --- | --- |
| Dinheiro inicial | `CONFIG.dinheiroInicial` |
| Capacidade da cesta | `CONFIG.capacidadeInicial` |
| Velocidade | `CONFIG.velocidadeInicial` |
| Distância das interações | `CONFIG.raioInteracao` |
| Intervalo dos clientes por reputação | `CONFIG.intervaloClientesReputacao` |
| Cestas iniciais e cestas adicionadas pela melhoria do nível 8 (sem cesta, cliente passa pela calçada) | `CONFIG.quantidadeCestas` e `CONFIG.cestasPorMelhoria` |
| Valor de venda | `PRODUTOS.tomate.preco`, por exemplo |
| Crescimento | `PRODUTOS.tomate.tempoCrescimento` |
| Posições da horta e da loja | `horta`, `coleta`, `prateleira` e `reposicao` de cada produto |
| Preços e limites das melhorias | `MELHORIAS` |
| Sequência dos objetivos | `MISSOES` |

Depois de mudar valores iniciais, use **Pausa → Começar um novo jogo** para conferir o novo estado. Um jogo salvo carrega os valores antigos de dinheiro e melhorias.

## Como os módulos conversam

1. `Controles.ler()` retorna a direção da tela, entre -1 e 1.
2. `Simulacao.atualizar()` calcula movimento, produção, clientes e pagamentos em passos de 1/60 de segundo.
3. `Cena.atualizar()` representa esse estado visualmente.
4. `Interface.atualizar()` atualiza os textos e botões.
5. Eventos como `venda`, `colheita` e `melhoria` acionam som e mensagens.

O dinheiro é alterado somente pela simulação. Comprar um botão chama `Simulacao.comprarMelhoria()`, que valida preço, saldo e limite antes de aplicar a compra.

## Adicionar um produto

1. Acrescente uma entrada em `PRODUTOS`, com nome, cor, preço, capacidade, origem e pontos do mapa. Hortas usam `tempoCrescimento`; ovos e leite são produzidos automaticamente em `Simulacao.atualizarProducao()`.
2. Acrescente uma melhoria de `tipo: 'produto'`, com o mesmo identificador do produto, se ele começar bloqueado, ou vincule-o a uma expansão como `ALA_PRODUCAO`.
3. Adicione sua aparência em `criarProduto()` e, se necessário, em `construirEstacao()`, em `cena.js`.
4. Adicione seu ícone a `interface/icones.js` e as cores em `estilos.css`.
5. A descrição acessível da cesta em `interface.js` usa automaticamente os produtos do catálogo.
6. Acrescente os obstáculos físicos em `Simulacao.obstaculos()` e confira os corredores dos clientes e do ajudante.
7. Adicione um objetivo em `MISSOES`, se fizer sentido.
8. A ferramenta opcional `comprar_melhoria`, em `main.js`, usa automaticamente os identificadores de `MELHORIAS`.
9. Adicione campos salvos com valores padrão em `estadoInicial()` e valide-os em `validarEstado()`; jogos da versão atual devem continuar carregando.

Os clientes escolhem entre os produtos liberados; ovos e leite só entram nos pedidos depois de começar a produção. O ajudante escolhe produtos com estoque na origem e espaço na prateleira, priorizando ovos quando precisam de reposição.

## Alterar o mapa

`pisoEstacionamento(expandida)` mantém o piso original no N16 e amplia o asfalto até a fachada do depósito e a lateral da loja após a compra do N18. O quinto argumento de `estacionamento.atualizar()` recebe essa compra, ajustando piso e guias sem mover vagas ou trajetos dos veículos. A guia posterior desaparece para deixar a entrada do depósito livre.

`PLANTA_DEPOSITO`, `paredesDeposito()` e `obstaculosDeposito()` definem o depósito atrás do estacionamento, incluído na compra `expansao` do N18. `deposito.js` desenha o concreto, o portão recolhido e as estantes com caixas. A lateral direita compartilha a parede do anexo e tem a abertura `PLANTA_DEPOSITO.passagem`, sem porta, com verga desenhada pelo bairro acima da altura caminhável. `paredesExpansao()` divide a parede em dois trechos, mantendo livre o vão também nas colisões. O único portão externo fica na face +z, voltado ao estacionamento. Preserve a passagem central, o espaço livre diante das estantes e a distância dos canteiros recuados. O grupo pertence a `expansao-fundos`, acompanhando compra e recarga sem novo campo salvo.

O portão externo usa lâminas independentes controladas por `deposito.atualizar(lojaAberta, dt)`, chamado por `bairro.animarDeposito()`. Ele recolhe as lâminas ao abrir a loja e as leva até a soleira ao fechar; `dt = 0` congela a animação durante a pausa. `volumePortaoDeposito()` fecha a passagem na navegação enquanto `lojaAberta` é falso, sem bloquear a passagem interna do depósito.

No N18, `PLANTA_EXPANSAO` define o anexo posterior de 6 u, o terreno maior, uma nova saída e `bancadas`, com a queijaria e a cozinha de geleias encostadas na face interna da parede dos fundos. Preserve pisos, estações de venda e divisórias do salão. Os novos `pisos` contornam o piso existente das oficinas. `paredesOficinas(true)` retorna uma lista vazia para remover a mureta da cozinha e sua antiga lateral; as paredes externas vêm de `paredesExpansao()`, sem duplicar trechos. `folhasPortasExpansao()` fornece as colisões da nova porta. `produtosDaLoja(estado)` seleciona o catálogo conforme a compra `expansao`, recuando a fazenda e ajustando as origens/coletas das bancadas; use `sim.produtos` para posições em execução. Nunca altere o catálogo global ao comprar: outras partidas e os níveis anteriores devem manter sua planta. `node scripts/check-store-layout.mjs` inclui as rotas do N18; o gerador também produz a planta N18.

As coordenadas usam `x` para os lados, `z` para a profundidade e `y` para a altura. A origem fica perto do centro da loja. O chão está em `y = 0` e o piso elevado da loja em aproximadamente `y = 0.2`.

Mantenha os pontos de coleta e reposição fora dos objetos sólidos. A ala de produção define piso e paredes da pequena extensão, galinheiro na fazenda, prateleira e limites fixos do terreno em `ALA_PRODUCAO`; `construirBairro()` desenha a ala e `Simulacao.obstaculos()` usa a mesma configuração para colisão e busca de caminho. Teste as rotas de clientes e ajudante após mudar qualquer estação.

O navegador do celular acompanha o personagem com a câmera; em telas largas, mostra o conjunto da loja. Ajuste isso em `Cena.redimensionar()` e `Cena.atualizar()`.

## Adicionar uma melhoria

1. Declare título, descrição, custo e limite em `MELHORIAS`.
2. Aplique o efeito em `comprarMelhoria()` ou em um atributo derivado, como `capacidade` e `velocidade`.
3. Acrescente um caso de teste para compra válida, saldo insuficiente e limite.

O painel de melhorias lê o catálogo. Não é preciso criar um novo botão manualmente.

## Receitas e fase artesanal (níveis 10 a 15)

`ALA_ARTESANAL` define piso, paredes e câmera do anexo ao fundo. A parede traseira da ala dos ovos vira uma passagem; simulação e geometria aplicam a mesma abertura. Produtos novos têm `nivelMinimo`, modelo próprio em `Cena.construirArtesanal()` e melhoria de `tipo: 'construcao'` com o campo `produto`.

`OFICINAS` define ingredientes por lote, rendimento, duração e capacidade de entrada. O estado `oficinas[id]` guarda ingredientes, progresso e total produzido. A saída usa `produtos[id].horta`, compartilhando coleta, inventário e reposição com o restante do jogo. `atualizarProducao()` só consome ingredientes quando há um lote completo e espaço para toda a saída. O jogador entrega insumos ao se aproximar; o repositor transporta os produtos prontos.

O campo salvo `apresentado` evita demanda dos novos produtos antes do primeiro abastecimento. Depois da estreia, a demanda continua mesmo se a banca ficar vazia. Preserve esse campo ao migrar partidas.

Para verificar essa fase isoladamente: `node --test tests/artesanal.test.js`. Os testes cobrem compras, receitas, pausa, migração, rotas, reposição e vendas reais no caixa.

## Importações e entregas (N19)

`Simulacao.encomendarImportacoes()` valida o pedido completo, cobra uma vez e reserva posições em `estado.deposito.pedidos`. `entregas.js` limita a ocupação a 27 pacotes (entregues mais pendentes), mantém a fila e controla caminhão e entregador independentemente do DOM. Cada pedido tem uma viagem, com chegada pelo acesso, descarga junto à fachada, caminhadas com colisão até as estantes e saída. A reserva impede novas vagas de clientes enquanto as existentes esvaziam; pedestres continuam comprando. A cena coordena a reserva da faixa da rua com tráfego, carro-forte e assalto.

As caixas entregues ficam em `deposito.pacotes`, com `produto`, `unidades` restantes e `slot` entre 0 e 26. `deposito.js` exibe as 27 caixas somente conforme os slots ocupados; `entregas-visual.js` desenha o caminhão de três eixos e o trabalhador com a caixa nas mãos. Retirar enlatados chama `retirarProdutoDeposito()` e consome unidades da caixa; o último item libera o slot. Jogador e repositor usam as interações de coleta e reposição existentes. `produtos.enlatado.horta` espelha as unidades no depósito e é recalculado das caixas ao carregar.

Uma caixa só sai do pedido quando é colocada na estante. Assim, carregar um save reinicia a viagem com o saldo pendente sem perder nem duplicar caixas que estavam sendo transportadas. Saves antigos mantêm as unidades na gôndola e recebem depósito vazio. Execute `node --test tests/entregas.test.js tests/importacao.test.js` para pedidos, limite, descarga, rotas do baú, pausa, migração e reposição. Com `npm run dev` ativo e Edge instalado, `node scripts/verificar-entregas.mjs` usa um perfil isolado e a fixture `scripts/entregas-preview.html` para capturar desktop/celular e WebGL/Canvas em `docs/previews/`.

## Cuidados com o salvamento

- Salve apenas dados serializáveis; objetos 3D, áudio e elementos da página não entram no estado.
- Valide números, listas e identificadores antes de restaurar.
- Os clientes são transitórios. Produtos retirados por clientes que ainda não pagaram voltam à prateleira ao salvar, até o limite de estoque.
- Funcionários voltam ao ponto inicial depois de recarregar; a produção é renovável.
- Use uma migração se precisar preservar partidas depois de uma mudança estrutural.

## Aparência e desempenho

Os modelos são feitos com formas 3D em `cena.js`. Você pode substituí-los por arquivos GLB no futuro sem alterar a economia. Compartilhe geometrias e materiais quando adicionar muitos objetos; descarte geometrias transitórias quando saírem da cena.

O modo WebGL usa sombras. O renderizador alternativo projeta faces em Canvas 2D e não tem sombras equivalentes; é destinado a compatibilidade. Objetos muito grandes, transparências sobrepostas e modelos detalhados podem exigir uma abordagem diferente de ordenação. Ao criar novos pisos largos, marque `mesh.userData.fundo` com uma camada de 0 a 99 para que sejam desenhados atrás dos objetos nesse modo.

## Verificação antes de enviar uma alteração

```bash
npm test
npm run build
```

Confira também no navegador: colher, abastecer, vender, comprar melhoria, abrir/fechar menus e recarregar a página. No celular, confira arrastar, soltar, mudar a orientação e alternar para outra aba. A simulação pausa quando a página fica oculta.
