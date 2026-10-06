# Mercadinho do Bairro

Um jogo de gerenciamento de mercadinho, em português, para navegador de computador e celular. Versão inicial **0.1.0**.

Colha produtos, abasteça as prateleiras, atenda clientes e reinvista nas melhorias. O cenário e os personagens são construídos por código, com visual 3D simples e original. Não usa imagens, áudios ou código extraídos de My Mini Mart.

## Jogar e desenvolver

Instale o **Node.js 22.12 ou mais recente**. No terminal, dentro desta pasta:

```bash
npm ci
npm run dev
```

Abra `http://localhost:4173`. Não abra `index.html` com duplo clique: o projeto usa módulos e precisa do servidor.

Em desenvolvimento (`npm run dev`), o botão **DEV** no canto superior direito zera todo o progresso e recarrega o jogo com um clique. Ele não aparece na versão de produção.

Para testar em um celular na mesma rede Wi-Fi, mantenha o servidor aberto e acesse `http://IP-DO-COMPUTADOR:4173` no navegador do celular. Autorize o acesso à rede local no firewall, se necessário.

## Controles

| Ação | Como fazer |
| --- | --- |
| Andar no celular | Toque e segure no cenário; arraste para escolher a direção. Solte para parar. |
| Andar com o mouse | Clique, segure e arraste no cenário. |
| Andar pelo teclado | W, A, S, D ou as setas. |
| Colher | Aproxime-se da horta, curral ou oficina pelo lado acessível desejado. |
| Repor | Aproxime-se da banca ou ilha fria do mesmo produto. |
| Vender | Sente-se na cadeira do caixa enquanto há clientes esperando. |
| Melhorar ou personalizar a loja | Sente-se na cadeira do escritório e use o computador. |
| Pausar | Botão de pausa ou Esc. |
| Som, ajuda e novo jogo | Menu de pausa. |

O joystick aparece onde você começa a arrastar. O movimento acompanha as direções da tela. As interações continuam automáticas junto aos objetos, por qualquer lado acessível, sem círculos no chão. As hortas, bancas e oficinas ficam mais afastadas para que os alcances de mercadorias diferentes não se cruzem. Paredes impedem interações através delas. Para produzir pão, entregue trigo junto à caixa da padaria.

## O que já funciona

- Tomates e milho nas hortas; um galinheiro que produz ovos e um curral que fornece leite em garrafas de vidro.
- Cesta com capacidade, animação de pegar e guardar os produtos e melhorias.
- Cesta cinza do jogador: capacidade inicial de 4 produtos e melhoria para 8.
- Clientes com percurso até a prateleira, fila, compra e saída.
- Dinheiro de jogo e contratação de caixa. O ajudante está temporariamente desativado.
- Objetivos progressivos, níveis, efeitos sonoros e pausa.
- Interface adaptada a celular em retrato e paisagem.
- Salvamento automático neste navegador a cada 5 segundos e ao sair da página.
- Cena com Three.js/WebGL 2 e desenho alternativo em Canvas 2D quando WebGL não está disponível.
- Fontes incluídas no projeto: não depende de Google Fonts em tempo de execução.

O salvamento usa `localStorage`: cada navegador e endereço tem seu próprio progresso. Não há sincronização de contas. Uma navegação privada ou limpeza dos dados do site pode apagar o jogo. O relógio da loja avança apenas enquanto a página está visível.

## Estrutura

```text
src/
  main.js                     Inicialização, laço do jogo e ligação dos módulos
  jogo/
    configuracao.js           Produtos, preços, mapa, melhorias e objetivos
    simulacao.js              Regras, movimento, estoque, clientes e funcionários
    cena.js                   Cenário, modelos, câmera e animações
    renderizador-compativel.js Desenho alternativo sem WebGL
    controles.js              Mouse, toque e teclado
    salvamento.js             Persistência local
    audio.js                  Efeitos sonoros sintetizados
  interface/
    interface.js              Painéis, cesta, objetivos e dinheiro
    estilos.css               Estilos e tamanhos de tela
    icones.js                 Ícones da interface
public/
  favicon.svg
tests/
  simulacao.test.js            Testes das regras e da economia
docs/
  COMO-ALTERAR.md              Guia de expansão
.github/workflows/
  publicar.yml                Publicação opcional no GitHub Pages
```

## Colocar no GitHub

1. Crie um repositório vazio no GitHub.
2. Extraia este ZIP e abra o terminal dentro da pasta.
3. Execute os comandos abaixo, substituindo a URL pela do seu repositório:

```bash
git init
git add .
git commit -m "Primeira versão do mercadinho"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Para publicar, abra **Settings → Pages → Build and deployment → Source → GitHub Actions** no repositório. O fluxo incluído publica a pasta `dist` a cada envio para `main`. Você também pode executá-lo manualmente pela aba **Actions**. A configuração `base: './'` permite servir o jogo dentro do caminho do seu repositório.

## Testar e gerar os arquivos finais

```bash
npm test
npm run build
npm run preview
```

`npm run build` gera `dist/`, pronta para uma hospedagem estática. As dependências e arquivos gerados são ignorados pelo Git. O ZIP contém o código-fonte, e as dependências são instaladas por `npm ci`.

## Expandir

Comece por [docs/COMO-ALTERAR.md](docs/COMO-ALTERAR.md). A simulação não importa Three.js nem elementos da página, o que permite testar a economia independentemente do visual.

Esta versão tem dez produtos e ampliações até a ala artesanal. A loja começa pequena: milho no nível 3, extensões de 3 unidades para ovos no nível 4, leite no nível 5 e trigo no nível 7, padaria no nível 9 e anexo artesanal no nível 11. Produtos e oficinas continuam sendo comprados separadamente conforme [os desbloqueios por nível](docs/DESBLOQUEIOS-POR-NIVEL.md).

O novo [layout da loja](docs/PLANTA-LOJA-V2.md) organiza bancas alinhadas, padaria ao fundo, fila marcada para cinco ou dez clientes e ilhas frias de leite e queijo. O leite mantém a mesma posição desde o nível 5. Painéis removíveis reservam futuras conexões; as próximas alas ainda dependem de conteúdo e ampliação do terreno. Salvamentos antigos preservam dinheiro, produtos, receitas e funcionários, com posições recuperadas em locais livres.

## Créditos e dependências

- Three.js: licença MIT.
- Vite: licença MIT.
- Outfit e DM Sans: SIL Open Font License, distribuídas por Fontsource.

As licenças das dependências acompanham seus pacotes. Nenhuma dependência paga é necessária.
