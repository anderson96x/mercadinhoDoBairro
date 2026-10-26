// Cada classe tem uma estante fixa e uma face exclusiva nas gôndolas.
export const PACOTES_POR_CLASSE = 4;
export const UNIDADES_PACOTE = 9;
export const CLASSES_PRODUTOS = {
  enlatados: { nome: 'Enlatados', estante: 0, gondola: 0, lado: 1, cor: 0xc98143 },
  doces: { nome: 'Biscoitos e doces', estante: 1, gondola: 0, lado: -1, cor: 0xc74352 },
  mantimentos: { nome: 'Mantimentos', estante: 3, gondola: 1, lado: -1, cor: 0xe5b933 },
  cereais: { nome: 'Cereais', estante: 2, gondola: 1, lado: 1, cor: 0x69ad3c }
};
