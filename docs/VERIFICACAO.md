# Verificação da versão 0.1.0

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
