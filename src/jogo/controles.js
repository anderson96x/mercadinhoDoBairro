export class Controles {
  constructor(superficie, joystick) {
    this.teclas = new Set(); this.vetor = { x: 0, y: 0 }; this.ponteiro = null;
    this.superficie = superficie; this.joystick = joystick; this.bloqueado = false;
    this.origem = { x: 0, y: 0 };
    const usadas = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
    window.addEventListener('keydown', e => {
      if (this.bloqueado || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (usadas.includes(e.key.toLowerCase())) { e.preventDefault(); this.teclas.add(e.key.toLowerCase()); }
    });
    window.addEventListener('keyup', e => this.teclas.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.limpar());
    superficie.addEventListener('pointerdown', e => {
      if (this.bloqueado || this.ponteiro !== null || e.button !== 0) return;
      this.ponteiro = e.pointerId;
      this.origem = { x: e.clientX, y: e.clientY };
      superficie.setPointerCapture(e.pointerId);
      joystick.style.left = `${e.clientX}px`; joystick.style.top = `${e.clientY}px`;
      joystick.classList.add('ativo'); e.preventDefault();
    });
    superficie.addEventListener('pointermove', e => {
      if (this.ponteiro !== e.pointerId || this.bloqueado) return;
      const dx = e.clientX - this.origem.x, dy = e.clientY - this.origem.y;
      const d = Math.hypot(dx, dy), raio = 48, escala = d > raio ? raio / d : 1;
      this.vetor = d < 5 ? { x: 0, y: 0 } : { x: dx * escala / raio, y: dy * escala / raio };
      joystick.firstElementChild.style.transform = `translate(${dx * escala}px, ${dy * escala}px)`;
    });
    const soltar = e => { if (this.ponteiro === e.pointerId) this.limpar(); };
    superficie.addEventListener('pointerup', soltar);
    superficie.addEventListener('pointercancel', soltar);
    superficie.addEventListener('lostpointercapture', soltar);
  }
  limpar() {
    this.teclas.clear(); this.ponteiro = null; this.vetor = { x: 0, y: 0 };
    this.joystick.classList.remove('ativo'); this.joystick.firstElementChild.style.transform = '';
  }
  ler() {
    if (this.bloqueado) return { x: 0, y: 0 };
    let x = (this.teclas.has('d') || this.teclas.has('arrowright') ? 1 : 0) - (this.teclas.has('a') || this.teclas.has('arrowleft') ? 1 : 0);
    let y = (this.teclas.has('s') || this.teclas.has('arrowdown') ? 1 : 0) - (this.teclas.has('w') || this.teclas.has('arrowup') ? 1 : 0);
    const d = Math.hypot(x, y);
    return d ? { x: x / d, y: y / d } : this.vetor;
  }
}
