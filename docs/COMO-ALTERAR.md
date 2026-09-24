# Como ajustar e expandir o jogo

## Regras rápidas

Abra `src/jogo/configuracao.js`. Ele concentra os ajustes mais frequentes:

| O que mudar | Onde |
| --- | --- |
| Dinheiro inicial | `CONFIG.dinheiroInicial` |
| Capacidade da cesta | `CONFIG.capacidadeInicial` |
| Velocidade | `CONFIG.velocidadeInicial` |
| Distância das interações | `CONFIG.raioInteracao` |
| Intervalo dos clientes | `CONFIG.intervaloClientes` |
| Limite de clientes | `CONFIG.maxClientes` |
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

1. Acrescente uma entrada em `PRODUTOS`, com nome, cor, preço, capacidade, tempo de crescimento e pontos do mapa.
2. Acrescente uma melhoria de `tipo: 'produto'`, com o mesmo identificador do produto, se ele começar bloqueado.
3. Adicione sua aparência em `criarProduto()` e, se necessário, em `construirEstacao()`, em `cena.js`.
4. Adicione seu ícone a `interface/icones.js` e as cores em `estilos.css`.
5. Ajuste a descrição acessível da cesta em `interface.js`, que inicialmente conta tomate e milho.
6. Acrescente os obstáculos físicos em `Simulacao.obstaculos()` e confira os corredores dos clientes e do ajudante.
7. Adicione um objetivo em `MISSOES`, se fizer sentido.
8. Atualize a lista de identificadores da ferramenta opcional `comprar_melhoria`, em `main.js`.
9. Se a estrutura salva mudou, incremente a versão e implemente a migração em `validarEstado()`; atualmente uma versão diferente inicia um jogo novo.

Os clientes escolhem entre os produtos liberados. O ajudante alterna entre eles. Essas partes usam o catálogo automaticamente.

## Alterar o mapa

As coordenadas usam `x` para os lados, `z` para a profundidade e `y` para a altura. A origem fica perto do centro da loja. O chão está em `y = 0` e o piso elevado da loja em aproximadamente `y = 0.2`.

Mantenha os pontos de coleta e reposição fora dos objetos sólidos. Os obstáculos do jogador estão em `Simulacao.obstaculos()`. Os clientes percorrem pontos definidos em `atualizarClientes()`. O ajudante usa um corredor direto entre horta e prateleira: novos obstáculos exigem adaptar esse percurso ou adicionar busca de caminho.

O navegador do celular acompanha o personagem com a câmera; em telas largas, mostra o conjunto da loja. Ajuste isso em `Cena.redimensionar()` e `Cena.atualizar()`.

## Adicionar uma melhoria

1. Declare título, descrição, custo e limite em `MELHORIAS`.
2. Aplique o efeito em `comprarMelhoria()` ou em um atributo derivado, como `capacidade` e `velocidade`.
3. Acrescente um caso de teste para compra válida, saldo insuficiente e limite.

O painel de melhorias lê o catálogo. Não é preciso criar um novo botão manualmente.

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
