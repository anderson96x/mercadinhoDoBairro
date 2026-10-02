# Como ajustar e expandir o jogo

## Regras rápidas

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
