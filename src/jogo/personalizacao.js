export const PALETAS = [
  { id: 'horta', nome: 'Horta fresca', principal: '#286750', destaque: '#e7b65a', parede: '#f1ead7', piso: '#e3dcc8' },
  { id: 'terracota', nome: 'Terracota', principal: '#a8513b', destaque: '#e3ad76', parede: '#f4e5d4', piso: '#ded0ba' },
  { id: 'oceano', nome: 'Oceano', principal: '#316878', destaque: '#eca66e', parede: '#e8eff0', piso: '#cedce0' },
  { id: 'lavanda', nome: 'Lavanda', principal: '#71618e', destaque: '#d5b26d', parede: '#eee8f1', piso: '#dad3e1' },
  { id: 'mostarda', nome: 'Sol da manhã', principal: '#99702b', destaque: '#679386', parede: '#f5efda', piso: '#e7dcc0' },
  { id: 'cereja', nome: 'Cereja', principal: '#934856', destaque: '#d6ad82', parede: '#f4e7e4', piso: '#e4d1cb' },
  { id: 'menta', nome: 'Menta', principal: '#427c70', destaque: '#eea891', parede: '#e7f1e7', piso: '#d4e0d3' },
  { id: 'noite', nome: 'Azul da noite', principal: '#344663', destaque: '#d7b16b', parede: '#ece9df', piso: '#d4d5d4' }
];
export const PERSONALIZACAO_PADRAO = { nome: 'Mercadinho do Bairro', slogan: 'Da horta para sua mesa', paleta: 'horta' };
export function validarPersonalizacao(dados) {
  const texto = (valor, padrao, limite) => typeof valor === 'string' ? valor.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limite) || padrao : padrao;
  return {
    nome: texto(dados?.nome, PERSONALIZACAO_PADRAO.nome, 32),
    slogan: texto(dados?.slogan, PERSONALIZACAO_PADRAO.slogan, 60),
    paleta: PALETAS.some(p => p.id === dados?.paleta) ? dados.paleta : PERSONALIZACAO_PADRAO.paleta
  };
}
