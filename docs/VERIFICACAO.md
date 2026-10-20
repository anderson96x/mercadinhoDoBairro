# Verificação da versão 0.1.0

## Retirada da farinha — 0.50.2 — 19/10/2026

- A farinha da bandeja desaparece no mesmo quadro em que o saco carregado se torna visível e permanece ausente até o padeiro voltar ao moinho para a próxima coleta.
- A regressão impede que a farinha da bandeja e a farinha transportada apareçam simultaneamente. 235 testes e build passaram.

## Bandeja do moinho — 0.50.1 — 19/10/2026

- O moinho ganhou bica inclinada, bandeja metálica larga com base e três bordas elevadas, e uma porção de farinha maior dentro do recipiente.
- Os testes verificam a composição, o acabamento metálico e a permanência do conjunto dentro da padaria. 235 testes e build passaram.

## Transporte de farinha — 0.50.0 — 19/10/2026

- O padeiro do forno inicia o ciclo na saída do moinho, recolhe e leva um saco aberto de farinha ao forno, assa e troca a carga pela bandeja de pães antes de abastecer a vitrine.
- A regressão percorre ciclos completos e exige a exibição das duas cargas na ordem de produção. As regras e os campos persistidos não mudaram.
- 235 testes e build passaram.

## Transições dos padeiros — 0.49.4 — 19/10/2026

- A regressão acompanha cada quadro da parada e da retomada, exige deslocamento contínuo sem atravessar balcões e confirma que a direção do padeiro coincide com seu movimento.
- 235 testes e build passaram.

## Movimentos originais e alerta combinado — 0.49.3 — 19/10/2026

- 235 testes e build passaram. As regressões verificam os gestos originais de braços e corpo durante o trabalho, ritmo dos trajetos, espera no interior e a condição conjunta do alerta: trigo zero e pães zero. Um pão na vitrine já oculta as exclamações; trigo disponível também as oculta.
- Edge headless em 1280 × 900 e 390 × 844, WebGL e Canvas: conferidos vazio sem trigo, pão disponível sem trigo e retorno ao trabalho. Fixture isolada, sem salvamentos pessoais ou exceções JavaScript.
- Capturas do trabalho: [desktop](previews/padeiros-original-desktop-webgl.png), [celular](previews/padeiros-original-mobile-webgl.png), [desktop Canvas](previews/padeiros-original-desktop-canvas.png), [celular Canvas](previews/padeiros-original-mobile-canvas.png).

## Padeiros dentro da padaria — 0.49.2 — 19/10/2026

- Os dois pontos de espera ficam atrás da vitrine, dentro da área de trabalho; o teste exige folga de 0,3 u dos móveis, orientação ao centro da loja, alertas de trigo e repouso com movimento apenas das cabeças.
- 234 testes e build passaram. Edge headless em 1280 × 900 e 390 × 844, com WebGL e Canvas, confirmou os dois padeiros no interior sem exceções JavaScript. Fixture isolada, sem usar salvamentos pessoais.
- Capturas: [desktop](previews/padeiros-interior-desktop-webgl.png), [celular](previews/padeiros-interior-mobile-webgl.png), [desktop Canvas](previews/padeiros-interior-desktop-canvas.png), [celular Canvas](previews/padeiros-interior-mobile-canvas.png).

## Padeiros — 0.49.1 — 19/10/2026

- 234 testes passaram; build e rotas até o nível 17 concluíram. As regressões cobrem falta de trigo, vitrine sem espaço para uma fornada, farinha restante, cabeça e chapéu em repouso, transporte da primeira fornada, parada, retomada e pausa sem atravessar os balcões.
- Edge headless em 1280 × 900 e 390 × 844, usando WebGL e Canvas: sem trigo, os dois padeiros ficam diante da vitrine, voltados às prateleiras centrais e com exclamações; com insumos, retomam os roteiros; com 18 pães, voltam ao repouso sem alerta de trigo quando ainda há matéria-prima.
- Capturas: [sem trigo em desktop](previews/padeiros-sem-trigo-desktop-webgl.png), [sem trigo em celular](previews/padeiros-sem-trigo-mobile-webgl.png), [trabalho](previews/padeiros-trabalho-desktop-webgl.png), [vitrine cheia em Canvas](previews/padeiros-cheia-desktop-canvas.png). As doze combinações de estado, tamanho e renderizador ficam em `previews/padeiros-*.png`.
- Fixture isolada de padaria com estoque controlado e avanço da animação a 60 FPS, sem usar salvamentos pessoais. Nenhuma exceção JavaScript observada; conferência em aparelho físico não realizada.

## Trânsito reutilizado e fluxo misto — 0.46.1 — 16/10/2026

- **219 testes passaram**, incluindo os vinte modelos em escala original nas seis vagas, limites do piso, separação do canteiro e de carros grandes estacionados nas vagas vizinhas. `npm run build` concluiu com o aviso existente de pacote acima de 500 kB.
- O estacionamento recebe o próprio objeto do trânsito, preservando posição, escala, modelo e rodas. O teste impede criação de um carro substituto enquanto aguarda tráfego; valida retirada da lista da rua e remoção ao fim da visita.
- Compradores a pé e passantes continuam circulando durante construção, manobra, lotação e espera por um carro. A chance de uma visita de carro é de 35% quando há cesta, vaga e condições de entrada; as demais visitas seguem a chegada a pé.
- Edge headless com WebGL, 1200 × 900: um motorista em picape, quatro compradores a pé e um passante coexistiram. Cinco compras concluídas; a mesma picape, com escala original 1,1, estacionou, abriu a porta e foi embora. Nenhuma exceção JavaScript. [Prévia do fluxo misto](previews/estacionamento-fluxo-misto.png). Verificação em aparelho físico não realizada.

## Clientes de carro — 0.46.0 — 16/10/2026

- As seis vagas começam vazias. O teste completo percorre chegada, manobra, desembarque, caminhada, compra, pagamento, retorno ao mesmo carro, embarque, ré e partida. Também cobre lotação, loja fechada durante a chegada, pausa, espera por trânsito e pedestres, e salvamento sem duplicar produtos pagos.
- Rotas de entrada e saída de todas as vagas verificadas quanto a posição contínua, orientação, limites do asfalto e separação do canteiro central. A volta ao fundo e a aproximação à vaga reduzem a velocidade.
- **217 testes passaram**; `npm run build` concluiu com o aviso já existente de pacote acima de 500 kB.
- Edge headless com WebGL, 1200 × 900: estacionamento vazio, curva de estacionamento, porta aberta, desembarque, ré e saída conferidos sem exceções JavaScript; uma compra concluída no percurso. [Prévia da manobra](previews/estacionamento-clientes.png). Verificação em aparelho físico não realizada.

## Nova planta — nível 5 (leite) — 14/10/2026

- Referência posterior do jogador: o expositor baixo foi substituído por [refrigerador vertical de parede](previews/leite-e-ovos-n5.png), com duas portas de vidro, três prateleiras internas, puxadores, cabeçalho vermelho e ventilação inferior. Os 12 lugares foram distribuídos em três níveis; animações e etiqueta ajustadas. **42 testes de N5, expansão e personagens passaram**, incluindo apoio das garrafas e visibilidade por raios através do vidro, assim como o build. Detalhe e vista geral atualizados; móvel/Canvas abaixo registram o expositor baixo anterior. Posição, colisão, estoque e regras de venda foram preservados.

- [Entrega N5](PLANTA-LOJA-N5.md): curral em `(2,6; -21,7)`, inteiramente atrás da loja e à direita do galinheiro; refrigerador de 2,2 × 1,4 u em `(9,45; -8,45)`, junto aos ovos. A compra mantém salão, fachada e paredes iniciais. Vaca, cocho e garrafas cabem no curral de 3,4 × 3,2 u; garrafas no expositor ficam em quatro colunas/três fileiras acima da bandeja fria.
- **180 testes passaram**, sem falhas. Cinco casos novos verificam o SVG original e modelos, compra N5 por R$ 800 e conservação do salão, seleção exclusiva na divisória de ovos/leite com inventário misto, produção → coleta posterior → reposição → venda por R$ 20 com devolução de cesta e migração V7 → V8 com dinheiro, cargas e produção parcial preservados.
- `node scripts/check-store-layout.mjs`: rotas passaram nos níveis **1, 3, 4, 5, 7, 9, 11, 12, 13 e 15**. Móveis próximos exigem faixa exclusiva de seleção ou parede contínua; os demais mantêm alcances separados. A reserva legada de morangos foi afastada do corredor do curral; permanece bloqueada no N5.
- `npm run build`: concluído, com o aviso existente de pacote maior que 500 kB. `node scripts/render-floor-plan.mjs`: gerou N1, N3, N4 e [N5](PLANTA-LOJA-N5.svg).
- Edge headless, com estado N5 confirmado: [desktop](previews/nova-planta-n5.png), [vista geral](previews/nova-planta-n5-geral.png), [móvel 390 × 844](previews/nova-planta-n5-mobile.png), [Canvas 2D](previews/nova-planta-n5-canvas.png) e [leite junto aos ovos](previews/leite-e-ovos-n5.png). Nenhuma exceção JavaScript; largura móvel do documento e viewport iguais a 390 px. Fixture isolada com caixa/milho/ovos/leite comprados e estoques preparados para inspeção (quatro tomates/milhos e 12 ovos/garrafas); nenhum salvamento pessoal usado.
- A verificação cobre simulação, carregamento e apresentação. A oclusão aproximada do Canvas e testes humanos prolongados ou de gestos/desempenho em aparelho físico permanecem fora dessa validação. As expansões a partir do trigo ainda aguardam adaptação.

## Nova planta — nível 4 (ovos) — 14/10/2026

- Ajuste pela referência mais recente: [expositor aberto em degraus](previews/estante-ovos.png), com seis caixotes de madeira inclinados, dois por nível, estrutura escura e base de madeira. Os níveis recuam e sobem; cada um recebe quatro ovos. Teste de visibilidade por raios confirma que nenhum centro de ovo é ocultado pela estrutura na direção da câmera isométrica. Os **42 testes de N4, expansão e personagens passaram** com o novo modelo. Vista geral e detalhe atualizados; capturas móveis/Canvas abaixo registram a variante anterior.

- Referência posterior do jogador: a banca baixa foi substituída por [estante alta de três níveis](previews/estante-ovos.png), junto à mesma parede. Quatro ovos por prateleira, 12 no total; moldura metálica, fundo claro, base e cobertura escuras. Posição, colisão, capacidade e economia preservadas; alturas de reposição e etiqueta ajustadas. **42 testes de N4, expansão e personagens passaram**, assim como o build. Capturas N4 atualizadas em desktop, móvel e Canvas sem exceções JavaScript; viewport/documento móvel de 390 px. Para mostrar todos os níveis, esta fixture usa 12 ovos e quatro unidades dos outros produtos, com estoques preparados em perfil isolado.

- [Entrega N4](PLANTA-LOJA-N4.md): galinheiro em `(-2,4; -21,7)`, inteiramente atrás da loja e mais ao fundo/à direita do milho; banca de ovos em `(7,1; -8,45)`, na parede posterior à direita da porta. Piso, parede lateral e fachada mantêm o salão de 14 × 16 u. A antiga extensão não é desenhada nem modifica colisões no N4.
- **175 testes passaram**, sem falhas. Cinco casos novos cobrem posições extraídas do SVG original e modelos posteriores, compra N4 por R$ 500 sem exigir milho, percurso completo de produção → coleta → reposição → venda de ovo por R$ 15 com devolução de cesta, migração V6 → V7 com progresso e cargas e separação por parede contínua sem exceção para vãos. As expectativas antigas de expansão N4 foram substituídas por conservação do salão; a padaria permanece atrás no salão, porém à frente dos ovos agora encostados à parede posterior.
- `node scripts/check-store-layout.mjs`: rotas passaram nos níveis **1, 3, 4, 5, 7, 9, 11, 12, 13 e 15**. Os 19 alvos exigem separação de alcance entre móveis independentes ou parede contínua cobrindo toda a projeção compartilhada. A caixa futura de trigo foi afastada da banca de ovos, mantendo as demais instalações da padaria.
- `npm run build`: concluído; permanece o aviso existente de pacote JavaScript maior que 500 kB. `node scripts/render-floor-plan.mjs`: gerou os marcos N1, N3 e [N4](PLANTA-LOJA-N4.svg).
- Edge headless com estado N4 confirmado: [desktop 1440 × 1000](previews/nova-planta-n4.png), [vista geral](previews/nova-planta-n4-geral.png), [móvel 390 × 844](previews/nova-planta-n4-mobile.png) e [Canvas 2D forçado](previews/nova-planta-n4-canvas.png). Nenhuma exceção JavaScript; largura móvel do documento e viewport iguais a 390 px. Fixture isolada com caixa/milho/ovos comprados, quatro unidades de cada produto coletadas/repostas e fontes regeneradas. A captura Canvas confirma geometria e carregamento; a oclusão aproximada desse renderizador ainda oculta parte dos produtos sobre as bancas.
- Capturas e simulação não substituem uma partida humana prolongada nem testes de gestos/desempenho em aparelho físico. A adaptação de N5+ continua pendente.

## Nova planta — nível 3 (milho) — 14/10/2026

- [Entrega N3](PLANTA-LOJA-N3.md): milho em `(-9,2; -17,2)`, alinhado atrás dos tomates preservados em `(-9,2; -12,7)`. Os dois canteiros compactos medem 3,6 × 2,5 u, ficam inteiramente atrás da loja e mantêm 2 u livres entre si. A reserva do trigo foi deslocada para trás do milho; continua bloqueada até a compra própria. O salão não aumenta ao comprar milho.
- **170 testes passaram**, sem falhas. Cinco casos novos comparam o painel N3 do SVG original, validam nível/custo e compra única, conferem as oito espigas dentro do canteiro e as seções visíveis, percorrem colheita → reposição → duas vendas manuais com devolução das cestas e migram um save V5 com milho comprado e cargas preservadas para V6. As regressões de N1 e dos níveis posteriores também passaram.
- `node scripts/check-store-layout.mjs`: rotas de coleta, reposição, compra e retorno ao caixa passaram nos níveis **1, 3, 4, 5, 7, 9, 11, 12, 13 e 15**; os 19 alvos mantêm a separação entre móveis independentes.
- `npm run build`: concluído; permanece o aviso existente de pacote JavaScript maior que 500 kB. `node scripts/render-floor-plan.mjs`: gerou [N1](PLANTA-LOJA-N1.svg) e [N3](PLANTA-LOJA-N3.svg) da configuração real.
- Edge headless: [desktop 1440 × 1000](previews/nova-planta-n3.png), [vista geral](previews/nova-planta-n3-geral.png), [móvel 390 × 844](previews/nova-planta-n3-mobile.png) e [Canvas 2D forçado](previews/nova-planta-n3-canvas.png). Nenhuma exceção JavaScript; largura móvel do documento igual à viewport, 390 px. Partida de preparação isolada com caixa e milho comprados, colheita e reposição de quatro unidades de cada produto e tempo para regeneração das hortas. Nenhum salvamento pessoal foi usado.
- As capturas verificam carregamento e apresentação; gestos e desempenho em aparelho físico e uma partida humana prolongada não foram medidos. A adaptação completa dos demais painéis continua pendente.

## Nova planta — nível 1 — 14/10/2026

- Referência visual posterior: canteiro de tomates compactado para **3,6 × 2,5 u**, com oito plantas, atrás da loja. Após os pedidos de afastá-lo da parede e movê-lo mais à esquerda, passou para `(-9,2; -12,7)`, com coleta em `(-9,2; -10,9)`. As plantas têm margem de 0,7 u até as bordas e os volumes dos tomates ficam inteiramente dentro da terra. A cerca tem âncora independente para manter sua posição durante ajustes do canteiro. O jogador confirmou que a referência se aplica somente ao canteiro. Os **36 testes de N1, segurança espacial e personagens**, as rotas de todos os níveis e o build passaram com essa geometria. [Close-up atualizado](previews/horta-tomates.png).

- Estado inicial medido antes da implementação: **157 testes passaram** e `npm run build` concluiu, com aviso de pacote JavaScript acima de 500 kB.
- Entrega: [planta inicial e decisões](PLANTA-LOJA-N1.md). Salão de 14 × 16 u, terreno quadrado, porta posterior, escritório reposicionado, caixa acessível e banca modular de madeira. As expansões posteriores ainda seguem o modelo anterior, adaptado nas conexões.
- Correção da horta: comparação direta com o painel N1 do SVG original confirmou a produção na faixa posterior esquerda, inteiramente atrás da loja. O caminho lateral foi removido. Depois, a pedido do jogador, o lado curto passou de 1,5 para a largura original de **2,5 u**, ficando com 6,1 × 2,5 u e preservando a face de coleta. A versão espacial passou para 5, incluindo migração dos saves V4 da entrega incorreta.
- Verificação do ajuste de largura: **16 testes de N1 e segurança espacial passaram**, assim como as rotas em todos os níveis do verificador, o build e a regeneração da planta. As capturas foram atualizadas para o canteiro mais largo.
- Suíte completa após a correção de posição: **165 testes passaram**, sem falhas. Oito casos novos cobrem a posição extraída do SVG original, N1, compras e seções bloqueadas, divisórias com inventário misto, compras fora de ordem, migração V3/V4 → V5 idempotente e uma venda manual completa começando com R$ 0. Esse último percorre os alvos reais do mapa e devolve a cesta após a saída do cliente; não concede dinheiro ou estoque inicial adicional. A expectativa de formato foi atualizada para a largura pedida pelo jogador.
- `node scripts/check-store-layout.mjs`: rotas de coleta, reposição, compra e retorno ao caixa passaram nos níveis **1, 3, 4, 5, 7, 9, 11, 12, 13 e 15**. Móveis independentes mantêm separação; as seções contíguas do hortifruti usam colisão compartilhada e seleção exclusiva.
- `npm run build`: concluído; permanece o aviso anterior de pacote maior que 500 kB.
- `node scripts/render-floor-plan.mjs`: gerou [PLANTA-LOJA-N1.svg](PLANTA-LOJA-N1.svg) a partir da configuração implementada. O gerador agora produz o marco novo disponível; as plantas V2 permanecem históricas.
- Edge headless: conferidas a [vista inicial em 1440 × 1000](previews/nova-planta-n1.png), [vista geral com zoom afastado](previews/nova-planta-n1-geral.png), [tela móvel em 390 × 844](previews/nova-planta-n1-mobile.png) e [Canvas 2D forçado](previews/nova-planta-n1-canvas.png). **Nenhuma exceção JavaScript** durante as capturas; largura do documento móvel igual à viewport, 390 px. As capturas partem de salvamento limpo, com a banca vazia até ser abastecida. A vegetação de fundo passou a respeitar os pisos novos também no Canvas.
- As capturas verificam apresentação e carregamento. Gestos, desempenho em aparelho físico e uma partida humana prolongada não foram medidos. A implementação da planta completa até N15 continua pendente.

## Progressão artesanal até o nível 15 — 01/10/2026

- **15 testes novos passaram** em `tests/artesanal.test.js`: desbloqueios por nível, custo e requisitos, capacidade, produção renovável, receitas com conservação dos ingredientes, armazenamento cheio, pausa, salvamento, objetivos, vendas, rotas e repositor.
- Dez clientes simultâneos percorreram a loja ampliada, compraram produtos, pagaram e devolveram todas as cestas no teste de circulação. Esse teste mantém as bancas abastecidas para isolar a navegação; não mede o ritmo de uma partida humana.
- Suíte completa: **132 testes, 118 passaram e 14 falharam**. As mesmas 14 falhas foram reproduzidas em uma cópia limpa de `HEAD` antes das alterações (117 testes, 103 passaram). São expectativas antigas de objetivos, níveis, melhorias desativadas, restauração e aparência dos padeiros; nenhuma falha nova permaneceu.
- `npm run build`: concluído, com o aviso já existente de pacote JavaScript maior que 500 kB.
- Build aberto no Edge headless com uma partida de nível 15: cena e interface conferidas em **1440 × 1000** e **390 × 844**, sem exceções JavaScript. No tamanho móvel, não houve rolagem horizontal. O enquadramento desktop inclui o anexo e a fazenda; no celular, a câmera mantém o acompanhamento do personagem.
- A verificação em navegador cobre carregamento e apresentação da cena. Desempenho e gestos em aparelho físico e o ritmo de uma partida humana completa até o nível 15 não foram medidos.

## Galinheiro e extensão compacta — 29/09/2026

- `npm test`: 86 testes passaram, incluindo produção sem insumos, capacidade do galinheiro, coleta, reposição, venda, rotas e migração de salvamentos.
- `npm run build`: concluído; permanece o aviso de tamanho do pacote JavaScript.
- Terreno, rua, calçada e enquadramento desktop têm tamanho fixo desde o início. A loja cresce 3 unidades para acomodar a prateleira de ovos.
- O galinheiro fica na fazenda e o milho continua como produto independente.
- A nova geometria ainda precisa de revisão visual em desktop e celular. As verificações de navegador abaixo são históricas e não validam este novo layout.
- A fazenda foi deslocada 2,4 unidades para fora da loja, com terreno e calçada ampliados desde o início; o corredor entre a parede e as hortas tem rota automatizada verificada.
- As prateleiras mantêm a disposição escalonada: tomate e ovos na frente, milho atrás e centralizado entre ambos. Pontos de reposição e compra acompanham as posições.
- Os pequenos volumes de poeira junto à base do andaime foram removidos; sua aparência lembrava ovos. A animação da ala e a revelação do galinheiro e da prateleira mantêm o comportamento anterior.

## Regras automatizadas

Os seis testes de `npm test` passaram:

1. Colheita, reposição, compra, atendimento e pagamento com conservação dos produtos.
2. Limite da cesta e proteção do estoque quando a prateleira está cheia.
3. Compras de melhorias, saldo insuficiente, preço progressivo e limites.
4. Funcionários produzindo e vendendo sem o jogador perto.
5. Colisões, limites do mapa e pausa.
6. Restauração de salvamento incompleto ou com valores inválidos.

## Navegador

- Cena e interface conferidas em uma tela de 1363 × 936.
- Layout de celular conferido dentro de uma área de 390 × 844.
- Ajuda, abertura e fechamento dos painéis, pausa e melhorias com saldo insuficiente conferidos.
- Movimento por arraste, soltura do controle e acompanhamento da câmera conferidos.
- Ciclo real na interface: colheita de 3 tomates, reposição dos 3 produtos, atendimento e recebimento de R$ 24.
- Cesta e objetivos preservados ao recarregar a página.

O navegador de testes não ofereceu WebGL. A verificação visual utilizou o renderizador alternativo em Canvas 2D. O caminho WebGL foi compilado, mas suas sombras e seu desempenho não foram medidos nesse ambiente. O teste de tamanho móvel não substitui medir desempenho e toque em um aparelho físico.

As ferramentas opcionais para agentes são registradas apenas se `document.modelContext` existir. Essa API não estava disponível no navegador de teste; o jogo não depende dela.


## Nova planta N9 — 14/10/2026

Padaria na parede direita voltada ao hortifruti; salão 24 × 16 u. 188 testes passaram; rotas N1–N15 aprovadas. Revisão visual WebGL e Canvas 2D em `docs/previews/nova-planta-n9-*.png`. Migração V9 → V10 conserva produção e estoque. Tela móvel emulada; sem avaliação em aparelho físico.

Build de produção concluído (`npm run build`), com aviso de tamanho de chunk acima de 500 kB.


### Balcões e circulação da padaria

Área de trabalho ampliada, com pelo menos 2,3 u entre vitrine e máquinas e trajetos separados dos padeiros. Fechamento com balcões de madeira, tampos claros e bandejas de donuts, croissants e caracóis decorativos. Colisões seguem os balcões; acesso de trigo mantido. Layout V11. 188 testes e rotas N1–N15 passaram; capturas WebGL, Canvas 2D e tela móvel emulada atualizadas.


### Vitrines curvas da padaria

Pães distribuídos em três prateleiras internas de vidro, mantendo 18 posições de estoque e animações alinhadas. Doces decorativos protegidos por vitrines de dois níveis. Removida a decoração dos balcões do fundo. Capturas WebGL, Canvas 2D e móvel emulado atualizadas.
