import { CONFIG } from './configuracao.js';
export function carregar() {
  try { return JSON.parse(localStorage.getItem(CONFIG.chaveSalvamento) || 'null'); }
  catch { return null; }
}
export function salvar(estado, clientes = []) {
  try {
    const copia = structuredClone(estado);
    // Produtos já retirados por clientes que ainda não pagaram voltam ao estoque.
    // Isso evita perda de mercadoria ao fechar ou recarregar a página.
    for (const c of clientes) if (c.quantidade && !['saindo', 'fim'].includes(c.fase)) {
      const p = copia.produtos[c.produto];
      p.prateleira = Math.min(12, p.prateleira + c.quantidade);
    }
    localStorage.setItem(CONFIG.chaveSalvamento, JSON.stringify(copia));
    return true;
  } catch { return false; }
}
