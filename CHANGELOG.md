# Histórico de alterações

## Versão atual: 0.62.0 — 2026-10-26

- Desativa prateleiras de importados, expansão e as quatro classes importadas dos antigos níveis 17 a 22. Remove as ofertas e orientações de compra, inclusive no DEV; o estacionamento no nível 16 permanece como último desbloqueio ativo.
- Mantém modelos e sistemas no código para reorganização futura depois do nível 20, sem definir novos níveis de liberação. A progressão de níveis continua normalmente.
- Compatibilidade de desenvolvimento: ao recarregar, remove compras e estoques do conteúdo suspenso, sem migração para preservá-los; impede a restauração das gôndolas pelo formato antigo.
- Mantém testes dos sistemas guardados com reativação somente nas suítes específicas e acrescenta regressões da configuração desativada real.
- Validação: 320 testes e build de produção aprovados. Menus, cena, DEV e restauração verificados no Edge em desktop/celular com WebGL e Canvas, sem salvar imagens.

## 0.61.1 — 2026-10-26

- A ação DEV de encher prateleiras também libera e abastece importados sem pedido prévio quando o nível, a expansão e a gôndola necessária estão disponíveis.
- Preserva o estoque ao recarregar, sem cobrar dinheiro nem alterar caixas e pedidos do depósito. Produtos ainda bloqueados continuam vazios.
- Validação: 318 testes e build de produção aprovados, com regressões para as quatro classes importadas, requisitos de desbloqueio e preservação do estoque ao recarregar.

## 0.61.0 — 2026-10-26

- Clientes que chegam de carro sempre pedem cinco unidades, a capacidade máxima da cesta, independentemente da reputação e da variedade disponível, inclusive em pedidos com pão.
- Mantém o fluxo normal de falta de estoque: clientes esperam, reagem à compra incompleta e pagam somente o que encontraram. Pedestres continuam com pedidos variáveis por reputação.
- Explica o benefício na melhoria Estacionamento e na documentação de desbloqueios. Preserva saves, preço e requisitos da construção.
- Validação: 316 testes e build de produção aprovados, incluindo pedidos com pouca variedade e pão, diferentes reputações, compra e pagamento de cinco unidades, pedestres e reações normais a estoque vazio ou insuficiente.

## 0.60.1 — 2026-10-26

- Oculta “Importar produtos” nas opções quando nenhuma importação está disponível, respeitando nível, melhorias, espaço no depósito e entregas em andamento.
- Substitui o ícone de enlatado por uma caixa com seta de entrada no menu e no cabeçalho de importações. Preserva saves e progressão.
- Validação: 313 testes e build de produção aprovados. Menu verificado no Edge em desktop e celular: início, pré-requisitos, importação disponível, ícone, navegação e pedido pendente, sem salvar imagens.

## 0.60.0 — 2026-10-26

- Adiciona Biscoitos e doces no nível 22, com cookies de chocolate, amanteigados, balas de frutas e bombons. Combina quatro embalagens 3D de formatos e cores diferentes com oito rótulos SVG originais, para frente e verso.
- Abastece a face da primeira gôndola voltada ao hortifruti com nove unidades de cada variedade. Usa a segunda estante do depósito, antes reservada para Higiene, sem mover os demais produtos ou móveis.
- Importa caixas de nove unidades por R$ 360 e vende cada unidade por R$ 40, reutilizando pedidos, caminhão, coleta, repositor e salvamento. Saves anteriores recebem o produto bloqueado e preservam progresso, estoque e pedidos pagos.
- Ajusta as embalagens com caixa de bombons larga e baixa com arte dourada clara, pacote de balas com soldas achatadas e rótulos acompanhando as dobras, e impressão contínua nas duas metades da lata de amanteigados. Remove faces sobrepostas nas caixas e usa materiais iluminados nos rótulos.
- Define dimensões explícitas nos SVGs de frente e verso para evitar texturas pretas no WebGL. Acrescenta regressão das dimensões e verificação de cores em memória por `scripts/verificar-cores-guloseimas.mjs`.
- Validação: 313 testes, build de produção e rotas aprovados. Modelos, 27 SVGs das quatro classes e transporte verificados no Edge em desktop/celular com WebGL e Canvas, incluindo 32 medições de cor dos dois lados das quatro embalagens, sem faces pretas e sem salvar imagens.

## 0.59.0 — 2026-10-26

- Adiciona Mantimentos no nível 21: macarrão, feijão, arroz e farinha, com nove embalagens por nível na face da segunda gôndola voltada para os enlatados. Combina modelos 3D e rótulos SVG originais.
- Arroz, feijão e farinha usam sacos com frente em branco frio, base firme, dobras, ombros afunilados e alça realmente vazada. As artes têm títulos em português e janelas ilustradas para identificar o conteúdo; o macarrão permanece em caixa.
- Identifica os mantimentos também pelo verso: macarrão em azul petróleo, feijão em verde sálvia, arroz em azul e farinha em dourado, com rótulos próprios, faixas coloridas e painéis claros. Laterais e fechamento acompanham cada cor, preservando a frente branca dos sacos.
- Aplica os rótulos às superfícies dos pacotes com iluminação do relevo. O Canvas acompanha a geometria por triângulos com coordenadas UV e reutiliza texturas rasterizadas em memória. Preserva o volume e a separação das embalagens durante o transporte.
- Importa caixas de nove unidades por R$ 315 e vende cada unidade por R$ 35. A classe usa a quarta estante do depósito, com quatro vagas exclusivas, e os sistemas existentes de entrega, coleta e reposição. Higiene fica reservada na face livre da primeira gôndola.
- Preserva saves, estoque, pedidos pagos e a disposição dos enlatados e cereais. Partidas anteriores recebem Mantimentos bloqueado, sem cobrança ou alteração de progresso.
- Validação: 306 testes, build de produção e rotas da loja aprovados, incluindo entrega, salvamento, reposição manual e automática, venda, circulação e recorte real da alça. As três classes, seus 19 SVGs, os versos coloridos e o transporte foram verificados em desktop/celular com WebGL e Canvas, sem salvar imagens.

## 0.58.7 — 2026-10-25

- Move os enlatados para a face da primeira gôndola antes ocupada pelos cereais, com rótulos, compra e reposição voltados ao corredor correspondente.
- Preserva estoque, pedidos, preços e saves existentes.
- Validação: 299 testes, build de produção e rotas da loja aprovados; desktop/celular com WebGL e Canvas verificados sem salvar imagens.

## 0.58.6 — 2026-10-25

- Move os cereais para a segunda gôndola, na face voltada à padaria, com compra e reposição pelo corredor correspondente.
- Exige a segunda prateleira para novas importações de cereais. Saves que já possuem cereais recebem o móvel sem custo, preservando saldo, estoque e pedidos.
- Validação: 299 testes, build de produção e rotas da loja aprovados. Cereais e enlatados verificados nas respectivas gôndolas em desktop/celular com WebGL e Canvas, sem salvar imagens.

## 0.58.5 — 2026-10-25

- Atualiza os cereais com caixas 3D e quatro artes SVG originais: anéis de mel em amarelo, flocos de milho em azul, chocolate em verde e anéis de frutas em rosa. Inclui tigelas, leite e grãos ilustrados, além de verso, painéis laterais e vincos da tampa. Compartilha o carregamento dos rótulos com os enlatados.
- Amplia a profundidade física das caixas de cereais e preserva uma escala maior no transporte, mantendo laterais e tampa visíveis nas mãos do jogador sem sobrepor as embalagens.
- Preserva preços, importações, progressão e saves existentes.
- Validação: 298 testes e build de produção aprovados, com regressão garantindo profundidade nas caixas carregadas. Gôndola cheia, onze SVGs de enlatados e cereais e carga de oito cereais verificados em desktop/celular com WebGL e Canvas por `node scripts/verificar-enlatados.mjs`, incluindo giros do jogador, sem salvar imagens.

## 0.58.4 — 2026-10-25

- Substitui as quatro cores de enlatados por milho em lata alta, atum em lata baixa e sardinhas em latas retangulares azul e vermelha ao tomate. Combina volumes 3D e aros metálicos com rótulos SVG originais e tampa ilustrada com anel de abertura.
- Mantém nove unidades por variedade e compartilha materiais e texturas entre exemplares, com arte também no renderizador Canvas.
- Corrige produtos parcialmente escondidos nas tábuas da gôndola: compartilha as alturas entre o móvel e os produtos, considera o deslocamento vertical do móvel e apoia cada embalagem pela base real do modelo.
- Distribui os importados com margens simétricas nas pontas da gôndola e alinha as frentes das diferentes embalagens com o mesmo recuo da borda, mantendo os produtos dentro da largura da prateleira.
- Organiza importados carregados pelo jogador em camadas de quatro, ajustando a escala ao volume de cada embalagem para evitar interseções. A reposição usa o destino e a variedade reais da prateleira, sem ampliar excessivamente o produto durante o movimento.
- Corrige o Canvas para ocultar o verso dos rótulos SVG ao girar as embalagens.
- Preserva preços, importações, progressão e saves existentes.
- Validação: 297 testes, build de produção e rotas da loja aprovados, com regressão comparando os 72 produtos de uma gôndola cheia às tábuas reais. Gôndola cheia, cinco SVGs e carga de oito importados verificados em desktop/celular com WebGL e Canvas por `node scripts/verificar-enlatados.mjs`, incluindo giros do jogador, sem salvar imagens.

## 0.58.3 — 2026-10-23

- Corrige os braços do entregador desde a saída da cabine para usar a pose livre durante a caminhada, sem prolongar o gesto de segurar a porta nem simular uma cesta invisível.
- Corrige o bloqueio na curva de saída usando colisões alinhadas à rotação do caminhão. Clientes dos dois lados podem contornar o baú pelo acesso quando houver espaço, sem atravessar o veículo ou desviar por dentro da loja.
- Validação: 294 testes automatizados, build de produção e verificação das rotas da loja aprovados. Saves, pedidos e progressão permanecem compatíveis; nenhuma captura foi gerada.

## 0.58.2 — 2026-10-23

- Adiciona às ferramentas DEV uma opção persistente para ativar ou desativar a espera de 60 segundos antes das entregas.
- Validação: 290 testes automatizados e build de produção aprovados. Saves, pedidos e progressão permanecem compatíveis; nenhuma captura foi gerada.

## 0.58.1 — 2026-10-23

- Unifica o visual das importações: qualquer produto usa o mesmo caminhão, com baú dourado (`#d1ad5a`) sem logos, e o entregador veste uniforme da mesma cor.
- Validação: 289 testes automatizados e build de produção aprovados. Saves, pedidos e progressão permanecem compatíveis; nenhuma captura foi gerada.

## 0.58.0 — 2026-10-22

- Adiciona Cereais no nível 20: caixas de nove unidades por R$ 405, venda por R$ 45 e quatro vagas exclusivas na terceira estante do depósito. Reutiliza pedidos, entrega, coleta e reposição dos importados.
- Exibe caixas altas e retangulares em vermelho, amarelo, verde e azul na face oposta aos enlatados da primeira gôndola. As embalagens têm oval escuro com espiga dourada, marca frontal, faixa branca, vincos e painel lateral. A arte frontal dos importados aponta para o corredor.
- Preenche as gôndolas de baixo para cima, com nove unidades por nível e quatro variedades nos quatro níveis, acompanhando o estoque real. Separa o alcance de reposição de cada face e reserva Higiene na segunda gôndola.
- Identifica entregas de cereais com baú verde, logo nas duas laterais e uniforme verde do entregador. Pedidos mistos mantêm a identidade da primeira classe até o fim da viagem.
- Corrige o bloqueio da chegada do caminhão quando um cliente aguarda sair e outra reserva ainda não recebeu um carro do tráfego.
- Preserva saves existentes e documenta o desbloqueio. Validação acumulada: 289 testes e build aprovados, rotas e layout verificados, além de verificações de navegador em desktop/celular e WebGL/Canvas sem salvar imagens.

## 0.57.6 — 2026-10-22

- Remove do catálogo o resumo de pacotes no depósito e pedidos a caminho. Após finalizar uma importação, fecha o painel e usa o card de dicas para informar que o caminhão está a caminho.
- Faz o caminhão aguardar 60 segundos antes de entrar no mapa e mostra um card persistente com contagem regressiva, barra de progresso e quantidade de pacotes. O aviso se posiciona acima do alerta bancário quando ambos aparecem juntos e desaparece sem uma mensagem adicional quando o veículo chega.
- Bloqueia novos pedidos enquanto houver uma entrega pendente ou o caminhão ainda estiver no mapa. O motivo aparece centralizado no rodapé do catálogo, acima do resumo e do botão “Finalizar pedido”.
- Validação: 285 testes automatizados e build de produção aprovados. Saves e progressão permanecem compatíveis; nenhuma captura foi gerada.

## 0.57.5 — 2026-10-22

- Simplifica o catálogo de importações: a regra geral informa uma única vez que cada classe tem uma estante para quatro pacotes de nove produtos, e o card de cada classe mostra apenas uma descrição dos itens e o preço de venda.
- Validação: testes automatizados e build de produção aprovados. Saves e progressão permanecem compatíveis; nenhuma captura foi gerada.

## 0.57.4 — 2026-10-22

- Amplia os quatro hatchbacks para o mesmo comprimento e largura do sedã preto, preservando a carroceria hatch tanto no trânsito quanto no estacionamento de clientes.
- Remodela o caminhão de importações com cabine construída em peças, interior visível, bancos, painel, volante, retrovisores, seis rodas e luzes funcionais de direção, freio e ré.
- Identifica a carga de enlatados pela cor da estante do depósito, aplicada ao baú e ao uniforme do entregador, e usa nas duas laterais um logotipo com lata vertical, aros metálicos e rótulo de tomate.
- Corrige a porta da cabine para o lado do percurso do entregador, com banco e volante alinhados ao motorista. A porta abre por completo antes de ele sair, permanece aberta durante a passagem e fecha antes de ele seguir ao baú; o processo inverso ocorre ao embarcar.
- Amplia os testes para cobrir o porte dos hatchbacks, interior e sinalização do caminhão, identidade da categoria, orientação da porta e sequência de desembarque. Os 284 testes e o build de produção foram aprovados; saves e progressão permanecem compatíveis. Nenhuma captura foi gerada.

## 0.57.3 — 2026-10-21

- Mantém todo o caminhão sobre o asfalto desde o primeiro quadro até desaparecer, usando as bordas reais da rua expandida como pontos de entrada e saída.
- Faz o entregador caminhar até o baú, abrir as portas, descarregar, fechar as portas e só então retornar à cabine; o caminhão continua esperando o fechamento completo antes de partir.
- Corrige os braços do entregador ao posicionar mãos, cotovelos e ombros pelo sistema articulado do NPC ao carregar caixas e operar as portas.
- Corrige a espera infinita na saída com tráfego contínuo: a entrega reserva as duas faixas antes de aguardar os carros existentes saírem, preservando a prioridade de manobras de clientes e serviços bancários já em espera. Libera a rua ao terminar.
- Substitui o bloco sólido do baú por laterais, teto, parede frontal e piso, deixando uma abertura real atrás das portas. As folhas agora giram para fora, tornando a abertura e o fechamento visíveis.
- Seleciona explicitamente um NPC masculino adulto de porte regular para o entregador, com uniforme próprio.
- Amplia as verificações para usar a coordenação real do tráfego, confirmar que o caminhão deixa o mapa e conferir a abertura física do baú. Capturas de diagnóstico são opcionais e dependem de autorização do usuário.
- Validação: 283 testes e build de produção aprovados; navegador conferido em desktop/celular e WebGL/Canvas, com captura autorizada para inspecionar as portas e o entregador. Saves e pedidos preservados.

## 0.57.1 — 2026-10-21

- Corrige o encerramento das entregas: após descarregar, o trabalhador retorna à cabine, o baú fecha completamente e o caminhão inicia a saída, sem ficar preso no pátio.
- Anima as duas portas traseiras do baú, abrindo antes de retirar a primeira caixa e fechando antes de o veículo partir.
- Reutiliza um modelo de cliente como entregador, com uniforme próprio, caminhada completa, balanço corporal e movimentos de pegar, carregar e elevar as caixas nas estantes.
- Validação: 281 testes, build de produção e rotas até N19 aprovados. Verificação visual automatizada não executada porque o acesso externo ao Edge não foi autorizado; nenhuma imagem ou planta SVG foi gerada.

## 0.57.0 — 2026-10-21

- Organiza importações por classe de produto: cada classe tem uma estante exclusiva com quatro pacotes de nove unidades. Caixas guardadas e pedidos a caminho compartilham o limite; pedidos mistos são validados integralmente antes da cobrança.
- Substitui as três estantes do depósito por quatro estantes menores, com dois níveis de duas caixas cada. Enlatados usa a primeira estante, identificada por cor, símbolo e etiqueta, com coleta e entrega no mesmo local. As duas gôndolas reservam duas classes cada; Higiene fica prevista, sem novos produtos disponíveis.
- O catálogo informa classe, estante, ocupação e caixas a caminho, limitando os controles de quantidade ao espaço da classe. Atualiza ajuda, orientação e documentação.
- Preserva saves antigos, inclusive caixas parciais e pedidos pagos acima do novo limite: o excedente entregue fica em reserva e ocupa vagas liberadas; entregas antigas aguardam espaço sem perder mercadoria nem cobrar novamente.
- Validação: 279 testes, build de produção e rotas até N19 aprovados. Verificação de navegador ampliada para os limites por classe, mas não concluída nesta alteração: a conexão com o Edge falhou no sandbox e a execução externa não foi autorizada. Nenhuma imagem ou planta SVG foi gerada.

## 0.56.2 — 2026-10-21

- Define que as prévias são fornecidas manualmente pelo usuário e que plantas SVG só são geradas mediante solicitação explícita.
- Remove as 109 imagens de prévia e suas referências na documentação.
- Mantém as verificações de entregas no navegador sem capturar ou salvar imagens.
- Validação: 275 testes e build de produção aprovados; verificações de entregas em desktop/celular e WebGL/Canvas concluídas sem salvar imagens. Nenhuma referência aos arquivos removidos permanece na documentação.

## 0.56.1 — 2026-10-21

- Reduz o pátio e seu acesso de duas faixas para uma faixa de 4 u, com uma única vaga longitudinal de 2,6 × 7,2 u. O piso encosta no estacionamento de clientes, termina alinhado à fachada do depósito e mantém somente as guias entre as áreas.
- Move a vaga em direção à rua e usa três linhas, com a entrada aberta para comportar caminhões maiores no futuro.
- O caminhão surge à esquerda da rua, avança além do acesso, para para engatar a ré e recua pela curva até a vaga. A cabine fica voltada para a rua e a saída usa a mesma faixa, de frente.
- Ajusta o caminho do entregador ao baú voltado para os fundos, inclui os retrovisores na largura de colisão e coordena as duas faixas da rua durante a manobra. Preserva saves, pedidos e caixas existentes.
- Adiciona uma faixa de pedestres no acesso do caminhão. Após a expansão, pedestres nascem e saem na nova extremidade esquerda da calçada e usam a travessia, inclusive após restaurar um save durante assaltos.
- Atualiza a planta N18 e a documentação da manobra, descarga e travessia em desktop e celular, com WebGL e Canvas.
- Validação: 275 testes, build de produção e rotas até N19 aprovados. Pedestres e caminhão completam suas rotas durante chegada e partida sem travar.

## 0.56.0 — 2026-10-21

- Inclui na compra da expansão do N18 mais 12 u à esquerda do mapa, ampliando o terreno para 52 × 46 u e acompanhando rua, calçada, tráfego, câmera e limites de navegação/salvamento.
- Constrói um pátio exclusivo para caminhões, com acesso próprio pela rua, circuito de entrada/saída, vaga de carga demarcada, setas, placa com pictograma e guias de separação. Um caminho pavimentado liga o pátio ao depósito.
- Transfere todas as entregas para o circuito privativo. O caminhão não usa as seis vagas nem aguarda o estacionamento esvaziar; clientes continuam estacionando durante a descarga. Somente o trecho compartilhado da rua coordena manobras e serviços do banco.
- Remove a exigência de comprar o estacionamento de clientes para importar produtos. Gôndola e expansão com depósito/pátio continuam necessárias, e o limite de 27 pacotes permanece.
- Saves com expansão comprada recebem o terreno e o acesso exclusivos automaticamente, preservando pedidos, caixas, compras, dinheiro e estoques. Atualiza planta N18 e documentação de verificação.
- Validação: 269 testes passaram, incluindo pátio, entregas, importação, câmera e estacionamento; build e rotas até N19 aprovados. Desktop e celular emulado de 390 px conferidos no Edge com WebGL e Canvas.

## 0.55.0 — 2026-10-21

- Substitui a importação instantânea por entregas físicas: cada pedido chama um caminhão baú branco de três eixos, que entra pela rua, estaciona junto ao depósito e retorna após a descarga.
- O entregador sai da cabine, retira uma caixa por vez do baú e caminha até as estantes. As 27 posições começam vazias e exibem somente caixas já guardadas. Caixas parcialmente abertas ocupam posição até o último produto ser retirado.
- Pedidos exigem gôndola, expansão e estacionamento. O catálogo cobra o pedido completo de uma vez e reserva posições para caixas pendentes; estoque entregue mais encomendas nunca ultrapassa 27 pacotes de 9 enlatados.
- Jogador e repositor coletam enlatados no depósito e abastecem a primeira gôndola, que mantém 36 unidades. O catálogo informa ocupação, unidades disponíveis e caixas a caminho; ajuda e objetivos acompanham o novo fluxo.
- Coordena chegada e saída com os carros dos clientes, pedestres, trânsito e serviços do banco. A reserva aguarda os carros existentes saírem e temporariamente encaminha novos compradores a pé. Pausa congela a entrega.
- Preserva enlatados e progresso dos saves anteriores. Caixas entregues, caixas parcialmente abertas e pedidos pagos são salvos; viagens interrompidas retomam com as caixas restantes, sem duplicação nem nova cobrança.
- Validação: 264 testes passaram (incluindo 14 de entrega/importação), build e rotas até N19. Conferência no Edge em desktop e celular emulado de 390 px, com WebGL e Canvas.

## 0.54.3 — 2026-10-21

- Remove os dois pallets com caixas do piso do depósito e suas colisões, liberando o espaço diante das estantes.
- Atualiza a planta e a documentação do depósito para refletir a área livre.
- Validação: teste focado do depósito, verificação de layout, suíte completa e build de produção passaram.

## 0.54.2 — 2026-10-21

- Adiciona às ferramentas DEV um botão para esvaziar todas as prateleiras e reiniciar clientes, cestas, carros e repositor.
- Preserva os produtos liberados e apresentados para permitir novos testes de reposição e compra sem alterar a progressão.
- Validação: teste focado da simulação e build de produção passaram.

## 0.54.1 — 2026-10-21

- Mostra os enlatados na prateleira superior em quatro grupos de três latas. Cada cor representa uma das quatro caixas compradas.
- Repete três latas azuis em cada prateleira inferior quando há estoque, preenchendo visualmente a gôndola sem alterar a capacidade real de 36 unidades ou a economia.
- Validação: 4 testes focados de importação e build de produção passaram.

## 0.54.0 — 2026-10-21

- Libera no nível 19 o botão **Importar produtos** no menu do celular, imediatamente abaixo de **Melhorias**, abrindo um catálogo próprio após a instalação de ao menos uma prateleira de importados.
- Cada caixa custa R$ 270 e acrescenta 9 enlatados diretamente à primeira gôndola; cada unidade é vendida por R$ 30 e o expositor comporta até 36 unidades.
- O catálogo mostra o estoque restante e quantas caixas cabem no saldo e na gôndola. Cada produto tem seu próprio contador, enquanto um único botão no rodapé finaliza o pedido combinado, preparando a tela para novas importações.
- Inclui modelo próprio de lata, pedidos de clientes, persistência do estoque e bloqueio de novas caixas quando não há espaço para nove unidades.
- Validação: 252 testes, build de produção e rotas de compra até o nível 19 passaram.

## 0.53.0 — 2026-10-21

- Remove completamente o escritório, incluindo paredes, porta, piso, mesa, computador, cadeira, estante, colisões, animações e interação de sentar.
- Adiciona ao lado do painel superior um botão em formato de celular que abre as opções do mercado de qualquer lugar, incluindo melhorias, personalização, abertura da loja e depósito bancário.
- Uniformiza o botão do celular com o tamanho e o estilo dos demais botões de ícone do cabeçalho, como o botão de ajuda.
- Reposiciona a banca completa de hortifruti na parede lateral, mantendo seções, interações e colisões alinhadas.
- Atualiza objetivos, ajuda, documentação, plantas e testes para orientar o gerenciamento pelo celular. Saves existentes continuam compatíveis.
- Validação: 249 testes, build e verificação de layout passaram.

## 0.52.0 — 2026-10-21

- Inclui na compra da expansão do nível 18 um depósito atrás do estacionamento, com três estantes metálicas carregadas de caixas e dois pallets sobre piso de concreto.
- Amplia o asfalto até a fachada inteira do depósito e a lateral da loja, ligando os dois espaços sem alterar as seis vagas, a entrada pela rua ou os trajetos dos carros. Antes da compra da expansão, o estacionamento mantém o formato original.
- Abre uma passagem interna de 1,8 u, sem porta, entre o depósito e o anexo dos fundos. Parede, rodapé e colisões acompanham o vão, mantendo somente a verga acima da circulação.
- Instala uma única porta de enrolar voltada para o estacionamento. Suas 18 lâminas descem até a soleira ao fechar a loja, recolhem para a caixa superior ao abrir e congelam durante a pausa.
- Bloqueia o acesso externo quando o portão está fechado e mantém livre a passagem interna. Paredes, estantes, pallets e pacotes possuem colisões próprias, com corredores navegáveis.
- Mantém custo, requisitos, estoques e receitas; partidas com a expansão já comprada recebem todo o conjunto ao carregar, sem novos campos salvos. Atualiza a planta N18 e os desbloqueios.
- Validação: 254 testes, build e rotas até N18 passaram, incluindo compra, persistência, colisões, travessia interna e acesso pelo estacionamento. Desktop e celular foram conferidos no Edge com WebGL e Canvas.

## 0.51.0 — 2026-10-21

- Libera **Expansão** no nível 18 por R$ 10.000, uma única vez pelo escritório, após a padaria. Acrescenta um anexo de 6 u atrás da loja e da cozinha, ampliando o salão para 24 × 22 u e preservando as posições de venda, as divisórias do salão, o piso da cozinha e a porta de produção original.
- Recua a fazenda, a cerca e o caminho de coleta em 6 u, amplia o terreno posterior e acrescenta piso ao redor da cozinha sem sobrepor seu piso original. Ajusta modelos, colisões, rotas, etiquetas, orientação e painel de produção à compra.
- Mantém uma nova saída alinhada à porta de produção e fecha com parede a abertura dos fundos junto à cozinha. Unifica a lateral direita em uma parede de 22 u e alinha altura, espessura, rodapé e acabamento das paredes baixas da cozinha.
- Encosta as duas bancadas da cozinha na face interna da nova parede dos fundos, acompanha suas posições com os pontos de entrega de ingredientes e coleta e remove a mureta atrás delas, incluindo sua colisão.
- Preserva expositores, receitas, estoques, ingredientes, progresso e saves anteriores; partidas sem a compra mantêm sua planta.
- Atualiza os desbloqueios, a planta N18 e a orientação sobre importados, que permanecem para uma etapa futura.
- Validação: 246 testes, build e rotas até N18 passaram, incluindo compra, preservação da planta, posicionamento das bancadas, colisões, entrega/coleta, reposição e acesso à fazenda. Compra pelo painel e recarga conferidas no Edge; desktop e celular verificados com WebGL e Canvas, sem exceções JavaScript.

## 0.50.4 — 2026-10-21

- Aciona somente o pisca do lado para o qual o carro está virando durante as manobras do estacionamento.
- Acende as luzes de freio durante a desaceleração, em vez de mantê-las ligadas por causa da baixa velocidade.
- Validação: 238 testes e build passaram.

## 0.50.3 — 2026-10-19

- Remodela os irrigadores com base fixa, mangueira, coluna metálica e cabeçote giratório de latão com dois bicos.
- Substitui as gotas fixas por jatos de gotas em arco e respingos na terra. A água acompanha a direção do lançamento, respeita os limites de cada canteiro e congela com a pausa.
- Preserva o efeito da melhoria no crescimento e os salvamentos existentes.
- Validação: 237 testes e build passaram; quatro hortas conferidas em desktop e celular com WebGL e Canvas.

## 0.50.2 — 2026-10-19

- Remove a farinha da bandeja no mesmo quadro em que o saco aparece nas mãos do padeiro do forno. A farinha permanece retirada durante o ciclo e reaparece somente na próxima coleta no moinho.
- Validação: 235 testes e build passaram.

## 0.50.1 — 2026-10-19

- Remodela a saída do moinho com uma bica inclinada e uma bandeja metálica mais larga, rebaixada e cercada por bordas, além de uma porção de farinha mais visível.
- Validação: 235 testes e build passaram.

## 0.50.0 — 2026-10-19

- Faz o padeiro do forno buscar a farinha produzida no moinho, transportá-la em um saco aberto até o forno e, depois de assar, trocar a carga pela bandeja de pães destinada à vitrine.
- Mantém as regras de produção e os salvamentos existentes. Validação: 235 testes e build passaram.

## 0.49.4 — 2026-10-19

- Suaviza a retomada e a parada dos padeiros: cada um passa a encarar o deslocamento real enquanto caminha, e os pontos intermediários redundantes são removidos dos trajetos de transição para evitar giros entre passos.
- Validação: 235 testes e build passaram.

## 0.49.3 — 2026-10-19

- Restaura o ritmo dos trajetos e os gestos originais dos padeiros durante o trabalho, mantendo a espera dentro da padaria.
- Exibe as exclamações somente quando o trigo da padaria e a vitrine de pães estão vazios ao mesmo tempo. Preserva saves e regras de produção.
- Validação: 235 testes e build passaram; trabalho e alertas conferidos em desktop e celular com WebGL e Canvas.

## 0.49.2 — 2026-10-19

- Move os pontos de espera dos dois padeiros para dentro da padaria, atrás da vitrine e voltados às prateleiras centrais. Preserva os alertas de trigo e o movimento das cabeças em repouso.
- Validação: 234 testes e build passaram; posições conferidas em desktop e celular com WebGL e Canvas.

## 0.49.1 — 2026-10-19

- Padeiros aguardam diante da vitrine, voltados às prateleiras centrais, quando não há insumos ou espaço para outra fornada. Em repouso, apenas as cabeças se movem, junto com os chapéus.
- Exibe uma exclamação sobre cada padeiro quando o trigo acaba; a farinha restante ainda pode terminar de assar.
- Diferencia gestos de moagem, uso do forno, transporte e exposição de pães; corrige etapas paradas interpretadas como caminhada e anima máquinas somente quando há produção possível.
- Usa uma grade mais fina na passagem de serviço dos padeiros para voltar à vitrine e retomar o trabalho sem atravessar balcões. Mantém saves e regras de produção existentes.
- Validação: 234 testes, rotas até o nível 17 e build passaram; estados sem trigo, em trabalho e com vitrine cheia conferidos no Edge em desktop e celular, com WebGL e Canvas.

## 0.49.0 — 2026-10-19

- Adiciona às ferramentas DEV um botão para completar até a capacidade máxima todas as prateleiras de produtos já liberados, marcar os produtos como apresentados e reiniciar o repositor sem perder sua carga.
- Mantém bloqueados os produtos e móveis que ainda não fazem parte do progresso atual.
- Validação: suíte completa de testes e build passaram.

## 0.48.0 — 2026-10-19

- Libera uma melhoria de dois níveis no nível 17; cada compra de R$ 1.000 instala uma prateleira metálica de dois lados pelo escritório, na aba Mercado.
- Instala dois móveis vazios idênticos de 5,775 unidades nos corredores centrais, alinhados pela frente com o balcão da padaria e terminando juntos antes dos expositores do fundo. Mantém colisão por compra, espaço para a fila e acesso aos produtos existentes. A importação fica planejada para o nível 18, sem novos produtos nesta etapa.
- Preserva saves antigos e o progresso parcial do formato provisório com duas opções; acrescenta testes de compra, saldo, limite, salvamento, instalação e circulação, além da planta N17.
- Validação: 230 testes, rotas até o nível 17 e build passaram. Compras e visual conferidos no Edge em desktop e celular, com WebGL e Canvas, sem exceções JavaScript.

## 0.47.0 — 2026-10-16

- Cria uma sala com piso cerâmico, paredes baixas no estilo do escritório e entrada lateral sem porta nos fundos direitos.
- Reúne queijaria e cozinha de geleias nessa sala, mantendo compras, receitas e estoques existentes.
- Remove a parede curta esquerda e aproxima as duas máquinas da parede baixa do fundo, ampliando a circulação na frente.
- Compartilha a planta entre visual e colisões; atualiza a migração de posições e verifica acesso com qualquer uma das oficinas comprada primeiro.
- Validação: 222 testes, rotas de todos os níveis e build passaram; verificação no Edge/WebGL sem erros JavaScript.

## 0.46.3 — 2026-10-16

Refinamento visual PATCH sobre 0.46.2. Alterações locais ainda sem commit associado.

- Acrescenta bancos dianteiros com encostos e apoios de cabeça, piso escuro, painel e volante com aro e raios ao construtor compartilhado dos carros.
- Dimensiona o interior pela cabine de cada modelo, atendendo os vinte carros reutilizados do trânsito; os detalhes aparecem ao abrir a porta no estacionamento.
- Confere as seis carrocerias com portas abertas no Edge/WebGL, sem exceções JavaScript. Testes existentes de trânsito e build passaram.

## 0.46.2 — 2026-10-16

Correção PATCH sobre 0.46.1. Alterações locais ainda sem commit associado.

- Corrige o motorista preso ao lado da entrada: a 60 FPS, a pessoa bloqueava o giro da folha parcialmente aberta e aguardava justamente essa abertura para caminhar.
- Ao circular pela calçada, clientes planejam o desvio considerando a posição atual e a posição aberta da porta. Clientes já presos também conseguem sair pelo espaço livre, preservando colisões e a proteção contra a porta girar sobre pessoas.
- Acrescenta regressões a 60 FPS com diferentes aberturas iniciais e com um cliente já preso; o ciclo completo de compras do motorista também passa a ser verificado a 60 FPS.
- Os dois testes novos reproduziram a falha antes da correção. Após o ajuste, 221 testes passaram e o build concluiu com o aviso de tamanho de pacote já existente.

## 0.46.1 — 2026-10-16

Correção PATCH sobre 0.46.0. Alterações locais ainda sem commit associado.

- Reutiliza o próprio carro que já circula na rua, com o mesmo objeto, cor, modelo, escala e posição; elimina a redução para 82% e a criação de carros exclusivos do estacionamento.
- Aceita os vinte modelos do trânsito e ajusta vagas, colisões, portas e curvas para o tamanho original, incluindo picapes, SUVs e vans.
- Mantém passantes e compradores a pé. Uma parcela dos compradores pode chegar dirigindo; vagas ocupadas, construção ou manobras não interrompem o fluxo da calçada.
- Testa os vinte modelos nas seis vagas, inclusive com veículos grandes nas vagas vizinhas, transferência sem teletransporte e convivência entre pedestres e motoristas.
- Suíte de 219 testes e build passaram. No Edge com WebGL, um motorista, quatro compradores a pé e um passante coexistiram; cinco vendas concluídas e o mesmo carro partiu, sem exceções JavaScript.

## 0.46.0 — 2026-10-16

Incremento MINOR pelo ciclo completo de clientes motorizados. Alterações locais ainda sem commit associado.

- Estacionamento construído e partidas carregadas começam com seis vagas vazias, sem carros cenográficos nem colisões invisíveis.
- Vincula cada carro ao cliente e reserva sua vaga até terminar a viagem: chegada pela rua, estacionamento, desembarque, compras, retorno, embarque, ré e partida.
- Anima curvas com aceleração e frenagem, rodas girando e esterçando, porta do motorista, piscas e luzes de freio e ré.
- Coordena manobras, pedestres, trânsito e veículos do banco; clientes recusados também retornam ao próprio carro. Compras já pagas não voltam ao estoque ao salvar durante a partida.
- Valida as seis vagas, lotação, ciclo de compra completo, loja fechada, pausa, pedestres, salvamento e remoção dos modelos. Suíte de 217 testes e build passaram; viagem conferida no Edge com WebGL sem exceções JavaScript.

## 0.45.1 — 2026-10-16

Correção PATCH sobre 0.45.0. Alterações locais ainda sem commit associado.

- Estende o estacionamento até perto da borda esquerda do terreno, reposicionando as vagas externas, a placa e o canteiro central.
- Centraliza o acesso nas faixas de entrada e saída, usando o mesmo asfalto e uma ligação contínua até a rua.
- Recorta a calçada e o meio-fio apenas após a compra, amplia a travessia e move o poste para fora do acesso, com a colisão correspondente.
- Verifica alinhamento das setas, continuidade do piso, limites do terreno e passagem livre nas duas faixas.
- Atualiza pacote, lockfile e README para 0.45.1; Ajuda e DEV exibem a versão automaticamente.

## 0.45.0 — 2026-10-16

Incremento MINOR sobre 0.44.2 pela nova construção do nível 16. Alterações locais ainda sem commit associado.

- Adiciona estacionamento por R$ 10.000 na aba Mercado do escritório, disponível a partir do nível 16 e limitado a uma compra.
- Constrói seis vagas no terreno à esquerda da loja, com quatro carros cenográficos, entrada pela rua, setas, travessia, canteiro central, arbustos, iluminação e placa P.
- Substitui a vegetação da área comprada e anima a construção; partidas carregadas mostram a estrutura pronta.
- Acrescenta colisões aos carros e ao canteiro, preservando acesso às hortas e à loja.
- Salva a compra como melhoria independente e mantém partidas antigas com o estacionamento bloqueado, preservando dinheiro e progresso.
- Atualiza objetivo do nível 16, Ajuda, README e guia de desbloqueios; inclui testes de compra, limites, persistência, modelos e navegação.
- Atualiza pacote e lockfile para 0.45.0; Ajuda e DEV exibem a versão automaticamente.

## 0.44.2 — 2026-10-16

Correção PATCH sobre 0.44.1, registrada no commit `213844d`.

- Prende as pegas às folhas da porta de entrada, perto da borda livre, para acompanharem a rotação durante a abertura.
- Acrescenta colisão às folhas fechadas, abertas e parcialmente abertas, impedindo o jogador de atravessar os painéis.
- Usa o mesmo estado de abertura na simulação e no cenário; a entrada abre também para o jogador e para de girar antes de atingir alguém.
- Mantém a passagem de clientes pelo vão automático e verifica as rotas dos agentes bancários e do assaltante com as portas abertas.
- Acrescenta testes de pegas, colisão, passagem pelo vão, abertura por proximidade, pausa e proteção durante o fechamento.
- Atualiza pacote, lockfile e README para 0.44.2; Ajuda e DEV exibem a versão automaticamente.

## 0.44.1 — 2026-10-16

Correção PATCH sobre 0.44.0, registrada no commit `a1a77df`.

- Move o nascimento e a saída de pedestres para as extremidades da rua atual, com margem interna para manter o corpo inteiro sobre a calçada.
- Ajusta a navegação para contornar postes e bancos dentro da calçada, incluindo faixas estreitas junto à borda que não coincidem com a grade de caminhos.
- Preserva as posições externas ao recarregar clientes durante um assalto.
- Acrescenta testes de nascimento, percurso completo, saída nas duas direções e recuperação de posições salvas.
- Atualiza pacote, lockfile e README para 0.44.1; Ajuda e DEV exibem a versão automaticamente.

## 0.44.0 — 2026-10-16

Incremento MINOR sobre 0.43.11 pela adição de identificação dos produtos no cenário, registrado no commit `25bd9a2`.

- Adiciona placas em postes somente nas seções de hortifruti: tomate, milho, trigo e morango, com os nomes em português.
- Alinha as placas à frente das bancas, com o texto voltado para o corredor, acompanhando o zoom e o desbloqueio de cada seção.
- Compartilha as texturas de texto e usa as fontes locais do projeto, com suporte ao renderizador alternativo em Canvas 2D.
- Atualiza pacote, lockfile e README para 0.44.0; Ajuda e DEV exibem a versão automaticamente.

## 0.43.11 — 2026-10-16

Correção PATCH sobre 0.43.10, registrada no commit `8072462`.

- Desloca o conjunto da padaria um ladrilho (1,2 unidades) em direção à frente da loja, à esquerda na vista isométrica, para melhorar a centralização.
- Mantém balcões, equipamentos, pães, pontos de entrega e compra, colisões e trajetos dos padeiros alinhados pela mesma transformação.
- Atualiza a migração de posições salvas para recuperar personagens que estejam sobrepostos aos objetos deslocados.
- Atualiza pacote, lockfile e README para 0.43.11; Ajuda e DEV exibem a versão automaticamente.

## 0.43.10 — 2026-10-16

Correção PATCH sobre 0.43.9, registrada no commit `7b17425`.

- Corrige sombras cortadas ou ausentes na estufa e no apiário, ajustando a área e a profundidade da câmera de sombras ao terreno completo.
- Melhora a resolução das sombras e corrige as faixas de autossombreamento na colmeia.
- Remove a sombra opaca do teto transparente da estufa; estrutura e plantas continuam projetando sombras.
- Atualiza a versão do pacote, lockfile e README; Ajuda e DEV recebem o novo valor automaticamente.

## Base retrospectiva: 0.43.9

Numeração reconstruída a partir dos **87 commits** entre `43658f2` e `ae46128`, examinando código, configuração, interface e testes, além das mensagens dos commits. A base é **0.1.0**; depois dela há **42 incrementos MINOR**, **37 incrementos PATCH**, **5 commits de documentação/ferramentas de documentação** e **2 merges sem alterações adicionais**.

Cada incremento MINOR zera PATCH. Por isso, a versão final é **0.43.9**, e o PATCH final registra os nove ajustes posteriores ao último MINOR (`17e1262`). O último commit de documentação (`ae46128`) mantém a versão de `33a75ac`.

## Critério de versionamento

- **MAJOR:** mudança incompatível de um contrato público estabilizado. O histórico permanece em desenvolvimento inicial `0.x`; reformulações amplas de sistemas são contabilizadas como MINOR nessa fase.
- **MINOR:** nova mecânica, produto, controle ou painel funcional, ou reformulação substancial de um sistema. Incrementa MINOR e zera PATCH.
- **PATCH:** correção, ajuste de equilíbrio, texto de interface ou acabamento visual de uma funcionalidade existente. Incrementa PATCH.
- **Sem incremento:** documentação e ferramentas de documentação, sem alteração do jogo.
- **Merge:** mantém a versão quando apenas integra commits já contabilizados. Uma resolução com comportamento novo exigiria classificação própria.

Em um commit misto, prevalece a mudança de maior impacto. Os prefixos `feat`, `refac`, `chore` e `style` não determinam sozinhos o incremento: por exemplo, `6f02a3f` acrescenta abas funcionais e recebe MINOR, enquanto `26facdc` corrige circulação e recebe PATCH.

Os números abaixo são uma **reconstrução retrospectiva por commit**, não tags ou lançamentos registrados na época: `package.json` permaneceu em `0.1.0` durante esses 87 commits. A sequência usa `git log --reverse --topo-order HEAD` para contar cada commit uma vez, incluindo os das branches integradas. A tabela apresenta essa sequência de trás para frente.

## Identificação da versão na revisão 0.43.9

- Atualiza `package.json`, `package-lock.json` e README para **0.43.9**.
- Exibe **Versão 0.43.9** nos menus Ajuda e DEV, lendo o valor de `package.json`.
- Mantém a versão calculada pelos 87 commits; a reconstrução do histórico e sua identificação nos menus não acrescentam um incremento de jogabilidade.

## Registro dos 87 commits

| Versão resultante | Incremento | Data | Commit | Alterações |
| --- | --- | --- | --- | --- |
| 0.43.9 | Sem incremento | 2026-10-16 | `ae46128` | Atualiza README com stack, execução local, controles, níveis, custos, receitas, salvamento e organização do código. |
| 0.43.9 | PATCH | 2026-10-16 | `33a75ac` | Aplica bancas de madeira a mel e geleia, com apresentação horizontal e reposição e estoques separados. |
| 0.43.8 | PATCH | 2026-10-16 | `73cac15` | Troca o expositor de queijo por refrigerador junto ao leite, ajusta identificação visual e migração de posições. |
| 0.43.7 | PATCH | 2026-10-16 | `f303327` | Redesenha estante de ovos e acomoda sua apresentação nos três níveis do expositor. |
| 0.43.6 | Merge · sem incremento | 2026-10-16 | `6b79b2c` | Integra os expositores de madeira já contabilizados em 6f1ffc0; sem mudança adicional na resolução do merge. |
| 0.43.6 | PATCH | 2026-10-16 | `6f1ffc0` | Atualiza expositores de hortifruti para madeira, mantendo seções e desbloqueios independentes. |
| 0.43.5 | Merge · sem incremento | 2026-10-16 | `f3bdfaf` | Integra a sequência de adaptações já contabilizada nos commits anteriores; sem resolução de conflito que introduza mudança adicional. |
| 0.43.5 | PATCH | 2026-10-15 | `063d350` | Adapta cozinha e seção de geleias junto ao mel; corrige seleção na divisória para não misturar estoques ou repor o produto vizinho. |
| 0.43.4 | PATCH | 2026-10-15 | `34bbd94` | Adapta queijaria e expositor de queijo; preserva ingredientes, lotes prontos e andamento da produção. |
| 0.43.3 | PATCH | 2026-10-15 | `4d02324` | Adapta colmeia e expositor de mel, preservando estoques e cargas de partidas anteriores. |
| 0.43.2 | PATCH | 2026-10-15 | `cce3035` | Adapta estufa e seção de morangos à loja ampliada, conserva paredes e corrige rotas e recuperação de atores. |
| 0.43.1 | PATCH | 2026-10-14 | `bf28399` | Adapta a padaria e sua expansão, vitrine, máquinas e trajetos dos padeiros, preservando ingredientes, lotes e cargas salvos. |
| 0.43.0 | MINOR | 2026-10-14 | `17e1262` | Adiciona opção DEV persistente para desativar/reativar assaltos; cancelar um evento libera clientes e preserva dinheiro e reputação. |
| 0.42.4 | PATCH | 2026-10-14 | `e603f34` | Adapta trigo e circulação, mantendo o salão existente; acomoda dez posições de fila e recupera atores de partidas antigas. |
| 0.42.3 | PATCH | 2026-10-14 | `fa8be36` | Adapta curral e refrigerador de duas portas; corrige seleção exclusiva entre ovos e leite com inventário misto e preserva produção salva. |
| 0.42.2 | PATCH | 2026-10-14 | `7bfa5d4` | Adapta galinheiro e expositor de ovos, mantendo instalações por etapas, acesso à produção e estoques ao migrar. |
| 0.42.1 | PATCH | 2026-10-14 | `7fe9e39` | Adapta milho ao conjunto de cultivos e ao hortifruti, mantendo seção bloqueada ausente e preservando cargas ao migrar. |
| 0.42.0 | MINOR | 2026-10-14 | `9e35a5c` | Reformula a loja inicial com acesso posterior à produção e hortifruti de seções compráveis e independentes; acrescenta seleção exclusiva e migração de partidas. |
| 0.41.2 | Sem incremento | 2026-10-13 | `b48f6b0` | Registra referências visuais e plano de implementação da evolução da loja; não altera o jogo. |
| 0.41.2 | PATCH | 2026-10-07 | `d10808e` | Redesenha a colmeia, acrescenta abelhas animadas e bandeja de coleta e representa o mel em garrafas. |
| 0.41.1 | PATCH | 2026-10-07 | `dea75c3` | Corrige caminhada para acompanhar distância percorrida, manter os pés acima do chão e suavizar paradas, pausas e teletransportes. |
| 0.41.0 | MINOR | 2026-10-07 | `0589c7c` | Adiciona zoom pela roda do mouse e pinça com dois dedos, com limites e movimento da câmera ajustado à escala. |
| 0.40.1 | PATCH | 2026-10-07 | `a179772` | Melhora a apresentação das compras, destacando o preço de venda de cada produto a partir do catálogo. |
| 0.40.0 | MINOR | 2026-10-07 | `0fde28e` | Adiciona cartão da padaria com trigo, farinha, forno e vitrine; painéis de produção passam a aparecer junto à estação em uso. |
| 0.39.1 | PATCH | 2026-10-07 | `bd4d306` | Separa origens de morango e mel das oficinas para evitar interações involuntárias e liberar acesso. |
| 0.39.0 | MINOR | 2026-10-06 | `a45661e` | Cria painel de produção das oficinas com ingredientes faltantes, progresso e produtos prontos, sem alterar a simulação. |
| 0.38.0 | MINOR | 2026-10-06 | `5f46eb8` | Adiciona lixeira com painel para descartar um produto ou toda a carga, validando proximidade e paredes. |
| 0.37.1 | PATCH | 2026-10-06 | `0f9a43f` | Reposiciona e compacta o escritório para restaurar circulação e separar suas interações do milho. |
| 0.37.0 | MINOR | 2026-10-06 | `4c35f34` | Adiciona marcador exclusivo sobre o jogador, voltado para a câmera e com tamanho legível em qualquer zoom. |
| 0.36.1 | PATCH | 2026-10-06 | `eaa4c4c` | Corrige texturas, formas, alturas de paredes e apresentação da padaria. |
| 0.36.0 | MINOR | 2026-10-06 | `eb00e88` | Reorganiza extensões e estações, introduz interações delimitadas por faces e paredes e migra atores e estoques sem perder progresso. |
| 0.35.0 | Sem incremento | 2026-10-06 | `9e54634` | Atualiza diagramas de crescimento e sua ferramenta de geração; não altera o jogo. |
| 0.35.0 | Sem incremento | 2026-10-06 | `7ba788c` | Adiciona documentação visual das etapas da loja e ferramenta para gerar diagramas; não altera o código executado pelo jogo. |
| 0.35.0 | MINOR | 2026-10-01 | `786ef03` | Acrescenta níveis 10–15, cesta de trabalho, morango, mel, queijo, geleia, irrigação e reposição ágil; implementa receitas, estoques e estreia de produtos após abastecimento. |
| 0.34.1 | PATCH | 2026-10-01 | `be84ccc` | Corrige a demanda de pão para entrar na seleção normal de pedidos; somente clientes que escolhem pão exigem ao menos três unidades. |
| 0.34.0 | MINOR | 2026-10-01 | `1982173` | Introduz padaria no nível 9 por R$ 1.400, moagem e forno com rendimento de três pães por trigo e dois padeiros animados. |
| 0.33.0 | MINOR | 2026-10-01 | `01ac08a` | Adiciona compra de cinco cestas extras no nível 8 por R$ 100, aumentando de cinco para dez os clientes simultâneos. |
| 0.32.1 | PATCH | 2026-10-01 | `2487a52` | Substitui a apresentação do expositor de leite por refrigerador e corrige o acesso frontal para compra e reposição. |
| 0.32.0 | MINOR | 2026-09-30 | `e831c5c` | Cria painel lateral de clientes com retratos e acompanhamento dos pedidos, substituindo a apresentação anterior de intenções. |
| 0.31.0 | MINOR | 2026-09-30 | `a025456` | Introduz trigo no nível 7 por R$ 400, com cultivo, coleta, reposição, venda por R$ 5 e transporte pelo repositor. |
| 0.30.0 | MINOR | 2026-09-30 | `2b8f418` | Permite mover a câmera com botão direito, Shift, Shift + setas ou dois dedos, respeitando os limites do terreno. |
| 0.29.1 | PATCH | 2026-09-30 | `a1dd34a` | Corrige a barra de nível para mostrar o progresso dos 25 clientes do nível atual, mantendo a contagem total e descrição acessível. |
| 0.29.0 | MINOR | 2026-09-30 | `712f9f7` | Disponibiliza o repositor no nível 6 por R$ 900 sem exigir ovos, com coleta e reposição dos produtos liberados. |
| 0.28.0 | MINOR | 2026-09-30 | `153baea` | Adiciona contagem regressiva e barra do prazo para depositar; corrige retomada após pausa e esconde estações ainda não compradas. |
| 0.27.0 | MINOR | 2026-09-30 | `f2f325a` | Introduz curral, produção automática e venda de leite em garrafas, com desbloqueio, construção e objetivos próprios. |
| 0.26.2 | PATCH | 2026-09-30 | `cf2fc71` | Rebalanceia intervalos de chegada em seis faixas de reputação e faz clientes sem cesta disponível continuarem pela calçada. |
| 0.26.1 | PATCH | 2026-09-30 | `f140727` | Corrige a altura do assaltante na animação. |
| 0.26.0 | MINOR | 2026-09-30 | `ab865d8` | Introduz risco e evento de assalto, clientes assustados, roubo único do caixa e perda de reputação; preserva o evento ao recarregar. |
| 0.25.0 | MINOR | 2026-09-30 | `0835400` | Introduz dinheiro acumulado no caixa, depósito a partir de R$ 1.000 e coleta animada por carro-forte, com persistência e reserva da faixa de tráfego. |
| 0.24.0 | MINOR | 2026-09-30 | `b06d74a` | Adiciona pausa automática ao perder foco, aviso para retomar e atualização do controle de tela cheia. |
| 0.23.0 | MINOR | 2026-09-30 | `3e041dc` | Adiciona tráfego de rua com vinte modelos de veículos, duas faixas, geração aleatória e remoção após sair da cena. |
| 0.22.3 | PATCH | 2026-09-30 | `9e58c0c` | Melhora gramado, detalhes externos e acabamento do cenário. |
| 0.22.2 | PATCH | 2026-09-30 | `cf0da61` | Rebalanceia a progressão, desativa temporariamente ajudante e melhorias de velocidade e simplifica orientações e exportação do estado. |
| 0.22.1 | PATCH | 2026-09-29 | `f48b40e` | Antecipa ovos para o nível 4, desativa fertilizante e remove seus efeitos de partidas carregadas. |
| 0.22.0 | MINOR | 2026-09-29 | `7621c5b` | Adiciona barra de progresso de nível e controle DEV de 1/25 clientes por nível; reorganiza desbloqueios, custos e visibilidade dos objetivos e melhorias. |
| 0.21.0 | MINOR | 2026-09-29 | `89947e5` | Reformula o galinheiro para produção automática sem milho ou ração; atualiza coleta, capacidade, demanda, circulação e migração de partidas. |
| 0.20.0 | MINOR | 2026-09-29 | `1a0c265` | Adiciona controles DEV para aumentar nível e reputação, persistindo seus efeitos no progresso. |
| 0.19.1 | PATCH | 2026-09-29 | `a225a81` | Corrige instalação e animação da ala dos ovos, acesso e paredes; recupera ajudante de salvamentos anteriores sem perder a carga. |
| 0.19.0 | MINOR | 2026-09-28 | `fd12ea2` | Introduz ovos, expansão comprável e cadeia milho → ração → galinhas; acrescenta demanda gradual, reposição por ajudante e persistência da carga. |
| 0.18.0 | MINOR | 2026-09-28 | `fb83ec2` | Adiciona tutorial por ações reais, bônus único de R$ 100 por nível, dicas no cenário e requisitos entre melhorias; rebalanceia custos e chegadas. |
| 0.17.0 | MINOR | 2026-09-25 | `f45efdf` | Distribui desbloqueios pelos níveis, reativa milho e ajudante, acrescenta fertilizante selecionável por horta e melhoria de velocidade do ajudante. |
| 0.16.0 | MINOR | 2026-09-25 | `11faa50` | Introduz bloqueio de melhorias por nível e orientação de compra no escritório; revisa preços, capacidade da cesta e disponibilidade de melhorias. |
| 0.15.0 | MINOR | 2026-09-25 | `84c41f5` | Troca a progressão por satisfação por níveis a cada 25 clientes atendidos; acrescenta aviso, animação e som de novo nível. |
| 0.14.1 | PATCH | 2026-09-25 | `0eb7cdd` | Ajusta tamanho da sacola à compra, organização interna dos produtos e animação de embalagem e retirada. |
| 0.14.0 | MINOR | 2026-09-25 | `4117c67` | Introduz reputação pelas dez experiências recentes, pedidos e chegadas dependentes da reputação e paciência na fila com indicador de tempo. |
| 0.13.0 | MINOR | 2026-09-25 | `54e19d2` | Introduz satisfação feliz/neutra/irritada, pontuação 10/5/0 e progressão por 100 pontos, com migração das estatísticas salvas. |
| 0.12.1 | PATCH | 2026-09-25 | `c2197f2` | Acrescenta variações visuais de barba e corrige olhos e acessórios escondidos em clientes corpulentos. |
| 0.12.0 | MINOR | 2026-09-25 | `9896cfb` | Adiciona pedidos de vários produtos, indicadores de intenção e espera por estoque; limita a cesta a cinco itens e salva corretamente compras ainda não pagas. |
| 0.11.0 | MINOR | 2026-09-25 | `25d4f6b` | Cria cestas compartilhadas para clientes: pegar na entrada, devolver no checkout e limitar a quantidade de compradores simultâneos. |
| 0.10.2 | PATCH | 2026-09-25 | `89f9e8d` | Ajusta cores do cenário, materiais e apresentação do renderizador alternativo em Canvas 2D. |
| 0.10.1 | PATCH | 2026-09-25 | `79b4ad6` | Atualiza cores, contraste, ícones e apresentação dos menus e objetos do cenário. |
| 0.10.0 | MINOR | 2026-09-25 | `ec53423` | Move gerenciamento e personalização para o computador do escritório; permite abrir/fechar o mercado, preservando clientes internos e o estado salvo. |
| 0.9.1 | PATCH | 2026-09-25 | `0ee78f0` | Uniformiza jogador e funcionários com as cores da loja; ajusta braços livres e caixa de madeira do ajudante conforme a carga. |
| 0.9.0 | MINOR | 2026-09-24 | `699127c` | Substitui os objetivos iniciais por uma meta recorrente de 100 clientes por nível e revisa etiquetas e mensagens de inventário. |
| 0.8.0 | MINOR | 2026-09-24 | `a06ed52` | Introduz 144 aparências de clientes, entradas e saídas pelas duas direções da calçada e compras simultâneas fora da fila do caixa. |
| 0.7.1 | PATCH | 2026-09-24 | `fc82cb4` | Impede clientes de passar atrás do caixa e exige que o jogador esteja sentado na cadeira para atender. |
| 0.7.0 | MINOR | 2026-09-24 | `5c1ec03` | Adiciona porta automática do escritório acionada por proximidade; ajusta pontos de espera, orientação do caixa e colisões entre clientes. |
| 0.6.0 | MINOR | 2026-09-24 | `8b85649` | Permite personalizar nome, slogan e oito paletas da loja; salva a identidade e atualiza cenário, câmera isométrica e circulação. |
| 0.5.0 | MINOR | 2026-09-24 | `6f02a3f` | Adiciona abas Mercado, Funcionários e Jogador ao menu de melhorias, com filtragem por categoria. |
| 0.4.2 | PATCH | 2026-09-24 | `85fe87d` | Ajusta posição e empilhamento dos produtos carregados pelo jogador e a pose dos braços ao sentar. |
| 0.4.1 | PATCH | 2026-09-24 | `37a6db9` | Melhora modelos e animações do checkout, embalagem em sacolas e posição do funcionário; evita o jogador sentar no posto já ocupado pelo caixa contratado. |
| 0.4.0 | MINOR | 2026-09-24 | `a452aa5` | Cria o menu DEV com ajuste de saldo e confirmação para reiniciar a partida. |
| 0.3.0 | Sem incremento | 2026-09-24 | `5c4dad8` | Registra ideias e tarefas futuras; não altera o jogo. |
| 0.3.0 | MINOR | 2026-09-24 | `4ed35c2` | Adiciona reinício do progresso pelo botão DEV, com tratamento de falha ao apagar o salvamento. |
| 0.2.1 | PATCH | 2026-09-24 | `26facdc` | Corrige sobreposição de clientes, espaçamento e ordem da fila; acrescenta busca de caminho para contornar obstáculos. |
| 0.2.0 | MINOR | 2026-09-24 | `f9d3646` | Reestrutura a cesta e suas capacidades de 4/8/12/16 itens, anima pegar/guardar produtos e permite sentar e levantar sem perder a carga. |
| 0.1.0 | BASE | 2026-09-24 | `43658f2` | Base jogável com tomate e milho, colheita, reposição, caixa, funcionários, controles, som e salvamento local; Three.js, Canvas 2D, Vite e testes Node.js. |
