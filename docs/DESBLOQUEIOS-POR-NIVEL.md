# Desbloqueios por nível

A loja começa com **14 × 8 u** do nível 1 ao 5, mantendo a fachada na posição atual. Ao alcançar o **nível 6**, o salão volta automaticamente a **14 × 16 u**, sem custo ou compra, independentemente das melhorias adquiridas. Parede posterior, porta de produção, lixeira e expositores de ovos e leite acompanham a profundidade; hortas e animais mantêm suas posições. Saves anteriores preservam saldo, compras e estoques, com reposicionamento seguro dos personagens. Os níveis, custos e receitas abaixo permanecem iguais; a reorganização dos produtos será feita em outra etapa. Os registros das plantas N1–N5 descrevem a geometria anterior. No [nível 3](PLANTA-LOJA-N3.md), comprar milho acrescenta um canteiro alinhado atrás dos tomates e uma seção à mesma banca, mantendo o salão inicial. As duas hortas ficam inteiramente atrás da loja, com acesso pela porta dos fundos. Tomate, milho, trigo e morango compartilham uma banca de madeira que ganha seções após as compras. Abasteça a seção desejada pela face do corredor. As oficinas compartilham uma sala com piso e paredes baixas nos fundos direitos, com entrada lateral aberta. A sala aparece com a primeira compra de uma dessas oficinas.

No [nível 7](PLANTA-LOJA-N7.md), comprar trigo por R$ 400 acrescenta o canteiro atrás do milho e a terceira seção do hortifruti, sem ampliar o salão. Todos os canteiros de cultivos medem 3,6 × 2,5 u.

No [nível 9](PLANTA-LOJA-N9.md), a padaria amplia o salão para 24 × 16 u à direita. O balcão fica junto à parede direita, de frente para o hortifruti. Entregue trigo na caixa ao fundo do conjunto: moinho e forno mantêm a receita de três pães por trigo.

## Disponíveis

A progressão ativa inclui o estacionamento no nível 16, a confeitaria no nível 17, a laranjeira no nível 18 e a macieira no nível 19. Prateleiras de importados, expansão e as quatro classes importadas dos antigos níveis 17 a 22 continuam desativadas, inclusive no DEV. Os níveis continuam avançando, mas ainda não há novos desbloqueios a partir do 20. O conjunto de importações será reorganizado depois do nível 20, sem níveis novos definidos por enquanto. A referência da implementação anterior está ao final deste documento.

No [nível 4](PLANTA-LOJA-N4.md), a compra de ovos instala o galinheiro atrás da loja e uma estante alta de três níveis junto à parede posterior, à direita da porta de produção. O salão mantém 14 × 8 u até alcançar o nível 6. As galinhas produzem um ovo a cada 3,5 segundos, sem insumos; coleta e reposição continuam manuais ou pelo repositor contratado posteriormente.

No [nível 5](PLANTA-LOJA-N5.md), o curral fica atrás da loja ao lado do galinheiro, e o refrigerador vertical de duas portas de vidro fica à direita dos ovos na parede posterior. O salão continua com 14 × 8 u até alcançar o nível 6. O curral produz uma garrafa a cada 4,5 segundos, sem insumos. Abasteça ovos e leite pela frente do expositor correspondente; os estoques são separados, inclusive na divisória.

| Nível | Melhoria ou produto | Custo | Preço de venda por unidade |
| --- | --- | --- | --- |
| 1 | Tomate (disponível desde o início) | — | R$ 5 |
| 2 | Caixa | R$ 250 | — |
| 3 | Milho | R$ 350 | R$ 10 |
| 4 | Ala dos ovos | R$ 500 | R$ 15 por ovo |
| 5 | Ala do leite | R$ 800 | R$ 20 por garrafa |
| 6 | Salão volta a 14 × 16 u automaticamente | Grátis | — |
| 6 | Repositor | R$ 900 | — |
| 7 | Ala do trigo | R$ 400 | R$ 5 por trigo |
| 8 | Mais 5 cestas (até 10 clientes na loja) | R$ 100 | — |
| 9 | Padaria | R$ 1.400 | R$ 10 por pão |
| 10 | Cesta de trabalho: 8 produtos e +15% de velocidade | R$ 400 | — |
| 11 | Estufa de morangos | R$ 1.200 | R$ 16 por morango |
| 12 | Apiário do bairro | R$ 850 | R$ 24 por pote de mel |
| 13 | Queijaria | R$ 1.600 | R$ 18 por queijo |
| 14 | Irrigação: tempo de crescimento das hortas reduzido em 25% | R$ 650 | — |
| 14 | Reposição ágil: repositor anda 30% mais rápido | R$ 500 | — |
| 15 | Cozinha de geleias | R$ 2.200 | R$ 30 por pote de geleia |
| 16 | Estacionamento lateral com seis vagas | R$ 10.000 | — |
| 17 | Confeitaria da padaria: bolos, donuts e éclairs + confeiteiro | R$ 1.000 | R$ 15 por unidade |
| 18 | Laranjeira e seção de laranjas no hortifruti | R$ 800 | R$ 7 por laranja |
| 19 | Macieira e seção de maçãs no hortifruti | R$ 800 | R$ 7 por maçã |

## Laranjeira no nível 18

Em **Celular → Melhorias → Mercado**, compre **Laranjeira** por **R$ 800**, uma única vez. A árvore fica à direita do apiário, com copa arredondada e tronco ramificado. Produz uma laranja a cada **3 segundos**, até **8 frutas** na copa; cada laranja é vendida por **R$ 7**. A irrigação das hortas não altera o pomar.

Colha pela frente da árvore e abasteça a seção junto aos morangos na banca de hortifruti. O repositor também pode colher e abastecer. A banca inteira foi deslocada 2,6 u em direção à fachada, reservando a sexta seção para as maçãs do nível 19, sem criar um expositor vazio antes da compra. Laranjas entram nos pedidos após o primeiro abastecimento.

Compra, estoques e crescimento são salvos. Saves anteriores recebem a laranjeira ainda não comprada e preservam saldo e progresso; a atualização da planta reposiciona os personagens em locais seguros.

## Macieira no nível 19

Em **Celular → Melhorias → Mercado**, compre **Macieira** por **R$ 800**, uma única vez. A árvore fica no gramado ao lado da laranjeira, em direção às oficinas, sem base quadrada. A copa arredondada exibe maçãs vermelhas grandes, que desaparecem conforme são colhidas. Acesso de coleta pela lateral esquerda, preservando os corredores entre árvores e oficinas.

Produz uma maçã a cada **3 segundos**, até **8 frutas** na árvore. Venda cada maçã por **R$ 7** na sexta seção do hortifruti, junto às laranjas, com capacidade para **12 maçãs**. O repositor também colhe e abastece. Maçãs entram nos pedidos após o primeiro abastecimento. Irrigação e fertilizante das hortas não afetam o pomar.

A compra não exige outras melhorias. Compra, estoques e crescimento são salvos; saves anteriores recebem a macieira ainda não comprada, preservando saldo, laranjeira e demais progressos.

## Confeitaria no nível 17

Em **Celular → Melhorias → Mercado**, compre **Confeitaria da padaria** por **R$ 1.000**, uma única vez. Exige padaria, apiário e ala dos ovos. A compra libera bolos, donuts e éclairs, todos vendidos a **R$ 15 por unidade**, e inclui um terceiro funcionário dedicado à confeitaria.

Antes da compra, os três balcões secundários da padaria têm apenas tampos planos de trabalho; a vitrine de pães permanece funcionando. A compra instala as três vitrines curvas, inicialmente vazias. São seis lugares para bolos, doze para donuts e seis para éclairs. Os doces exibidos representam o estoque real e desaparecem conforme os clientes compram.

Leve **mel e ovos ao balcão lateral da padaria**, na seção ao lado da entrega de trigo. Cada ingrediente tem capacidade de oito unidades; trigo continua na seção própria. O painel de produção mostra a receita e o progresso. **1 mel + 1 ovo → 1 bolo + 1 donut + 1 éclair**, com **6 segundos de preparo na batedeira industrial ao lado do moinho**, seguidos do percurso de entrega. O confeiteiro mistura os ingredientes, leva a bandeja até as três vitrines e coloca cada doce no expositor correspondente. O estoque aumenta durante cada entrega; o retorno à batedeira é feito com a bandeja vazia. Não é preciso recolher os doces nem pedir ao repositor para transportá-los.

Cada lote prepara até um doce de cada tipo, somente para as vitrines com vagas: bolos cheios não impedem produzir donuts e éclairs. O preparo aguarda sem consumir insumos somente quando faltam mel ou ovos, ou quando todas as vitrines estão completas. Uma exclamação aparece sobre o confeiteiro quando há alguma vitrine vazia e falta mel ou ovos, exceto durante entregas. A pausa congela preparo, batedeira e percurso. Cada produto entra nos pedidos após sua primeira entrega. Clientes seguem as reações normais de falta de estoque. Compra, ingredientes, seleção dos doces do lote, progresso, percurso pendente e estoque são salvos; partidas anteriores recebem a confeitaria ainda não comprada.

Um único padeiro opera o processador no topo e o forno industrial na base, busca trigo e abastece a vitrine. Pães assados ficam pendentes até ele retirar a bandeja e colocá-los no expositor; somente então aparecem e ficam disponíveis para compra. Ele também completa qualquer vaga disponível: 16 / 18 ou 17 / 18 não impedem o trabalho. Cada trigo continua rendendo três pães. Se o lote não couber inteiro, os pães restantes ficam reservados e são entregues nas próximas vagas sem consumir outro trigo. Tanto a reserva quanto a entrega em andamento são salvas. O confeiteiro continua dedicado aos doces.

## Estacionamento no nível 16

Ao alcançar o nível 16, abra **Celular → Melhorias → Mercado → Estacionamento**. A construção custa **R$ 10.000**, pode ser comprada uma única vez e ocupa o terreno à esquerda da loja, entre o salão e a borda lateral do terreno, com acesso pela rua.

O estacionamento tem seis vagas demarcadas que começam vazias, setas de circulação, passagem pela calçada, canteiro central com arbustos, iluminação e placa de estacionamento. Parte dos compradores usa os carros que j? circulam na rua, preservando modelo, cor e tamanho. Cada motorista reserva uma vaga, estaciona com uma curva suave, abre a porta e caminha até a loja. Após comprar, volta ao mesmo carro, embarca, sai de ré e segue pela rua. A vaga só fica livre quando o carro vai embora; novas chegadas esperam quando o estacionamento está cheio. Rodas, direção, portas, piscas e luzes de freio e ré são animados. Os carros cedem passagem aos pedestres e coordenam o uso da rua com o trânsito e os veículos do banco.

Ocupa o terreno até perto da borda esquerda. O acesso usa o mesmo asfalto do estacionamento e fica centralizado nas duas faixas de entrada e saída. A vegetação que ocupava essa área é substituída durante a construção; a calçada e o meio-fio são recortados no acesso e o poste é movido para fora dele. O acesso à horta e a circulação pela calçada permanecem livres. Os carros presentes e o canteiro têm colisão. Viagens de clientes são transitórias, como as demais visitas à loja; ao recarregar, novas visitas começam com o estacionamento vazio.

Clientes que chegam de carro sempre pedem a capacidade máxima da cesta: **5 unidades**, independentemente da reputação da loja. O pedido pode repetir produtos e também fica completo quando inclui pão. Com estoque suficiente, compram as cinco unidades; se faltar mercadoria, seguem o tempo de espera e as reações normais do jogo, pagando somente o que encontraram. Pedestres mantêm seus pedidos variáveis por reputação.

A compra exige apenas o nível e o saldo; não depende da cozinha de geleias nem libera produtos adicionais. É salva com as demais melhorias. Partidas antigas recebem o estacionamento ainda não comprado, preservando saldo e progresso.

## Como jogar a fase artesanal

- A progressão continua a cada **25 clientes atendidos**, com bônus de R$ 100 por nível. O nível 16 acrescenta o estacionamento após a fase artesanal; a loja pode continuar funcionando e subindo de nível depois dele.
- A cesta de trabalho prepara o jogador para viagens maiores sem mudar o começo do jogo.
- A estufa de morangos exige a padaria. No nível 11, acrescenta um canteiro de 3,6 × 2,5 u à direita do curral e a quarta seção do hortifruti na parede esquerda. O salão ampliado no nível 9 permanece igual, sem anexo posterior. O identificador salvo continua sendo `alaArtesanal`.
- Morangos crescem a cada 3,4 segundos; a colmeia produz uma garrafa de mel a cada 5 segundos. Recolha o mel na bandeja inferior da colmeia. Cada origem guarda até 8 unidades. Abasteça morangos na seção de hortifruti à esquerda e mel na banca do anexo.
- A queijaria exige a estufa de morangos e a ala do leite. A queijaria fica na sala dos fundos direitos; o expositor refrigerado permanece ao lado do leite. Entregue **1 leite → 2 queijos**, em 5 segundos. O lote vale R$ 36, contra R$ 20 pela garrafa de leite vendida diretamente.
- O apiário do N12 fica à direita da estufa, alinhado com ela. O expositor de mel fica na frente direita do salão, sem nova ampliação. No N15, a geleia prolonga esse balcão para a esquerda, com estoque e reposição próprios.
- A cozinha de geleias exige o apiário. Fica ao lado da queijaria, na mesma sala dos fundos. O acesso para entrega e coleta fica aberto na lateral esquerda, sem porta. Os potes são vendidos na seção esquerda do balcão de mel e geleia, na frente direita. Entregue **2 morangos + 1 mel → 3 geleias**, em 6 segundos. O lote vale R$ 90, contra R$ 56 pelos ingredientes vendidos diretamente.
- Para entregar ingredientes, aproxime-se da oficina carregando-os. Cada ingrediente tem estoque de entrada de até 8 unidades. A etiqueta mostra ingredientes disponíveis, receita, progresso e produtos prontos. Depois, recolha o lote e leve-o à banca. O repositor também coleta e abastece produtos prontos; o jogador fornece os ingredientes das receitas.
- Uma oficina cheia pausa a produção sem consumir ingredientes: até 8 queijos ou 9 geleias aguardam coleta. As bancas comportam 12 unidades de cada produto.
- Os quatro novos produtos entram nos pedidos **após o primeiro abastecimento**. Depois disso, continue repondo para atender à demanda.
- A irrigação atende tomate, milho, trigo e morango. As oficinas, a colmeia, o galinheiro e o curral mantêm seus tempos próprios.
- Compras, estoques, ingredientes e progresso das receitas são salvos. Partidas anteriores recebem as novas construções bloqueadas, preservando o progresso existente.

## Desativadas

| Nível | Melhoria | Custo |
| --- | --- | --- |
| 1 | Mais capacidade | R$ 25 |
| 4 | Fertilizante | R$ 250 por aplicação |
| 5 | Velocidade do jogador | R$ 100 |
| 6 | Velocidade do repositor | R$ 100 |

## Conteúdo suspenso: referência da implementação anterior

<details>
<summary>Prateleiras, expansão e importações (desativadas)</summary>

Os níveis e instruções abaixo são históricos e não estão ativos no jogo. A nova etapa será reorganizada depois do nível 20, ainda sem desbloqueios definidos.

## Biscoitos e doces no nível 22

No nível 22, abra **Celular → Importar produtos → Biscoitos e doces**. Cada caixa com nove unidades custa **R$ 360**, e cada unidade vale **R$ 40**. Exige a expansão e pelo menos a primeira prateleira de importados.

Cookies de chocolate em caixa vermelha, biscoitos amanteigados em lata azul, balas de frutas em pacote verde e bombons em caixa dourada ocupam a face **−x da primeira gôndola, voltada ao hortifruti**. São quatro níveis com nove unidades cada, totalizando 36. A segunda estante do depósito recebe até quatro caixas dessa classe, incluindo pedidos a caminho. Caminhão, coleta, reposição manual e automática e vendas seguem o fluxo das demais importações. A reserva anterior de Higiene passa a receber Biscoitos e doces; não havia produtos de higiene disponíveis. Saves anteriores recebem a nova classe bloqueada, preservando dinheiro, estoques e pedidos pagos.

## Mantimentos no nível 21

No nível 21, abra **Celular → Importar produtos → Mantimentos**. Cada caixa de nove unidades custa **R$ 315**, e cada embalagem vale **R$ 35**. Exige a expansão e as duas prateleiras de importados. A classe reúne quatro variedades visuais: macarrão, feijão, arroz e farinha, com nove unidades de cada na gôndola cheia (36 no total).

Os mantimentos ocupam a face **−x da segunda gôndola**, de frente para os enlatados na face +x da primeira; cereais permanecem na face oposta, voltada à padaria. O corredor entre os móveis atende às compras e à reposição. A quarta estante do depósito recebe até quatro caixas dessa classe, contando entregas pendentes. Reutiliza caminhão, retirada e repositor. Saves anteriores recebem a classe bloqueada, preservando saldo, produtos e pedidos pagos.

## Importação de produtos no nível 19

No nível 19, abra o celular e selecione **Importar produtos**, imediatamente abaixo de **Melhorias**. O catálogo começa com **Enlatados**, por **R$ 270 por caixa de 9 unidades**. É necessário ter ao menos uma prateleira de importados e a expansão com depósito e pátio de carga. O estacionamento de clientes é independente.

Cada pedido confirmado gera **uma entrega de caminhão baú branco**. O caminhão surge à esquerda da rua, avança além do **acesso exclusivo**, para e entra de ré pela única faixa do pátio. A vaga mede **2,6 × 6,4 u**, com a cabine voltada para a rua e o baú para os fundos. As seis vagas e o acesso de clientes continuam funcionando durante a descarga; carros de clientes não usam o pátio privativo. O entregador desce da cabine, contorna a lateral até o baú, leva uma caixa por viagem até as estantes e retorna ao veículo. Terminada a descarga, o caminhão sai de frente pela mesma faixa e o próximo pedido pode chegar. As duas faixas da rua aguardam a manobra e são liberadas durante a descarga. Se o mercado estiver fechado, a chegada aguarda a abertura. Pausar congela a entrega.

O depósito tem **quatro estantes, uma por classe, com quatro pacotes de nove unidades cada** (16 posições físicas). As duas gôndolas têm duas classes cada, totalizando quatro classes. **Enlatados** está disponível no nível 19, **Cereais** no nível 20 **Mantimentos** no nível 21 e **Biscoitos e doces** no nível 22. Cereais usa a terceira estante do depósito e a face voltada à padaria na segunda gôndola, com capacidade de 36 unidades. As caixas têm quatro variedades com rótulos próprios. Para novas importações de cereais, instale a segunda gôndola; saves que já possuem cereais recebem esse móvel sem custo, preservando estoque e pedidos. Mantimentos usa a quarta estante e a face da segunda gôndola de frente para os enlatados; Biscoitos e doces usa a segunda estante e a face da primeira gôndola voltada ao hortifruti. Cada caixa ocupa uma posição até ficar vazia. Caixas já guardadas e caixas de pedidos pendentes contam no limite da própria classe; vagas de outra classe não podem ser usadas e não é possível pagar por mais mercadoria do que cabe. As estantes começam vazias e exibem somente os pacotes realmente entregues.

Os enlatados ocupam a face da primeira gôndola antes usada pelos cereais, voltada para a segunda gôndola. Retire os enlatados junto à primeira estante, identificada como Enlatados e leve-os à primeira gôndola, ou deixe o repositor fazer o transporte. Cada lata vale **R$ 30**, e a gôndola comporta **36 unidades**. O estoque não aparece na loja no momento da compra. O catálogo mostra unidades na gôndola e no depósito, ocupação e limite de quatro pacotes por classe e caixas a caminho. Monte o pedido com **−** e **+**, e confirme tudo de uma vez em **Finalizar pedido**; a cobrança ocorre somente se o pedido inteiro for válido.

Estoque, caixas parcialmente abertas e pedidos pagos são salvos. Recarregar durante a descarga retoma a viagem com as caixas restantes, sem nova cobrança ou duplicação. Saves sem depósito preservam os enlatados que já estavam na gôndola e recebem o depósito vazio. Saves com mais de quatro caixas da mesma classe mantêm o excedente em uma reserva de migração: caixas já entregues entram automaticamente na estante conforme surge uma vaga, e pedidos pagos aguardam espaço durante a descarga. O catálogo informa a reserva; novas compras ficam bloqueadas até haver capacidade, sem perda de unidades, inclusive caixas parcialmente abertas.

## Expansão no nível 18

No nível 18, abra **Celular → Melhorias → Mercado → Expansão**. A compra custa **R$ 10.000**, exige a padaria e pode ser feita uma única vez. Atingir o nível apenas libera a compra.

O salão original de **24 × 16 u**, seus expositores e a padaria mantêm suas posições. A compra acrescenta um **anexo de 6 u de profundidade atrás da loja e da cozinha**, levando o comprimento total do prédio a 22 u, conforme a [planta N18](PLANTA-LOJA-N18.svg). A porta de produção original dá acesso ao anexo; as paredes do salão ficam como divisórias.

A nova parede dos fundos tem uma saída para a fazenda, alinhada à porta de produção original. A abertura junto à cozinha fica fechada. As bancadas da queijaria e da cozinha de geleias recuam até encostar nessa parede; os pontos de entrega e coleta acompanham as bancadas. A mureta que ficava atrás delas é removida. A lateral direita permanece em uma única peça contínua. O piso novo ocupa apenas os espaços adicionais, preservando o piso já construído da cozinha.

A mesma compra constrói um **depósito de 12,4 × 6 u atrás do estacionamento**, com **uma única porta de enrolar voltada para as vagas**. Quatro estantes metálicas comportam quatro caixas de papelão por classe, com duas caixas em cada um dos dois níveis, deixando livre o piso de concreto diante delas. A entrada e os corredores são caminháveis; paredes e estantes têm colisão. No N18, as estantes ficam vazias; no N19, recebem as importações entregues pelo caminhão.

A expansão também acrescenta **12 u à esquerda do mapa**, ampliando o terreno para **52 × 46 u**. Nessa lateral fica o **pátio exclusivo de carga**, com asfalto, vaga demarcada em amarelo, setas de entrada/saída, placa com pictograma de caminhão e guias separando-o das vagas públicas. A rua e a calçada acompanham a nova largura, com um acesso próprio recortado para os caminhões. Um caminho pavimentado liga o pátio ao portão do depósito. Câmera, navegação e salvamento aceitam a nova área. Saves com a expansão comprada recebem tudo ao carregar, sem nova cobrança; o estacionamento de clientes não é necessário para receber entregas.

Quando o estacionamento também está comprado, o asfalto aumenta até encostar na fachada inteira do depósito e na parede esquerda da loja, eliminando a faixa de grama entre eles. O meio-fio posterior é removido, deixando o acesso ao portão contínuo; as seis vagas e a entrada pela rua mantêm suas posições.

Uma **passagem interna de 1,8 u de largura, sem porta**, conecta a lateral direita do depósito ao anexo dos fundos da loja. Ela fica diante da fileira de estantes e permite circulação nos dois sentidos. A abertura acompanha a compra da expansão e aparece também nos saves existentes.

O portão externo acompanha o funcionamento do mercado: suas lâminas descem suavemente até a soleira quando a loja fecha e se recolhem na caixa superior quando ela abre. O movimento congela durante a pausa. Fechado, o portão bloqueia o acesso pelo estacionamento; a passagem interna continua livre.

Toda a fazenda — tomate, milho, trigo, galinheiro, curral, estufa e apiário — recua 6 unidades, junto com a cerca e o caminho de coleta. O terreno cresce nos fundos para acomodar os cultivos. Estoques, ingredientes, produção e melhorias são preservados. Saves antigos recebem a expansão desmarcada; partidas com a compra mantêm a nova planta ao recarregar.

## Prateleiras de importados no nível 17

No nível 17, abra **Celular → Melhorias → Mercado** e compre a melhoria **Prateleiras de importados**. Ela tem dois níveis; cada nível custa **R$ 1.000** e instala uma prateleira, sem depender do estacionamento.

São duas gôndolas metálicas idênticas de 5,775 unidades, quatro níveis e dois lados, paralelas ao hortifruti no centro do salão e alinhadas pela frente com o balcão da padaria, conforme a [planta N17](PLANTA-LOJA-N17.svg). Os corredores dão acesso aos expositores posteriores e preservam a fila de dez clientes. Cada móvel e sua colisão aparecem somente após a respectiva compra.

As prateleiras permanecem vazias até o nível 19, quando a opção **Importar produtos** libera a compra recorrente de caixas de enlatados. O nível comprado das gôndolas é salvo; partidas antigas recebem a melhoria no nível 0, preservando dinheiro e progresso.


</details>
