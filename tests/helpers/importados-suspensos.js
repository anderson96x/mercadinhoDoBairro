import { MELHORIAS } from '../../src/jogo/configuracao.js';

// Exercita o conteúdo guardado para uma futura etapa, apenas no processo desta suíte.
// A suíte conteudo-suspenso.test.js verifica a configuração real do jogo.
export function reativarImportadosParaTeste() {
  for (const melhoria of MELHORIAS) {
    if (melhoria.tipo === 'importacao' || ['expansao', 'prateleirasImportados'].includes(melhoria.id)) melhoria.ativa = true;
  }
}
