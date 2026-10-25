// Cada classe tem uma estante fixa. As demais estantes ficam reservadas para novos produtos.
export const PACOTES_POR_CLASSE = 4;
export const UNIDADES_PACOTE = 9;
export const CLASSES_PRODUTOS = {
  enlatados: { nome: 'Enlatados', estante: 0, gondola: 0, lado: 1, cor: 0xc98143 },
  higiene: { nome: 'Higiene', estante: 1, gondola: 1, lado: -1, cor: 0x5a9fa9 },
  cereais: { nome: 'Cereais', estante: 2, gondola: 1, lado: 1, cor: 0x69ad3c }
};
