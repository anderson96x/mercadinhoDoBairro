// 72 mulheres e 72 homens, cada grupo com penteados e roupas próprios.
// A cor do cabelo segue uma paleta natural adequada a cada tom de pele.
const peles = [0xf6d1ae, 0xe7b38b, 0xc98c62, 0xa86b48, 0x75472f, 0x4c2f25];
const estilos = {
  mulher: {
    cabelos: ['chanel', 'afro_longo', 'coque', 'liso', 'rabo', 'ondas'],
    cabelosPeleEscura: ['afro_longo', 'afro_curto_feminino', 'afro_alto_feminino', 'coque_afro', 'rabo', 'liso'],
    roupas: ['vestido', 'blusa_saia'],
    acessorios: ['nenhum', 'brincos', 'lenco', 'colar']
  },
  homem: {
    cabelos: ['raspado', 'curto', 'afro_curto', 'degrade', 'topete', 'cacheado'],
    cabelosPeleEscura: ['afro_curto', 'afro_alto', 'cacheado', 'raspado', 'degrade', 'curto'],
    roupas: ['camisa', 'jaqueta'],
    acessorios: ['nenhum', 'gravata', 'bolso', 'nenhum']
  }
};
const coresRoupa = [0x72a9bb, 0xd7a35d, 0xa995c6, 0xd77c73, 0x6a9c7d, 0xe2b85c, 0x657ab0, 0xb96589];
const coresCabelo = {
  preto: 0x211d1b,
  castanho_escuro: 0x3e2c25,
  castanho: 0x6b452f,
  ruivo: 0xa6532f,
  loiro: 0xc9a76b,
  grisalho: 0x999a98
};
const cabelosPorPele = [
  ['preto', 'castanho_escuro', 'castanho', 'loiro', 'ruivo', 'grisalho'],
  ['preto', 'castanho_escuro', 'castanho', 'loiro', 'ruivo', 'grisalho'],
  ['preto', 'castanho_escuro', 'castanho', 'grisalho'],
  ['preto', 'castanho_escuro', 'castanho', 'grisalho'],
  ['preto', 'castanho_escuro', 'grisalho'],
  ['preto', 'castanho_escuro', 'grisalho']
];
const coresCalca = [0x344b58, 0x59473f, 0x384d3f, 0x424360, 0x756050];

export const APARENCIAS_CLIENTES = Object.freeze(Object.entries(estilos).flatMap(([genero, estiloGenero], grupo) =>
  peles.flatMap((pele, tom) => {
    const penteados = tom >= 4 ? estiloGenero.cabelosPeleEscura : estiloGenero.cabelos;
    return penteados.flatMap((cabelo, penteado) => estiloGenero.roupas.map((roupa, estilo) => {
      const tomCabelo = cabelosPorPele[tom][(penteado * 2 + estilo + grupo) % cabelosPorPele[tom].length];
      return Object.freeze({
        genero, pele, cabelo, roupa, tomCabelo,
        porte: (grupo + tom * 3 + penteado * 2 + estilo) % 8 === 0 ? 'corpulento' : 'regular',
        corRoupa: coresRoupa[(grupo + tom * 3 + penteado + estilo * 2) % coresRoupa.length],
        corCabelo: coresCabelo[tomCabelo],
        idoso: tomCabelo === 'grisalho',
        corCalca: coresCalca[(tom + penteado + estilo) % coresCalca.length],
        corSapato: (tom + estilo) % 3 === 0 ? 0x292e35 : 0xf4eadc,
        oculos: (tom + penteado + estilo) % 4 === 0 ? 'grau' : (tom * 2 + penteado + estilo) % 11 === 0 ? 'sol' : null,
        acessorio: estiloGenero.acessorios[(tom + penteado * 2 + estilo) % estiloGenero.acessorios.length]
      });
    }));
  })));
