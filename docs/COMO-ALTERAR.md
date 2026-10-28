# Como ajustar e expandir o jogo

O início da loja usa a [nova planta N1](PLANTA-LOJA-N1.md), seguida pelo [milho no N3](PLANTA-LOJA-N3.md). Edite `src/jogo/planta.js` para o terreno, salão, porta posterior, canteiros e compartimentos de hortifruti; `configuracao.js` consome essa geometria. `FAZENDAS_HORTIFRUTI` mantém milho alinhado atrás do tomate e reserva trigo ainda mais ao fundo. Todo canteiro deve terminar antes de `PLANTA_INICIAL.limites.minZ`, inteiramente atrás da loja. As seções do móvel têm alvos independentes na face do corredor e volumes contíguos agrupados. Não aplique a exigência de espaçamento entre móveis independentes às divisórias desse conjunto. `node scripts/render-floor-plan.mjs` pode gerar os marcos N1 e N3 somente quando solicitado explicitamente pelo usuário; as plantas V2 são históricas.

## Loja compacta até a compra de laranjas

`PLANTA_COMPACTA` define o salão de 14 × 8 u, com fachada fixa em z = 6,7 e parede posterior em z = -1,3. `lojaCompacta(estado)` deriva o tamanho de `melhorias.laranja`, sem novo campo salvo: somente a compra da seção de laranjas restaura os 14 × 16 u de `PLANTA_INICIAL`. A expansão dos fundos guardada também pressupõe a planta completa. `produtosDaLoja()` usa seções de 1,9 u para tomate, milho e trigo até essa compra, com pontos de compra mais próximos do centro de cada seção; depois restaura os 2,2 u da banca completa. Maçãs, morangos, ovos, leite e cestas extras exigem laranjas para caberem no salão. Use o catálogo de `sim.produtos` também em `volumesHortifruti()` e `selecionarCompartimentoHortifruti()`. A produção externa não se move. Use `sim.portaProducao` e `sim.lixeira` nas interações. `sincronizarProfundidade()` limpa percursos e libera atores sobrepostos na compra. O bairro e a cena acompanham o tamanho e recriam os expositores ao mudar de planta. Os documentos de plantas antigos são registros históricos. Verifique com `node --test tests/loja-compacta.test.js tests/progressao-niveis.test.js`, `node scripts/check-store-layout.mjs` e `node scripts/verificar-laranja.mjs` (desktop/celular e WebGL/Canvas, sem imagens).

O conjunto do caixa e as cestas ficam 2 u à direita das coordenadas históricas das plantas: `CONFIG.balcao.x = 5.45`, `CONFIG.cadeiraCaixa.x = 5.45` e `CONFIG.cestas.x = 2.8`. Mantenha os pontos de atendimento, acesso e coleta de cestas sincronizados em `CONFIG`. A fila vira após cinco posições horizontais para preservar a parede direita e o corredor reservado aos importados. A versão de layout 25 reposiciona atores de saves anteriores à mudança do caixa.

## Regras rápidas

A porta de produção ocupa apenas a antiga metade direita: centro x = 4,35, largura = 1,5 u e dobradiça em x = 5,1. `anguloPortaProducao()` e `volumePortaProducao()` compartilham a rotação entre modelo e colisão. `aberturasPortasProducao` é transitório; `atualizarPortasProducao()` reage apenas à proximidade do jogador e do repositor contratado, respeita a pausa e evita girar sobre atores. `podeAbrirPortaProducao()` identifica esses usuários autorizados: só eles planejam a passagem com a folha aberta, enquanto clientes evitam esse acesso. Cada movimento respeita a posição real da folha. O repositor aguarda fora do arco antes de atravessar. A lixeira fica em x = 2,85, fora da antiga metade esquerda, no gramado; use `sim.lixeira` e preserve esse acesso também na loja compacta. Valide com `tests/porta-producao.test.js`, as rotas e a checagem de navegador sem imagens.

A tabela atual de níveis está em [DESBLOQUEIOS-POR-NIVEL.md](DESBLOQUEIOS-POR-NIVEL.md). Os estágios de construção seguem trigo = 1, morango = 2, ovos = 3, leite = 4 e padaria = 5; derive o estágio salvo pelo maior índice comprado. Não escolha modelos nem visibilidade pelo número do nível: use produto, origem e compra. Morangos não exigem padaria; apiário e queijaria a exigem explicitamente para manter seus expositores no salão ampliado. A reorganização da versão 0.67.0 não inclui migração dedicada dos desbloqueios antigos.

A expansão está ativa no N20. `prateleiraBiscoitosEnlatados` (N21) e `prateleiraMantimentosCereais` (N22) são compras independentes por R$ 1.000, exigindo expansão. Cada importação exige sua própria gôndola; use `gondolaInstalada()` para visibilidade e colisões independentes. A compra genérica `prateleirasImportados` permanece inativa para compatibilidade; saves antigos migram suas compras. As suítes históricas usam `tests/helpers/importados-suspensos.js` com o catálogo anterior em processos isolados; `tests/importacoes-pares.test.js` verifica as regras atuais.

Os registros históricos [N4](PLANTA-LOJA-N4.md) e [N5](PLANTA-LOJA-N5.md) descrevem `PLANTA_OVOS` e `PLANTA_LEITE`, hoje compradas nos níveis 11 e 12. As duas compras mantêm o salão de 14 × 16 u. No N13, `PLANTA_AMPLIADA` define o salão 24 × 16 u; `ALA_PADARIA` ativa o piso lateral e substitui a parede direita inicial. `MODELO_PADARIA`, `pontoPadaria()` e `volumePadaria()` mantêm coordenadas locais, rotação de 90° e volumes coerentes entre modelos, animações e colisão. `selecionarExpositorPosterior()` delimita as faixas de reposição pela frente de ovos e leite; na divisória, ovos têm prioridade estável. Verificações de espaçamento permitem alcances próximos com seleção exclusiva ou parede contínua cobrindo toda a projeção compartilhada. O gerador de plantas mantém os nomes históricos e só deve ser executado quando solicitado.

Abra `src/jogo/configuracao.js`. Ele concentra os ajustes mais frequentes:

| O que mudar | Onde |
| --- | --- |
| Dinheiro inicial | `CONFIG.dinheiroInicial` |
| Capacidade da cesta | `CONFIG.capacidadeInicial` |
| Velocidade | `CONFIG.velocidadeInicial` |
| Distância das interações | `CONFIG.raioInteracao` |
| Intervalo dos clientes por reputação | `CONFIG.intervaloClientesReputacao` |
| Cestas iniciais e cestas adicionadas pela melhoria do nível 8 (sem cesta, cliente passa pela calçada) | `CONFIG.quantidadeCestas` e `CONFIG.cestasPorMelhoria` |
| Carrinhos do N24, capacidade, pedido mínimo e posição no estacionamento | `CARRINHOS` em `src/jogo/carrinhos.js` |
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

`extremosCalcadaDaLoja(estado)` e `sim.extremosCalcada` selecionam as origens e os destinos dos pedestres conforme a expansão: x = -15,5 / 23,5 antes da compra e -27,5 / 23,5 depois. Use esses pontos também nos limites de navegação e na validação de clientes salvos durante assaltos; não altere `CONFIG.extremosCalcada` globalmente. `PLANTA_CARGA.travessia` define a faixa branca no acesso. `caminharCalcada()` alinha os pedestres nas bordas da faixa antes de seguir ao destino, preservando os desvios dos postes fora da travessia. Durante a saída do caminhão, mantém o destino e permite desviar pelo acesso atrás do baú, com busca limitada à calçada e ao acesso para evitar voltas pela loja. `obstaculoCaminhao()` fornece o retângulo girado compartilhado pela navegação e pela parada do caminhão diante de pessoas; `volumeCaminhao()` é apenas o envelope alinhado aos eixos. Não remova a colisão do caminhão para liberar a travessia.

A faixa de carga encosta na borda esquerda de `pisoEstacionamento(true)`, sem grama entre os pavimentos. As guias dos dois lados se tocam na divisa. `EIXO_CARGA` ancora a vaga e os pontos do entregador à borda original do terreno; as curvas do caminhão acompanham o eixo. A planta do estacionamento antes da expansão permanece igual.

`pisoEstacionamento(expandida)` mantém o piso original no N16 e amplia o asfalto até a fachada do depósito e a lateral da loja após a compra do N18. O quinto argumento de `estacionamento.atualizar()` recebe essa compra, ajustando piso e guias sem mover vagas ou trajetos dos veículos. A guia posterior desaparece para deixar a entrada do depósito livre.

`PLANTA_CARGA` concentra piso, acesso, vaga, pontos do entregador e guias do pátio privativo à esquerda. O piso e o acesso têm uma única faixa de 4 u, e a vaga longitudinal mede 2,6 × 6,4 u, com cabine voltada para a rua e baú para os fundos. `patio-carga.js` desenha essa área dentro de `expansao-fundos`; somente a compra `expansao` a revela, sem depender do estacionamento de clientes. A mesma compra aumenta o terreno 12 u à esquerda, estende rua e calçada e muda os limites de mundo/câmera em `PLANTA_EXPANSAO`. O tráfego acompanha a nova borda com `Trafego.atualizarExpansao()`. `obstaculosCarga()` usa as mesmas guias desenhadas para a navegação; `contornoCabine` permite contornar a lateral direita até o baú, e a ligação pavimentada leva ao portão.

`PLANTA_DEPOSITO`, `paredesDeposito()` e `obstaculosDeposito()` definem o depósito atrás do estacionamento, incluído na compra `expansao` do N18. `deposito.js` desenha o concreto, o portão recolhido e as estantes com caixas. A lateral direita compartilha a parede do anexo e tem a abertura `PLANTA_DEPOSITO.passagem`, sem porta, com verga desenhada pelo bairro acima da altura caminhável. `paredesExpansao()` divide a parede em dois trechos, mantendo livre o vão também nas colisões. O único portão externo fica na face +z, voltado ao estacionamento. Preserve a passagem central, o espaço livre diante das estantes e a distância dos canteiros recuados. O grupo pertence a `expansao-fundos`, acompanhando compra e recarga sem novo campo salvo.

O portão externo usa lâminas independentes controladas por `deposito.atualizar(lojaAberta, dt)`, chamado por `bairro.animarDeposito()`. Ele recolhe as lâminas ao abrir a loja e as leva até a soleira ao fechar; `dt = 0` congela a animação durante a pausa. `volumePortaoDeposito()` fecha a passagem na navegação enquanto `lojaAberta` é falso, sem bloquear a passagem interna do depósito.

Nas entregas, o caminhão abre as duas portas traseiras antes de criar o trabalhador. Depois da última caixa, o trabalhador retorna à cabine, desaparece ao embarcar, e a fase `fecharBau` fecha completamente as portas antes de mudar para `partindo`. O visual recebe uma fábrica de personagem da cena e reutiliza um NPC comum com uniforme de entrega; preserve essa injeção para evitar dependência circular entre `cena.js` e `entregas-visual.js`.

`reservaPartida` reserva as duas faixas enquanto a entrega aguarda o tráfego esvaziar, antes de avançar na saída. Serviços bancários e manobras de estacionamento já em espera têm prioridade e suspendem essa reserva. `Cena.atualizarTrafego()` concentra a coordenação utilizada no jogo e na verificação; não force `transitoLivre` durante os testes de saída. O baú tem uma casca aberta na traseira e portas que giram para fora, sem bloco sólido por trás. `criarEntregador()` seleciona um homem adulto de porte regular do catálogo de NPCs.

No N18, `PLANTA_EXPANSAO` define o anexo posterior de 6 u, o terreno maior, uma nova saída e `bancadas`, com a queijaria e a cozinha de geleias encostadas na face interna da parede dos fundos. Preserve pisos, estações de venda e divisórias do salão. Os novos `pisos` contornam o piso existente das oficinas. `paredesOficinas(true)` retorna uma lista vazia para remover a mureta da cozinha e sua antiga lateral; as paredes externas vêm de `paredesExpansao()`, sem duplicar trechos. `folhasPortasExpansao()` fornece as colisões da nova porta. `produtosDaLoja(estado)` seleciona o catálogo conforme a compra `expansao`, recuando a fazenda e ajustando as origens/coletas das bancadas; use `sim.produtos` para posições em execução. Nunca altere o catálogo global ao comprar: outras partidas e os níveis anteriores devem manter sua planta. `node scripts/check-store-layout.mjs` inclui as rotas do N18; o gerador também produz a planta N18.

As coordenadas usam `x` para os lados, `z` para a profundidade e `y` para a altura. A origem fica perto do centro da loja. O chão está em `y = 0` e o piso elevado da loja em aproximadamente `y = 0.2`.

Mantenha os pontos de coleta e reposição fora dos objetos sólidos. A ala de produção define piso e paredes da pequena extensão, galinheiro na fazenda, prateleira e limites fixos do terreno em `ALA_PRODUCAO`; `construirBairro()` desenha a ala e `Simulacao.obstaculos()` usa a mesma configuração para colisão e busca de caminho. Teste as rotas de clientes e ajudante após mudar qualquer estação.

O navegador do celular acompanha o personagem com a câmera; em telas largas, mostra o conjunto da loja. Ajuste isso em `Cena.redimensionar()` e `Cena.atualizar()`.

## Adicionar uma melhoria

Os carrinhos do N24 são uma compra única `carrinhos` por R$ 500, exigindo `estacionamento` e `cestasExtras`. `carrinhoReservado` e `temCarrinho` são transitórios, independentes das cestas; `usaCarrinho` define a capacidade e o pedido. Motoristas priorizam carrinhos após a compra e pedem 20 itens. Pedestres usam as cestas primeiro e, quando ocupadas, os carrinhos, pedindo de 10 a 20 itens. `CARRINHOS.retirada` fica atrás da alça e `CARRINHOS.manobra` mais distante no mesmo eixo. A aproximação passa primeiro pela manobra (`etapa = -2`) e depois pela retirada (`etapa = -3`), sem usar `SAIDA_PEDESTRES` para motoristas com carrinho. Na fase `retirandoCarrinho`, o cliente recua da retirada até a manobra olhando para o suporte; `devolvendoCarrinho` percorre o sentido inverso. Ao terminar, motoristas recebem `etapa = 2` e seguem direto ao carro. Mantenha os dois pontos fora de `CARRINHOS.suporte`. A reserva só é liberada no fim da devolução, inclusive após pagar, faltar estoque ou fechar a loja. `carrinhos-visual.js` fornece o modelo ao estacionamento e aos clientes; `aplicarPaletaCarrinho()` aplica `paleta.principal` às barras, igual às cestas. `CARRINHO_CLIENTE.frente` é usado na circulação e `CARRINHO_CLIENTE.lateral` somente na fase `comprando`, mantendo o comprimento paralelo à face do expositor. Após o caixa, a sacola e seu conteúdo ocupam `CARRINHO_CLIENTE.frente.sacola`; os modelos soltos da carga ficam ocultos. Quando `temCarrinho` muda para falso na devolução, a mesma sacola volta às mãos. Valide o ciclo com `tests/carrinhos.test.js` e o navegador com `node scripts/verificar-carrinhos.mjs`, sem salvar imagens.

1. Declare título, descrição, custo e limite em `MELHORIAS`.
2. Aplique o efeito em `comprarMelhoria()` ou em um atributo derivado, como `capacidade` e `velocidade`.
3. Acrescente um caso de teste para compra válida, saldo insuficiente e limite.

O painel de melhorias lê o catálogo. Não é preciso criar um novo botão manualmente.

## Confeitaria da padaria (nível 19)

O forno industrial e o processador superior formam um único equipamento no antigo posto do trigo; `ALA_PADARIA.forno` fornece sua única colisão e `ALA_PADARIA.moinho` mantém a referência do estágio de moagem. A batedeira ocupa o antigo posto do forno. Um único padeiro cuida do pão, com roteiro completo de trigo a vitrine e `roteiroForno` para terminar farinha sem trigo. Preserve o acesso dele e do confeiteiro aos equipamentos e às vitrines.

As duas máquinas ficam de frente uma para a outra: antes da rotação global da ala, o forno gira +90° e a batedeira −90°. Seus volumes locais trocam largura e profundidade. A saída de farinha acompanha a frente do forno, e os postos de trabalho ficam entre as máquinas, diante da porta e da cuba.

O forno usa cinza claro metálico e porta vertical, sem alterar a projeção de colisão ao abrir. As etapas `receber`, `colocar`, `retirar` e `expor` fornecem a fase do gesto para sincronizar braços, farinha, bandeja, porta e `paesNoForno`. `producao-padaria.js` compartilha os roteiros entre cena e simulação. `producao.entregaPadaria` salva modo, tempo, pães pendentes e transferência concluída. O forno entrega seu lote a esse estado; somente `expor` na fase 0,7 transfere unidades ao estoque vendável. Nunca incremente a vitrine ao assar nem mantenha outro relógio de entrega na cena. O lote aguarda se a vitrine for preenchida durante o trajeto; excedentes ficam na reserva, que também passa pela bandeja. Saves antigos recebem entrega vazia e mantêm o estoque existente. `dt = 0` congela deslocamento e transferências.

`confeitaria.js` concentra custo, nível, receita, capacidades, posições e produção independente da cena. Uma compra `confeitaria` libera os três produtos; `estado.confeitaria` guarda mel, ovos, progresso, lotes, `etapaEntrega`, `tempoEntrega` e `produtosLote`. Seis segundos de preparo consomem um mel e um ovo e selecionam os tipos de doce cujas vitrines ainda têm vagas. `ROTEIRO_CONFEITARIA` entrega somente os produtos selecionados e retorna à máquina. Cada estoque aumenta ao fim da sua etapa de entrega. Basta haver espaço em uma vitrine para continuar; entregas já preparadas continuam mesmo sem mais insumos. Se o DEV encher uma vitrine durante o trajeto, o doce pendente aguarda vaga, sem perda nem duplicação ao salvar.

`producao-padaria.js` fornece `trabalhoPadaria()` para a simulação, o padeiro e o cartão compartilharem as mesmas condições. Uma vaga já permite assar. `producao.paesReserva` preserva as unidades de um lote de três que não couberam na vitrine, limitadas a duas; repõe automaticamente nas próximas vagas antes de assar mais, inclusive ao recarregar. Evite voltar a exigir espaço para o lote inteiro, o que parava o pão em 16 / 18.

`padaria-decoracao.js` mantém os tampos desde o N9 e cria o grupo `vitrines-confeitaria`, visível somente após a compra. `doces-confeitaria.js` fornece os três modelos, reutilizados nas vitrines, na bandeja e nas compras. `Cena.animarConfeiteiro()` movimenta um funcionário exclusivo dos doces no corredor de serviço, com gestos de preparo e bandeja. Não inclua esse funcionário no vetor `padeiros`, que contém apenas o responsável pelo pão.

A entrega de mel e ovos ocupa a seção contígua ao trigo. `CONFEITARIA.limiteEntregaX` separa os lados no mundo para evitar que a interação entregue ao setor errado. Doces têm `origem: 'confeitaria'`, sem coleta nem reposição manual; os balcões existentes já fornecem as colisões. O cartão de produção aparece somente perto da bandeja de ingredientes; não há etiqueta flutuante de mel e ovos. Execute `node --test tests/confeitaria.test.js`, `node scripts/check-store-layout.mjs` e, com o servidor ativo, `node scripts/verificar-confeitaria.mjs`; este último verifica desktop/celular e WebGL/Canvas sem salvar imagens.

`criarBandejaRecebimento()` fornece o mesmo modelo para trigo e confeitaria. As unidades de mel e ovos são filhas da bandeja e refletem o estado dos ingredientes. `situacaoConfeiteiro()` deriva posição, ação e doces restantes do estado da simulação; a cena não mantém um relógio independente para entregas. `batedeira.js` constrói a máquina industrial com cuba e batedor. `maquinaConfeitaria()` fornece sua colisão, somente após a compra. Preserve a passagem do padeiro. O alerta reutiliza a exclamação da padaria quando alguma vitrine está vazia e falta ingrediente, sem aparecer durante entregas. `dt = 0` congela a pose e o batedor.

## Pomar (níveis 6 e 7)

`PLANTA_LARANJA` define a árvore ao lado do apiário e o acesso frontal. `PLANTA_MACA` acrescenta a macieira na mesma faixa de gramado, em direção às oficinas, com coleta lateral e volume que preserva os corredores. `origem: 'pomar'` usa crescimento renovável sem aplicar irrigação ou fertilizante das hortas. As compras `laranja` (N6) e `maca` (N7) custam R$ 800 cada e incluem a seção de venda; não exigem outras compras. Ambas vendem por R$ 7, produzem uma fruta a cada 3 segundos e armazenam até oito na árvore. O catálogo e a validação de estado preservam compra, crescimento e estoques, com defaults bloqueados em saves anteriores.

`PRODUTOS_HORTIFRUTI` mantém tomate, milho, trigo, laranja, maçã e morango nessa ordem. `compartimentoHortifruti()` começa em z = 3,6 e acomoda seis seções de 2,2 u dentro da parede esquerda. Modelo, placas, interações, colisões e pontos de compra compartilham essa geometria. A versão de layout 23 reposiciona atores de saves anteriores à mudança da banca; a macieira usa o espaço existente. Verifique com `node --test tests/laranja.test.js tests/maca.test.js`, `node scripts/check-store-layout.mjs` e `node scripts/verificar-laranja.mjs`; este último cobre ambas as árvores em desktop/celular e WebGL/Canvas sem salvar imagens.

## Receitas e fase artesanal (níveis 9 a 17)

`ALA_ARTESANAL` define piso, paredes e câmera do anexo ao fundo. A parede traseira da ala dos ovos vira uma passagem; simulação e geometria aplicam a mesma abertura. Produtos novos têm `nivelMinimo`, modelo próprio em `Cena.construirArtesanal()` e melhoria de `tipo: 'construcao'` com o campo `produto`.

`OFICINAS` define ingredientes por lote, rendimento, duração e capacidade de entrada. O estado `oficinas[id]` guarda ingredientes, progresso e total produzido. A saída usa `produtos[id].horta`, compartilhando coleta, inventário e reposição com o restante do jogo. `atualizarProducao()` só consome ingredientes quando há um lote completo e espaço para toda a saída. O jogador entrega insumos ao se aproximar; o repositor transporta os produtos prontos.

O campo salvo `apresentado` evita demanda dos novos produtos antes do primeiro abastecimento. Depois da estreia, a demanda continua mesmo se a banca ficar vazia. Preserve esse campo ao migrar partidas.

Para verificar essa fase isoladamente: `node --test tests/artesanal.test.js`. Os testes cobrem compras, receitas, pausa, migração, rotas, reposição e vendas reais no caixa.

## Importações e entregas (N21–N22)

`Simulacao.encomendarImportacoes()` valida o pedido completo, cobra uma vez e reserva posições em `estado.deposito.pedidos`. `entregas.js` limita os novos pedidos a quatro pacotes por classe (entregues mais pendentes), mantém a fila e controla caminhão e entregador independentemente do DOM. Cada pedido surge à esquerda, avança além do acesso e para 0,7 s para engatar a ré. Os segmentos de `ROTAS_ENTREGA` com `re: true` invertem orientação e giro das rodas e usam `ENTREGA.velocidadeRe`; a saída percorre a mesma faixa de frente. A largura inclui os retrovisores. O caminhão não cruza as vagas nem reserva o estacionamento de clientes. A cena aguarda e reserva as duas faixas da rua durante a manobra, coordenando clientes, tráfego, carro-forte e assalto; durante a descarga libera a rua e, enquanto espera para sair do pátio, não bloqueia o serviço que precisa terminar primeiro.

As caixas entregues ficam em `deposito.pacotes`, com `produto`, `unidades` restantes e `slot` entre 0 e 15. Cada estante possui quatro slots exclusivos; `slotLivre()` usa a classe do produto para escolher o destino. `deposito.js` exibe as caixas somente conforme os slots ocupados; `entregas-visual.js` desenha o caminhão de três eixos e o trabalhador com a caixa nas mãos. Retirar enlatados chama `retirarProdutoDeposito()` e consome unidades da caixa; o último item libera o slot. Jogador e repositor usam as interações de coleta e reposição existentes. `produtos.enlatado.horta` espelha as unidades no depósito e é recalculado das caixas e da reserva de migração ao carregar.

Uma caixa só sai do pedido quando é colocada na estante. Assim, carregar um save reinicia a viagem com o saldo pendente sem perder nem duplicar caixas que estavam sendo transportadas. Saves antigos mantêm as unidades na gôndola e recebem depósito vazio. Execute `node --test tests/entregas.test.js tests/importacao.test.js` para pedidos, limite, descarga, rotas do baú, pausa, migração e reposição. Com `npm run dev` ativo e Edge instalado, `node scripts/verificar-entregas.mjs` usa um perfil isolado para verificar desktop/celular e WebGL/Canvas sem salvar imagens. As prévias são fornecidas manualmente pelo usuário; registre os resultados das verificações em texto.

### Classes e compatibilidade do depósito

`classes-produtos.js` define `PACOTES_POR_CLASSE = 4`, `UNIDADES_PACOTE = 9` e o catálogo de classes com nome, estante fixa, gôndola e lado. As duas gôndolas reservam duas classes cada; as quatro estantes do depósito têm dois níveis com duas caixas. Enlatados usa a estante 0 e a face +x da primeira gôndola; Biscoitos e doces usa a estante 1 e a face −x da primeira gôndola, voltada ao hortifruti, com importação no N21 por R$ 360 e venda por R$ 40. O identificador `guloseima` representa cookies, amanteigados, balas de frutas e bombons, com nove unidades por variedade. `guloseimas.js` combina caixas, lata cilíndrica e pacote selado com rótulos SVG em `public/produtos/doces/`. Cereais usa a estante 2 e a face +x da segunda gôndola, voltada à padaria, com importação no N22 por R$ 405 e venda por R$ 45. Mantimentos usa a estante 3 e a face −x da segunda gôndola, de frente para os enlatados, com importação no N22 por R$ 315 e venda por R$ 35. O identificador `mantimento` representa quatro variedades visuais (macarrão, feijão, arroz e farinha), uma por nível de nove unidades. Ao adicionar uma classe, use uma estante exclusiva e defina `PRODUTOS[id].classe`, a origem/coleta na estante correspondente e a face de venda da gôndola. Produtos da mesma classe compartilham as quatro vagas, inclusive em pedidos mistos.

`validarDeposito()` preserva até 27 caixas do formato anterior, contando entregues e pendentes. As quatro primeiras de cada classe ocupam a estante; outras caixas entregues ficam em `deposito.excedentes`, preservando unidades parciais. `acomodarExcedentes()` ocupa as vagas liberadas ao retirar produtos. Pedidos antigos maiores que a capacidade aguardam em `retirar` até haver espaço da classe; continuam pagos e salvos. Excedentes e pedidos também bloqueiam novas encomendas. Nenhuma caixa ocupa uma estante de outra classe.

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

## Sucos (N23)

`sucos-visual.js` constrói a máquina, garrafas e geladeira exclusiva dos sucos. `animarMaquinaSucos()` mostra líquido e redemoinho somente quando a receita ativa tem progresso maior que zero; a cuba fica vazia antes de iniciar e após engarrafar cada lote. Durante a pausa, recebe tempo zero e preserva o conteúdo do preparo interrompido. A cuba usa vidro sem escrita de profundidade, enquanto líquido e reflexos do vórtice têm geometria própria, compatível com WebGL e Canvas. `GELADEIRA_SUCOS` e `posicaoGarrafaGeladeira()` compartilham alturas e escala entre as quatro prateleiras, as fileiras de seis garrafas e o destino da animação de reposição. Não use um relógio independente da atualização da cena.

`src/jogo/sucos.js` concentra receitas, produção, validação e as posições compartilhadas de máquina, balcão, geladeira e reserva futura. A borda posterior do balcão encosta na face interna da parede do anexo, como a queijaria. A simulação entrega frutas uma a uma e produz em `produtos[id].horta`; jogador e repositor recolhem garrafas e abastecem `prateleira`. Os quatro produtos usam `origem: sucos` e compartilham dois obstáculos: balcão com máquina e geladeira. A coleta compartilhada entrega frutas primeiro e recolhe o primeiro sabor pronto quando não há frutas para entregar; a reposição respeita a seleção do hortifruti vizinho. A reserva à direita não cria móvel nem colisão. Preserve o cursor de alternância, progresso por sabor e os dois estoques ao salvar. Verifique com `tests/sucos.test.js`, rotas até N23 e `scripts/verificar-sucos.mjs`, sem salvar imagens.
