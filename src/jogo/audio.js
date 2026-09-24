export class Sons {
  constructor() { this.contexto = null; this.ativo = false; }
  async ativar(ativo) {
    this.ativo = ativo;
    if (!ativo) return;
    try {
      this.contexto ||= new (window.AudioContext || window.webkitAudioContext)();
      await this.contexto.resume(); this.tocar('melhoria');
    } catch { this.ativo = false; }
  }
  tocar(tipo) {
    if (!this.ativo || !this.contexto || this.contexto.state !== 'running') return;
    const notas = tipo === 'venda' ? [660, 880, 1100] : tipo === 'melhoria' || tipo === 'missao' ? [523, 659, 784, 1046] : [tipo === 'colheita' ? 520 : 380];
    notas.forEach((nota, i) => {
      const inicio = this.contexto.currentTime + i * 0.08;
      const oscilador = this.contexto.createOscillator(), ganho = this.contexto.createGain();
      oscilador.type = 'sine'; oscilador.frequency.setValueAtTime(nota, inicio);
      ganho.gain.setValueAtTime(0, inicio); ganho.gain.linearRampToValueAtTime(0.04, inicio + 0.008); ganho.gain.exponentialRampToValueAtTime(0.001, inicio + 0.16);
      oscilador.connect(ganho); ganho.connect(this.contexto.destination); oscilador.start(inicio); oscilador.stop(inicio + 0.18);
    });
  }
}
