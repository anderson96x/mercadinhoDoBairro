import { SUCOS } from './sucos.js';

export const SODA = {
  geladeira: { ...SUCOS.reservaGeladeira, movel: 'geladeira-soda' },
  cliente: { x: 2.2, z: -7.15 },
  deposito: { x: -14.35, z: -10.65, w: 1.5, d: 1.5 },
  coleta: { x: -13.05, z: -10.65 },
  unidadesCaixa: 24
};

export function posicaoCaixaSoda(indice) {
  return { x: SODA.deposito.x + (indice % 2 - 0.5) * 0.72,
    y: 0.23, z: SODA.deposito.z + (Math.floor(indice / 2) - 0.5) * 0.72 };
}
