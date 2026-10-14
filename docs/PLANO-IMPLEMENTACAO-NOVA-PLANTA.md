# Plano de implementação da nova planta do mercadinho

Data: 13/10/2026. **Status atualizado em 14/10/2026: implementação parcial, níveis 1 e 3 concluídos.**

Este documento descreve a substituição completa do layout pela planta enviada. A entrega do nível 1 está registrada em [PLANTA-LOJA-N1.md](PLANTA-LOJA-N1.md): salão inicial, terreno, escritório, acessos, caixa, banca modular e migração espacial. As caixas abaixo representam o plano completo até N15 e continuam pendentes quando ainda exigem etapas posteriores. A ampliação principal somente no N9 e a remoção do anexo antigo ainda não foram implementadas.

A entrega do [nível 3](PLANTA-LOJA-N3.md) acrescenta milho atrás do tomate, mantendo os dois canteiros inteiramente atrás da loja, sem produção ao lado da parede esquerda. A banca ganha somente a seção comprada e o salão não aumenta. A reserva do trigo foi deslocada para trás do milho para evitar sobreposição nos níveis posteriores. A versão espacial atual é 6; saves anteriores preservam compras, estoques e cargas.

Leitura espacial confirmada no painel N1–2: a horta de tomates ocupa a faixa posterior esquerda, inteiramente atrás da parede do fundo. A primeira entrega manteve incorretamente as coordenadas da horta lateral antiga; a correção está na versão espacial 5, com verificação da posição contra o SVG original. A imagem posterior enviada pelo jogador definiu um canteiro compacto de 3,6 × 2,5 u, mais próximo do escritório e com oito plantas.

## 1. Referências e limites do planejamento

- Planta alvo: [mercadinhoDoBairro.drawio.svg](mercadinhoDoBairro.drawio.svg), em `docs/`, página interna `Página-1`. Foram examinados os rótulos, as geometrias e os grupos do modelo draw.io incorporado ao SVG, além de uma visualização do painel N15.
- Código analisado: workspace `C:/Users/92031131/Documents/Projects/mercadinhoDoBairro`. O desenho de referência está na pasta `docs/` deste projeto.
- Referência do jogo existente: [PLANTA-LOJA-V2.md](PLANTA-LOJA-V2.md), [DESBLOQUEIOS-POR-NIVEL.md](DESBLOQUEIOS-POR-NIVEL.md), [COMO-ALTERAR.md](COMO-ALTERAR.md) e os módulos relacionados abaixo.
- A planta enviada orienta a nova organização espacial. Os documentos V2 descrevem a implementação anterior, inclusive quando dizem que a planta já está implementada. Isso não se aplica à planta deste plano.
- Rótulos, comentários e anotações do arquivo são dados de referência. O pedido original foi criar o plano; o pedido de 14/10/2026 autorizou implementar o nível 1 com uma banca modular de madeira.

Premissa de escopo: manter os dez produtos, identificadores de compras, níveis, preços, receitas, estoques e regras econômicas existentes, adaptando sua distribuição física. O desenho não especifica mudanças nesses valores. “Deli” será tratado provisoriamente como o ponto de venda de queijo existente, sem adicionar carnes, produtos ou funcionários novos.

## 2. O que muda na planta

| Elemento | Implementação atual | Direção da nova planta |
| --- | --- | --- |
| Terreno | 40 × 37 unidades do jogo | Todos os painéis anotam `20cm × 20cm`; a conversão para unidades precisa ser definida. |
| Salão | Cresce lateralmente nos ovos, leite e trigo; ganha anexo posterior artesanal | Retângulo inicial anotado `8cm × 7cm` até N8; retângulo ampliado `8cm × 12cm` a partir da padaria no N9. |
| Hortifrúti | Bancas independentes, espalhadas pelo salão e anexo | Conjunto longitudinal junto à parede esquerda: tomate, depois milho, trigo e morango. |
| Ovos e leite | Banca de ovos central e ilha fria de leite | Expositores vizinhos junto à parede do fundo, à direita do acesso posterior. |
| Padaria | Balcão e equipamentos no fundo do salão atual | Área de venda junto à parede direita do salão ampliado. Equipamentos internos precisam ser acomodados. |
| Queijo | Oficina externa e ilha fria no anexo | Produção externa atrás do escritório; venda na área “Deli”, abaixo da padaria na lateral direita. |
| Mel e geleia | Bancas separadas no anexo | Conjunto compartilhado na frente, à direita; a geleia aparece no N15. |
| Fazenda | Fontes distribuídas pela lateral e fundo | Tomate, milho e trigo em sequência na faixa posterior, todos atrás da loja; galinheiro, curral e morango também ao fundo; apiário abaixo do morango. |
| Cozinha de geleias | Oficina externa ao lado da queijaria | Produção externa junto à parede posterior da loja, aproximadamente atrás da região de ovos/leite. |
| Escritório | Canto posterior esquerdo | Mesmo papel e posição relativa; redimensionar conforme a nova escala e preservar acesso ao computador. |
| Acessos | Entrada frontal e acesso lateral à fazenda; acesso lateral do anexo | Entrada dupla frontal à esquerda e porta dupla posterior para a produção. Há outro símbolo junto ao escritório que exige interpretação. |
| Caixa | Balcão frontal com fila horizontal calculada | Balcão e cadeira próximos da frente, à direita da entrada; fila não está desenhada. |
| Reserva futura | Painéis A/B/C do layout em L | Grande área livre atrás da produção e espaço lateral no terreno. A planta não define novas compras para essas reservas. |

A nova planta não mostra o anexo artesanal em L. Portanto, mover apenas as coordenadas das bancas não resolve a mudança: é necessário substituir a lógica que associa compras a pisos, paredes, animações e câmera.

### Sequência de crescimento extraída do desenho

Nível é o momento de disponibilidade da compra, não uma ordem automática para construir. A loja deve continuar refletindo o que o jogador comprou.

| Painel | Mudança espacial esperada | Compra/regra existente a preservar |
| --- | --- | --- |
| N1–2 | Salão inicial, escritório, caixa, portas, tomate na lateral interna e horta externa | Tomate inicial; contratação do caixa no N2. |
| N3 | Milho na mesma região de hortifrúti e nova horta acima do tomate | `milho`; sem ampliar o salão. |
| N4 | Ovos no fundo e galinheiro na produção | `alaProducao`; sem a faixa lateral de piso antiga. |
| N5–6 | Leite ao lado dos ovos e curral no fundo | `alaLeite`; repositor no N6; sem a faixa lateral antiga. |
| N7–8 | Hortifrúti cresce para incluir trigo; horta de trigo acima do milho | `alaTrigo`; cinco cestas extras no N8. A fila de dez precisa caber antes da ampliação do N9. |
| N9–10 | Salão se amplia à direita; padaria na nova lateral | `alaPadaria` passa a acionar a ampliação principal; cesta de trabalho no N10. |
| N11 | Morango entra no hortifrúti; estufa na parte posterior direita | `alaArtesanal` mantém seu identificador salvo, mas deixa de criar o antigo anexo. |
| N12 | Apiário abaixo da estufa; expositor de mel na frente direita | `apiario`. |
| N13–14 | Queijaria atrás do escritório; “Deli” na lateral direita | `queijaria`; irrigação e reposição ágil no N14. |
| N15 | Cozinha externa de geleias; geleia compartilha o conjunto de venda do mel | `cozinhaGeleia`. |

O SVG contém **11 painéis, com N5–6 repetido duas vezes**. Tratar a repetição como referência duplicada até confirmar se representa uma variante, sem inventar uma compra adicional.

## 3. Decisões a fechar antes de fixar coordenadas

Estas pendências não impedem a elaboração deste plano. Devem ser resolvidas no início da futura implementação, antes de consolidar geometria e testes de posição.

| Pendência | Evidência / impacto | Proposta de partida |
| --- | --- | --- |
| Escala e orientação das medidas | O terreno tem geometria de 810 × 840 no draw.io, embora a anotação seja 20 × 20. O salão inicial mede 299 × 320 no modelo; o final, 490 × 320. Pixels e centímetros não coincidem exatamente. | Usar as medidas anotadas como proporção de projeto: largura 7 → 12, profundidade 8, terreno 20 × 20; escolher um único fator de unidades por cm após testar circulação. Não converter cm em metros nem copiar pixels como unidades. |
| Bancas compartilhadas | `Tomato / Corn / wheat / strawbeey` e `honey / jam` ocupam um retângulo por grupo | Um móvel visual com compartimentos por produto, estoques separados e alvos de interação próprios. Registrar outra regra caso o objetivo seja abastecer o móvel inteiro. |
| Símbolo circular junto ao escritório | O modelo o identifica como `doorRevolving`, mas não há legenda funcional | Confirmar se é uma porta giratória real ou apenas um símbolo representando outro objeto. Não transformá-lo silenciosamente em lixeira ou nova mecânica. |
| Quadrado ao lado do balcão | Sem rótulo; fica na posição compatível com cestas | Reservar provisoriamente para o suporte de cestas. Confirmar sua função e manter acesso ao caixa. |
| Deli | Nome genérico, disponível quando surge a produção de queijo | Mapear para `queijo` e manter armazenamento refrigerado; esclarecer se existe intenção de um novo departamento. |
| Padaria | Só o espaço de venda está indicado | Definir entrega de trigo, moinho, forno e circulação dos padeiros dentro da área correspondente. Não omitir a cadeia de produção existente. |
| Portas e circulação | A planta mostra porta posterior; o layout atual tem passagem lateral | Adotar a porta posterior como ligação com a produção. Não carregar a passagem lateral antiga automaticamente. Definir abertura, colisão e quem usa cada acesso. |
| Lixeira, fila e equipamentos omitidos | Não têm posição ou dimensões explícitas | Incluir lixeira acessível, computador, cadeira do escritório e fila para cinco/dez clientes, sem obstruir os elementos desenhados. |
| Áreas externas sem legenda | Há contornos e regiões hachuradas amplas | Tratar como reserva de terreno; definir acabamento e limites caminháveis. Não presumir que todos os contornos são paredes sólidas. |

## 4. Mapa técnico das alterações futuras

| Arquivo / área | Trabalho necessário |
| --- | --- |
| `src/jogo/configuracao.js` | Terreno, escala, regiões do salão, posições e orientação dos objetos, acessos, fila, estágios físicos, produtos e descrições das melhorias. |
| `src/jogo/bairro.js` | Piso inicial e ampliado, paredes, portas, escritório, caixa, cestas, andaimes, terreno, rua/calçada e decoração. Remover dependências do antigo L. |
| `src/jogo/estacoes.js` | Separar o volume sólido do móvel das regiões de interação de cada compartimento/produto. |
| `src/jogo/simulacao.js` | Compras e estágio, visibilidade lógica, obstáculos, interações, rotas, fila, repositor, recuperação de posições e migração. |
| `src/jogo/navegacao.js` | Verificar a grade de 0,4 u e o limite de 3.000 tentativas com as novas distâncias; alterar somente se as medições justificarem. |
| `src/jogo/cena.js` | Modelos e orientação das bancas, estoques visuais, produção, padeiros, animações, etiquetas, construção e enquadramento. |
| `src/jogo/renderizador-compativel.js` | Conferir projeção/ordenação dos mesmos modelos em Canvas 2D; corrigir somente o que a nova geometria exigir. |
| `src/jogo/salvamento.js` | Preservar a persistência e a devolução de produtos dos clientes; testar a integração com a migração em `validarEstado()`. |
| `src/jogo/trafego.js`, `coleta-banco.js`, `assalto-visual.js` | Ajustar percursos de veículos e personagens que dependem da rua, entrada e caixa. Verificar também os estados em `banco.js` e `assalto.js`. |
| `src/interface/interface.js`, `src/interface/producao.js`, `src/main.js` | Revisar instruções espaciais, mensagens, etiquetas e integrações de depuração afetadas. |
| `scripts/check-store-layout.mjs` | Atualizar os cenários, alvos e critérios de interação/circulação. |
| `scripts/render-floor-plan.mjs` | Gerar plantas a partir da nova definição, substituindo os limites e desenhos fixos do salão em L. |
| `tests/` e `docs/` | Atualizar contratos espaciais, testar regressões de comportamento e documentar os resultados reais. |

## 5. Passo a passo de execução

### Passo 1 — Registrar referência e estado anterior

- [ ] Incluir no versionamento o SVG de referência já disponível em `docs/mercadinhoDoBairro.drawio.svg`, preservando seu conteúdo original.
- [ ] Registrar as decisões da seção 3 e distinguir medidas confirmadas de ajustes necessários para jogabilidade.
- [ ] Capturar o jogo atual e guardar exemplos de saves antigos nos marcos N1, N5, N8, N9, N11 e N15; incluir estoques, cargas e receitas em andamento.
- [ ] Executar a suíte e o build existentes para registrar o estado inicial. Resultados históricos em documentos não substituem essa execução.

**Saída:** referência estável, decisões espaciais e dados para comparar comportamento e migração.

### Passo 2 — Definir a geometria canônica do novo mapa

- [ ] Escolher a escala única e a origem: `x` cresce para a direita da planta, `z` cresce em direção à rua, `y` continua sendo altura.
- [ ] Produzir uma tabela de coordenadas para terreno, salão inicial/ampliado, produção externa, escritório, portas, móveis e fontes.
- [ ] Para cada objeto, registrar identificador, centro `x/z`, largura, profundidade, rotação, volume de colisão, compra que o ativa e alvos de uso.
- [ ] Manter a frente e a esquerda do salão ancoradas durante a ampliação do N9. Preservar as posições anteriores sempre que o desenho permitir.
- [ ] Definir o comprimento do hortifrúti em cada etapa, incluindo seu crescimento para trigo e morango, sem invadir o escritório ou a entrada.
- [ ] Derivar limites do mundo e da câmera, rua e calçada dessa geometria. Registrar quais regiões são caminháveis desde N1.
- [ ] Centralizar esses dados em configuração compartilhada; usar um módulo dedicado ao layout se necessário. Evitar coordenadas diferentes na simulação, modelos e plantas geradas.

**Saída:** tabela de geometria completa e uma planta técnica por etapa. As dimensões ainda devem passar pelos critérios de circulação dos passos 5 e 6.

### Passo 3 — Separar compras de ampliação física

- [ ] Substituir a suposição de que todo aumento de `estagioLoja` adiciona uma das faixas laterais antigas.
- [ ] Derivar o salão físico das compras: inicial antes de `alaPadaria`, ampliado depois dela. Derivar fontes e compartimentos das respectivas compras.
- [ ] Preservar os IDs `alaProducao`, `alaLeite`, `alaTrigo`, `alaPadaria` e `alaArtesanal` para compatibilidade, mesmo que títulos e descrições mudem.
- [ ] Readequar `comprarMelhoria()`, `validarEstado()`, `limitesMundo`, `estacaoDesbloqueada()` e `bairro.atualizarEstagio()` ao novo modelo.
- [ ] Liberar morango no N11 sem construir o anexo antigo; ovos, leite e trigo não devem abrir faixas de piso por efeito colateral.
- [ ] Considerar compras adiadas e combinações permitidas pelos requisitos atuais. Não presumir que alcançar N15 significa possuir todas as melhorias.
- [ ] Planejar a migração junto desta alteração, antes de interpretar saves antigos usando os novos estágios.

**Aceite:** uma compra ativa apenas seus produtos, móveis e mudanças físicas; subir de nível sozinho não revela conteúdo não comprado.

### Passo 4 — Reconstruir terreno, salão e infraestrutura

- [ ] Refazer os pisos, revestimentos, paredes, rodapés e limites para o retângulo inicial e a ampliação lateral do N9.
- [ ] Remover do modelo novo as paredes/passagens e os painéis futuros exclusivos do anexo antigo.
- [ ] Posicionar escritório, mesa, cadeira, computador, estante e lixeira com acesso utilizável.
- [ ] Construir entrada frontal e acesso posterior à produção; alinhar vãos reais, animações e colisões das portas.
- [ ] Posicionar caixa, cadeira, suporte de cestas e área reservada ao funcionário conforme as novas âncoras.
- [ ] Ajustar ruas, calçadas, faixa de pedestres, bancos/postes e decoração para não ocupar rotas ou áreas produtivas.
- [ ] Refazer os andaimes e a revelação da ampliação. Durante a transição, manter rotas válidas e recuperar atores alcançados por novos obstáculos.

**Aceite:** a loja inicial é utilizável; a ampliação não deixa piso ausente, parede invisível ou parede antiga bloqueando a nova área.

### Passo 5 — Implementar os móveis e suas interações

- [ ] Construir o hortifrúti compartilhado com compartimentos independentes para tomate, milho, trigo e morango, ativados por compra.
- [ ] Criar o conjunto de mel/geleia com a mesma separação lógica por produto.
- [ ] Reposicionar ovos e leite no fundo; padaria e Deli na direita. Conferir orientação das frentes e acesso pelo salão.
- [ ] Separar identidade do móvel, colisão e alvo de interação. Um móvel compartilhado deve ter um volume sólido coerente, sem obstáculos sobrepostos para cada produto.
- [ ] Atualizar `geometriaEstacao()` e `interagir()` para selecionar o compartimento visitado de forma determinística; manter transferência de um produto por intervalo e estoque separado.
- [ ] Definir o comportamento nas divisórias entre compartimentos: não alternar produtos involuntariamente nem bloquear permanentemente um alvo por empate.
- [ ] Manter bloqueio de interação através de paredes. Ao ignorar a colisão do próprio móvel para alcançar seu alvo, não ignorar móveis vizinhos ou a parede atrás dele.
- [ ] Recalcular pontos de coleta, reposição e compra, incluindo alternativas para clientes simultâneos. Posições devem ficar no lado acessível do móvel.
- [ ] Adequar etiquetas, orientação dos produtos expostos e trajetórias das animações de pegar/guardar aos compartimentos.

**Atenção:** hoje `interagir()` cancela a ação quando os dois candidatos mais próximos diferem menos de 0,1 u. Os testes também exigem separação superior a `2 × 0,9 u` entre todas as estações. Copiar a mesma geometria para vários produtos tornaria o móvel compartilhado inutilizável. É preciso substituir esse contrato por um teste de seleção correta de compartimentos, mantendo a proteção entre estações independentes.

**Aceite:** com inventário misto, o jogador abastece somente o compartimento escolhido; produtos bloqueados não aparecem nem recebem estoque; clientes retiram o item correto. Móveis junto às paredes exigem acesso pelos lados livres, não por um número fixo de lados.

### Passo 6 — Validar navegação, fila e operação do caixa

- [ ] Atualizar `obstaculos()` e `obstaculosCliente()` para consumir apenas paredes e móveis ativos, com folga correspondente ao corpo dos atores.
- [ ] Recalcular ida e volta entre entrada, cestas, cada compartimento, caixa e saída; testar também escritório e produção externa.
- [ ] Definir a fila explicitamente para cinco e dez clientes. A fórmula atual usa uma linha em `x = clienteCaixa.x + indice × espacoClientes`; verificar se cabe ou substituir por uma sequência de pontos.
- [ ] Garantir dez posições funcionais no salão ainda pequeno do N8, sem ocupar a expansão não comprada, a entrada ou o hortifrúti.
- [ ] Validar jogador, repositor e clientes juntos nas portas e corredores. Evitar que a rota de um cliente use a fazenda como atalho indevido, conforme a regra escolhida para os acessos.
- [ ] Invalidar caminhos quando compras alterarem móveis/portas e recuperar personagens sem apagar cargas.
- [ ] Medir caminhos longos e congestionamento antes de ajustar a grade ou o orçamento de busca de `navegacao.js`.

**Aceite:** todos os alvos ativos têm rotas de ida e volta em cada etapa; dez clientes concluem compras, pagam e devolvem cestas sem bloqueio permanente.

### Passo 7 — Reposicionar produção e manter as cadeias completas

- [ ] Distribuir hortas de tomate, milho e trigo inteiramente atrás da loja; galinheiro, curral e estufa na faixa posterior; apiário abaixo da estufa.
- [ ] Posicionar queijaria atrás do escritório e cozinha de geleias atrás da região de ovos/leite, com espaço real para entrega e coleta.
- [ ] Garantir caminho externo entre todas as fontes, as oficinas e a porta posterior; a abertura de uma oficina não pode isolar fontes antigas.
- [ ] Acomodar entrada de trigo, moinho, forno, balcão e movimentos dos padeiros na nova padaria da lateral direita.
- [ ] Preservar trigo → farinha → pão, leite → queijo e morango + mel → geleia, incluindo pausas por estoque cheio e progresso parcial.
- [ ] Manter o fluxo atual do pão, produzido para o balcão, sem inventar coleta e reposição manual de pão.
- [ ] Revisar destinos do repositor e animações de coleta/entrega. Preservar a regra atual de que o jogador fornece os ingredientes das oficinas.
- [ ] Conferir bandeja de mel, etiquetas das receitas, pontos de saída dos produtos e ausência de coleta/entrega involuntária em corredores de passagem.

**Aceite:** cada produto completa o ciclo produção → abastecimento → compra → pagamento no layout novo, conservando ingredientes, unidades e dinheiro.

### Passo 8 — Integrar eventos da rua e sistemas auxiliares

- [ ] Atualizar as âncoras do carro-forte, coletor de valores, carro do assalto e assaltante conforme rua, porta e caixa novos.
- [ ] Conferir percursos interpolados e coordenadas fixas em `coleta-banco.js` e `assalto-visual.js`; mudar apenas `CONFIG.entrada` pode não atualizar a rota inteira.
- [ ] Verificar funcionamento do escritório, portas, descarte na lixeira, contratação do caixa e personalização dos materiais.
- [ ] Manter transações e temporizações de banco/assalto; adaptar geometria sem alterar seus valores econômicos.

**Aceite:** personagens de eventos chegam aos destinos corretos sem atravessar móveis ou paredes, e os estados financeiros continuam consistentes.

### Passo 9 — Concluir visual, câmera e compatibilidade

- [ ] Remover dependências de coordenadas antigas em `cena.js`: modelos, etiquetas, mãos dos personagens, padeiros e animações de construção.
- [ ] Enquadrar terreno e loja por região ativa, sem usar os limites do anexo removido.
- [ ] Conferir acompanhamento do jogador no celular, limites da câmera e orientação do movimento por toque/mouse/teclado.
- [ ] Testar paredes, móveis encostados, portas e etiquetas em WebGL e Canvas 2D; revisar camadas `userData.fundo` quando necessário.
- [ ] Conferir legibilidade dos compartimentos, área de produção posterior e caixa em desktop, retrato e paisagem.

**Aceite:** layout e interações são compreensíveis nos dois renderizadores; câmera e interface permitem alcançar e enxergar todas as áreas úteis.

### Passo 10 — Finalizar a migração dos salvamentos

- [ ] Incrementar `CONFIG.versaoLayout` de **3 para 4**, se nenhuma outra mudança a tiver incrementado antes. Preservar a chave `mercadinho-do-bairro-v1` e a versão do formato enquanto o formato continuar compatível.
- [ ] Traduzir compras antigas para a nova geometria, sem cobrar novamente e sem conceder compras que não existiam. Não confiar no `estagioLoja` antigo como descrição física do novo mapa.
- [ ] Preservar dinheiro, saldo no caixa/banco, estatísticas, reputação, personalização, compras, produtos apresentados, estoques, inventários, ingredientes e progresso da produção.
- [ ] Reposicionar jogador e repositor em locais livres e conectados, recalculando destinos e caminhos. A recuperação atual do repositor não usa a mesma verificação de versão espacial do jogador; tratar ambos explicitamente.
- [ ] Rever posições e rotas dos clientes preservados em `clientesAssalto` e a continuidade de coleta bancária/assalto em andamento.
- [ ] Manter a devolução dos itens de clientes transitórios prevista em `salvamento.js`, sem duplicação nem perdas introduzidas pela migração.
- [ ] Testar saves sem `versaoLayout`, saves da versão 3 e saves já migrados; o segundo carregamento não pode reaplicar efeitos ou alterar estoques.

**Aceite:** partidas antigas continuam jogáveis com o mesmo progresso; ninguém surge dentro de uma parede, móvel ou área desconectada.

### Passo 11 — Atualizar textos e instruções do jogo

- [ ] Rever títulos e descrições que ainda prometem uma “ala dos ovos”, uma faixa lateral ou o anexo artesanal quando a compra agora instala equipamentos no salão existente.
- [ ] Corrigir mensagens de expansão, ajuda, objetivos e instruções como “à esquerda do balcão” para apontarem para os novos locais.
- [ ] Manter os IDs técnicos antigos nos saves, usando nomes visíveis coerentes com a nova experiência.
- [ ] Conferir painel de produção, etiquetas de estoque e lista de melhorias com a nova organização.

**Aceite:** o jogo orienta o jogador para lugares que existem e descreve corretamente o efeito de cada compra.

### Passo 12 — Atualizar e executar as verificações

- [ ] Atualizar `layout.test.js`, `seguranca-layout.test.js` e `expansao.test.js` para a nova planta, preservando verificações de segurança e conectividade.
- [ ] Revisar `cestas.test.js`, `camera.test.js`, `controles.test.js` e `lixeira.test.js` para os novos acessos e âncoras.
- [ ] Verificar `trigo.test.js`, `padaria.test.js`, `artesanal.test.js` e `producao-painel.test.js` com compras, produção e abastecimento reais.
- [ ] Rodar regressões de simulação, banco, assalto, tráfego, personalização, personagens e animações. Adicionar casos novos somente onde houver comportamento novo ou risco real de regressão.
- [ ] Ampliar `check-store-layout.mjs` para cobrir compartimentos, fila, escritório, portas, fontes e oficinas, sem exigir separação física impossível dentro de um móvel compartilhado.
- [ ] Verificar N1, N3, N4, N5, N7, N8, N9, N11, N12, N13 e N15, além de efeitos funcionais nos N2, N6, N10 e N14.
- [ ] Exercitar as compras em sequência e combinações válidas fora da sequência ideal; incluir expansão com clientes presentes e recarregamento após cada mudança física.

Comandos previstos para a implementação, a partir da raiz do projeto:

```powershell
node scripts/check-store-layout.mjs
npm test
npm run build
```

**Aceite:** verificações automatizadas passam; eventuais falhas anteriores são identificadas separadamente. Não registrar uma quantidade de testes com base nos documentos antigos.

### Passo 13 — Conferir jogabilidade e apresentação no navegador

- [ ] Comparar a vista superior e a vista de jogo com os painéis da planta, especialmente N1, N8, N9 e N15.
- [ ] Jogar colheita, reposição e venda no início sem dinheiro artificial; confirmar que o tomate e o caixa são alcançáveis desde o primeiro momento.
- [ ] Exercitar dez clientes antes e depois da ampliação; conferir fila, cestas e acesso ao funcionário.
- [ ] Percorrer todas as fontes e oficinas carregando inventário misto; conferir seleção de produto e retorno ao salão.
- [ ] Testar pausas, abertura/fechamento da loja, compras, recarregamento, banco e assalto com a geometria nova.
- [ ] Conferir desktop e celular em retrato/paisagem; registrar separadamente emulação de tela e teste de toque/desempenho em aparelho físico.
- [ ] Medir efeito das novas distâncias sobre abastecimento e espera dos clientes. Se houver necessidade de rebalanceamento, registrá-la como decisão separada da troca de layout.

**Aceite:** revisão visual corresponde à planta e uma partida funciona sem atalhos de depuração para contornar problemas de circulação.

### Passo 14 — Regenerar documentação e encerrar a implementação

- [ ] Atualizar `render-floor-plan.mjs` e gerar a planta geral e as etapas a partir da geometria implementada:

```powershell
node scripts/render-floor-plan.mjs
```

- [ ] Publicar no repositório a documentação do novo layout; identificar claramente a V2 como histórica ou substituí-la com referências consistentes.
- [ ] Atualizar `DESBLOQUEIOS-POR-NIVEL.md`, `COMO-ALTERAR.md`, `README.md` e as imagens de etapas/crescimento, removendo promessas de ampliações que deixaram de existir.
- [ ] Substituir capturas antigas por evidências dos marcos novos e registrar comandos/resultados em `VERIFICACAO.md`.
- [ ] Revisar o diff final: coordenadas antigas só devem permanecer em migração, referência histórica ou elementos que comprovadamente ainda as utilizem.

**Aceite:** código, plantas geradas, instruções e capturas descrevem o mesmo layout.

## 6. Ordem recomendada e conclusão

Executar os passos na ordem apresentada. Preparar os casos de teste e a migração junto das alterações correspondentes, usando os passos 10 e 12 para consolidar e validar o conjunto. Não adiar a definição de compartimentos até depois de posicionar os produtos: ela determina a escala, os corredores e a navegação.

A implementação só estará completa quando:

- [ ] Todos os painéis únicos tiverem uma etapa equivalente no jogo, respeitando as compras efetivamente realizadas.
- [ ] O crescimento físico ocorrer conforme o desenho, com salão ampliado no N9 e sem o antigo anexo em L.
- [ ] Os dez produtos, as três cadeias de transformação, o repositor e o caixa funcionarem nos novos lugares.
- [ ] Compartimentos compartilhados não misturarem estoques nem causarem interações ambíguas.
- [ ] Fila de dez, portas, escritório, produção externa e eventos da rua tiverem circulação válida.
- [ ] Saves anteriores preservarem progresso e forem recuperados em posições válidas.
- [ ] Testes, build, revisão visual e documentação estiverem concluídos com evidências atuais.

**Validação deste planejamento:** inspeção do SVG, de sua geometria incorporada e do código existente. Nenhum teste de implementação, build ou regeneração das plantas do jogo foi executado para criar este documento.
