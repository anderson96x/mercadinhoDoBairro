# Verificação da versão 0.1.0

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
