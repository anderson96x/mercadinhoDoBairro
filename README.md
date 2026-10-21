# Mercadinho do Bairro

Jogo de gerenciamento de mercadinho em português, para navegadores de computador e celular. Versão **0.55.0**.

Colha produtos, abasteça as prateleiras, atenda clientes e reinvista nas melhorias. Comece vendendo tomates e avance até produzir pães, queijos e geleias, com dez produtos ao todo.

As bancas de hortifruti possuem placas para tomate, milho, trigo e morango, alinhadas à frente de cada seção e ampliadas pelo zoom da câmera.

A versão segue o formato **MAJOR.MINOR.PATCH**: mudanças incompatíveis em versões estáveis incrementam MAJOR, novas funcionalidades compatíveis incrementam MINOR e correções compatíveis incrementam PATCH. Durante o desenvolvimento inicial, o jogo permanece na série `0.x`, com mudanças incompatíveis e reformulações amplas contabilizadas em MINOR. Todo conjunto de alterações deve incrementar a versão, incluindo testes, ajustes visuais e ferramentas; alterações exclusivamente de documentação não exigem incremento nem entrada de versão no changelog. As demais mudanças sem impacto em execução usam PATCH. A versão é definida em `package.json` e exibida nos menus Ajuda e DEV. Mantenha `package-lock.json`, este README e o [histórico de alterações](CHANGELOG.md) sincronizados conforme as regras de [AGENTS.md](AGENTS.md). Registros históricos anteriores à regra permanecem preservados.

## Stack e construção do jogo

| Tecnologia | Uso no projeto |
| --- | --- |
| JavaScript com módulos ES | Regras do jogo, economia, movimento, produção e clientes. |
| Three.js 0.180.0 / WebGL 2 | Cena 3D, câmera, iluminação, sombras e animações. |
| Canvas 2D | Renderizador alternativo quando WebGL 2 não está disponível. |
| HTML e CSS | Interface, menus e adaptação a celular em retrato e paisagem. |
| Vite 7.1.7 | Servidor de desenvolvimento e empacotamento para hospedagem estática. |
| Web Audio API | Efeitos sonoros sintetizados no navegador. |
| `localStorage` | Salvamento do progresso no próprio navegador. |
| Fontsource | Fontes Outfit e DM Sans incluídas no projeto. |
| Node.js e `node:test` | Ferramentas de desenvolvimento e testes das regras do jogo. |

O jogo usa uma simulação própria, separada da renderização. Modelos, personagens e objetos são construídos por código com formas e materiais do Three.js. O laço principal usa `requestAnimationFrame`, com atualização da simulação em passos de 1/60 de segundo. A simulação cuida de colisões, busca de caminho, estoques, funcionários e vendas; a cena representa esse estado e a interface apresenta os controles e indicadores.

Não há backend nem contas de usuário. O jogo pode ser servido como arquivos estáticos, e as fontes não dependem de serviços externos durante a partida.

## Executar localmente

Use **Node.js 22.12 ou mais recente**. No terminal, dentro da pasta do projeto:

```bash
npm ci
npm run dev
```

Abra `http://localhost:4173`. O projeto usa módulos e precisa do servidor; abrir `index.html` diretamente não inicia o jogo corretamente.

Para jogar no celular pela mesma rede Wi-Fi, mantenha o servidor aberto e acesse `http://IP-DO-COMPUTADOR:4173`. Se necessário, autorize o acesso à rede local no firewall.

Em desenvolvimento, o botão **DEV** abre ferramentas para ajustar saldo, encher ou esvaziar todas as prateleiras, nível, reputação e eventos, além de reiniciar a partida. Ele não aparece na versão de produção.

## Como jogar

1. Vá até a horta e aproxime-se dos tomates para colher. Sua cesta começa com capacidade para **4 produtos**.
2. Leve os tomates até a seção correspondente da banca para abastecê-la. Colheita e reposição acontecem automaticamente por proximidade.
3. Sente-se na cadeira do caixa para atender os clientes que já fizeram suas compras e estão na fila.
4. Atenda **25 clientes por nível**. Cada nível concede **R$ 100 de bônus** e pode liberar novas compras.
5. Use o botão em formato de celular ao lado do painel superior para contratar funcionários, comprar produtos e melhorias ou personalizar a loja.
6. Continue abastecendo os produtos liberados e forneça ingredientes às estações de produção. O caixa contratado atende a fila; o repositor coleta e abastece produtos prontos.

Mantenha as bancas abastecidas e a fila andando: a satisfação dos clientes afeta a reputação e o ritmo de chegada de novos compradores. A loja começa com cinco cestas para clientes; a melhoria do nível 8 permite receber até dez clientes ao mesmo tempo.

Quando houver **R$ 1.000 ou mais no caixa**, solicite **Depositar no banco** pelo celular. O carro-forte recolhe o dinheiro, preservando seu saldo disponível para compras. Deixar dinheiro acumulado sem solicitar o depósito pode provocar um assalto.

## Controles

| Ação | Como fazer |
| --- | --- |
| Andar pelo teclado | W, A, S, D ou as setas. |
| Andar com o mouse | Clique, segure e arraste no cenário; solte para parar. |
| Andar no celular | Toque, segure e arraste no cenário; solte para parar. |
| Colher ou recolher produtos | Aproxime-se da origem do produto por um lado acessível. |
| Repor produtos | Aproxime-se do expositor correspondente carregando o produto. |
| Entregar ingredientes | Aproxime-se da estação de produção carregando os ingredientes. |
| Atender clientes | Sente-se na cadeira do caixa enquanto há clientes esperando. |
| Gerenciar e personalizar | Abra o botão de celular ao lado do painel superior. |
| Descartar produtos | Aproxime-se da lixeira e escolha os itens no painel. |
| Pausar | Botão de pausa ou Esc. |
| Som, ajuda e novo jogo | Menu de pausa. |

O joystick aparece onde você começa a arrastar, e o movimento acompanha as direções da tela. Aproxime-se do hortifruti pelo lado do corredor e dos demais objetos pelos lados livres. As interações respeitam paredes e obstáculos.

## Níveis e desbloqueios

Os níveis representam a evolução contínua da mesma loja. Atingir o nível libera a compra; é preciso pagá-la pelo celular e cumprir seus pré-requisitos. Os valores abaixo são dinheiro do jogo.

| Nível | Compra liberada | Custo | Efeito ou requisito |
| --- | --- | --- | --- |
| 1 | Tomates | Disponível no início | Colher, abastecer e vender. |
| 2 | Caixa | R$ 250 | Atende os clientes automaticamente. |
| 3 | Milho | R$ 350 | Acrescenta um novo cultivo e produto para venda. |
| 4 | Ala dos ovos | R$ 500 | Galinheiro produz ovos sem ingredientes. |
| 5 | Ala do leite | R$ 800 | Curral produz garrafas de leite sem ingredientes. |
| 6 | Repositor | R$ 900 | Coleta produtos prontos e abastece as prateleiras. |
| 7 | Ala do trigo | R$ 400 | Acrescenta trigo para venda ou produção de pão. |
| 8 | Mais cestas para clientes | R$ 100 | Adiciona cinco cestas, chegando a dez. |
| 9 | Padaria | R$ 1.400 | Produz pão; exige a ala do trigo. |
| 10 | Cesta de trabalho | R$ 400 | Capacidade de 8 produtos e +15% de velocidade. |
| 11 | Estufa de morangos | R$ 1.200 | Libera morangos; exige a padaria. |
| 12 | Apiário do bairro | R$ 850 | Produz mel; exige a estufa de morangos. |
| 13 | Queijaria | R$ 1.600 | Produz queijo; exige a estufa de morangos e a ala do leite. |
| 14 | Irrigação da fazenda | R$ 650 | Reduz em 25% o tempo dos cultivos; exige a estufa de morangos. |
| 14 | Reposição ágil | R$ 500 | Repositor anda 30% mais rápido; exige o repositor. |
| 15 | Cozinha de geleias | R$ 2.200 | Produz geleias; exige o apiário. |
| 16 | Estacionamento | R$ 10.000 | Seis vagas no terreno à esquerda da loja, com acesso pela rua, iluminação e canteiro central. |
| 17 | Prateleiras de importados | R$ 1.000 por nível | Duas prateleiras centrais; a primeira recebe importados no nível 19. |
| 18 | Expansão | R$ 10.000 | Acrescenta o anexo posterior e um depósito com estantes, caixas e porta única para o estacionamento; recua a fazenda e exige a padaria. |
| 19 | Importar produtos → Enlatados | R$ 270 por caixa | Caminhão entrega caixas de 9 enlatados no depósito, com 27 posições. Exige gôndola, expansão e estacionamento. |

O nível 19 é o último marco de conteúdo atual. Após instalar uma gôndola e comprar expansão e estacionamento, finalize pedidos de caixas de nove enlatados pelo celular. Cada pedido chega em seu próprio caminhão baú: ele aguarda as vagas ficarem livres, estaciona junto ao depósito e o entregador guarda uma caixa por viagem. As três estantes comportam 27 pacotes no total; pedidos pendentes também reservam posições. Jogador e repositor retiram os enlatados do depósito para abastecer a gôndola de 36 unidades. Cada lata é vendida por R$ 30. Caixas e pedidos pagos são preservados ao salvar, incluindo entregas parciais; estoques antigos na gôndola continuam disponíveis. A expansão do nível 18 acrescenta um anexo de 6 u nos fundos, recua bancadas e fazenda e conecta o depósito à loja. Veja a [planta N18](docs/PLANTA-LOJA-N18.svg) e os [desbloqueios por nível](docs/DESBLOQUEIOS-POR-NIVEL.md).

O estacionamento do nível 16 começa com seis vagas vazias. Clientes chegam de carro, estacionam, desembarcam e caminham até a loja; depois das compras, voltam ao próprio carro e saem de ré antes de seguir pela rua. Rodas, direção, portas, piscas e luzes acompanham as manobras.

## Produção e receitas

Tomate, milho, trigo e morango crescem nas hortas. Ovos, leite e mel são produzidos automaticamente nas suas origens; recolha-os e abasteça os expositores correspondentes.

| Estação | Ingredientes por lote | Resultado |
| --- | --- | --- |
| Padaria | 1 trigo | 3 pães |
| Queijaria | 1 leite | 2 queijos em 5 segundos |
| Cozinha de geleias | 2 morangos + 1 mel | 3 geleias em 6 segundos |

Entregue o trigo na caixa de entrada da padaria. Os pães abastecem o balcão pela própria produção. Na queijaria e na cozinha de geleias, entregue os ingredientes por proximidade, espere o lote ficar pronto e leve os produtos ao expositor. O repositor também transporta os produtos prontos; o jogador fornece os ingredientes.

As oficinas param quando a saída está cheia, sem consumir ingredientes adicionais. Morango, mel, queijo e geleia entram nos pedidos dos clientes após o primeiro abastecimento.

## Salvamento

O progresso é salvo automaticamente a cada **5 segundos** e ao sair da página. Cada navegador e endereço mantém sua própria partida em `localStorage`, sem sincronização entre dispositivos. Limpar os dados do site ou encerrar uma sessão privada pode apagar o progresso.

A simulação pausa quando a página fica oculta; não há produção enquanto o jogo está fechado. Para recomeçar, use **Pausa → Começar um novo jogo** e confirme a exclusão do progresso local.

## Organização do código

```text
src/
  main.js                     Inicialização, laço do jogo e ligação dos módulos
  jogo/
    configuracao.js           Produtos, preços, melhorias, receitas e objetivos
    simulacao.js              Regras, movimento, estoques, clientes e funcionários
    cena.js                   Modelos 3D, câmera e animações
    renderizador-compativel.js Renderização alternativa em Canvas 2D
    navegacao.js               Busca de caminho e verificação de trajetos
    controles.js              Mouse, toque e teclado
    salvamento.js             Persistência local
    audio.js                  Efeitos sonoros sintetizados
    banco.js                  Depósitos e coleta de dinheiro
    assalto.js                Eventos de assalto
    personalizacao.js         Aparência da loja e do jogador
  interface/                  Painéis, indicadores, ícones e estilos
public/                       Arquivos estáticos
scripts/                      Ferramentas de análise do jogo
tests/                        Testes de simulação, produção, controles e progressão
```

Para ajustar a economia ou adicionar conteúdo, comece por `src/jogo/configuracao.js`. As regras ficam em `src/jogo/simulacao.js`, os modelos em `src/jogo/cena.js` e os painéis em `src/interface/`. A simulação não depende de Three.js nem de elementos da página, permitindo testar suas regras separadamente do visual.

## Créditos e dependências

- Three.js e Vite: licença MIT.
- Outfit e DM Sans: SIL Open Font License, distribuídas por Fontsource.

As licenças acompanham os respectivos pacotes. Nenhuma dependência paga é necessária.
