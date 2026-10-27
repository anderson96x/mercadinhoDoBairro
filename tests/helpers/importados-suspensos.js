import { MELHORIAS } from '../../src/jogo/configuracao.js';

// Reproduz o catálogo anterior apenas no processo das suítes históricas.
// importacoes-pares.test.js verifica as compras e os requisitos atuais.
export function reativarImportadosParaTeste() {
  for (const melhoria of MELHORIAS) {
    if (['prateleiraBiscoitosEnlatados', 'prateleiraMantimentosCereais'].includes(melhoria.id)) melhoria.ativa = false;
    if (melhoria.tipo === 'importacao' || ['expansao', 'prateleirasImportados'].includes(melhoria.id)) melhoria.ativa = true;
    if (melhoria.tipo === 'importacao') {
      melhoria.nivelMinimo = { importarProdutos: 19, importarCereais: 20, importarMantimentos: 21, importarDoces: 22 }[melhoria.id];
      melhoria.requisitoMelhoria = 'prateleirasImportados';
    }
  }
}
