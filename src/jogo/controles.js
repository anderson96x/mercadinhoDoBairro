export class Controles {
  constructor(superficie, joystick, moverCamera = () => {}, ajustarZoom = () => {}) {
    this.teclas = new Set(); this.vetor = { x: 0, y: 0 }; this.ponteiro = null;
    this.superficie = superficie; this.joystick = joystick; this.bloqueado = false;
    this.moverCamera = moverCamera; this.ajustarZoom = ajustarZoom; this.ponteiroCamera = null;
    this.toques = new Map(); this.arrastandoComDoisDedos = false; this.ultimoGesto = null;
    this.origem = { x: 0, y: 0 };
    const usadas = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
    window.addEventListener('keydown', e => {
      if (this.bloqueado || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const tecla = e.key.toLowerCase();
      if (e.shiftKey && tecla.startsWith('arrow')) {
        e.preventDefault(); this.teclas.delete(tecla);
        this.moverCamera((tecla === 'arrowleft' ? 1 : tecla === 'arrowright' ? -1 : 0) * 60,
          (tecla === 'arrowup' ? 1 : tecla === 'arrowdown' ? -1 : 0) * 60);
      } else if (usadas.includes(tecla)) { e.preventDefault(); this.teclas.add(tecla); }
    });
    window.addEventListener('keyup', e => this.teclas.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.limpar());
    superficie.addEventListener('contextmenu', e => e.preventDefault());
    superficie.addEventListener('wheel', e => {
      if (this.bloqueado) return;
      e.preventDefault();
      this.ajustarZoom(Math.exp(-e.deltaY * 0.001));
    }, { passive: false });
    superficie.addEventListener('pointerdown', e => {
      if (this.bloqueado) return;
      if (e.pointerType === 'touch') {
        this.toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
        superficie.setPointerCapture(e.pointerId);
        if (this.toques.size > 1) {
          this.arrastandoComDoisDedos = true;
          this.ultimoGesto = this.gestoDoisDedos();
          this.pararJoystick();
          e.preventDefault();
          return;
        }
      }
      if (this.ponteiro === null && this.ponteiroCamera === null && (e.button === 2 || e.shiftKey && e.button === 0)) {
        this.ponteiroCamera = { id: e.pointerId, x: e.clientX, y: e.clientY };
        superficie.setPointerCapture(e.pointerId); e.preventDefault();
        return;
      }
      if (this.ponteiro !== null || e.button !== 0) return;
      this.ponteiro = e.pointerId;
      this.origem = { x: e.clientX, y: e.clientY };
      superficie.setPointerCapture(e.pointerId);
      joystick.style.left = `${e.clientX}px`; joystick.style.top = `${e.clientY}px`;
      joystick.classList.add('ativo'); e.preventDefault();
    });
    superficie.addEventListener('pointermove', e => {
      const toque = this.toques.get(e.pointerId);
      if (toque) {
        toque.x = e.clientX; toque.y = e.clientY;
        if (this.arrastandoComDoisDedos) {
          if (!this.bloqueado && this.toques.size > 1) {
            const gesto = this.gestoDoisDedos();
            if (this.ultimoGesto) {
              this.moverCamera(gesto.x - this.ultimoGesto.x, gesto.y - this.ultimoGesto.y);
              if (this.ultimoGesto.distancia > 0) this.ajustarZoom(gesto.distancia / this.ultimoGesto.distancia);
            }
            this.ultimoGesto = gesto;
          }
          return;
        }
      }
      if (this.ponteiroCamera?.id === e.pointerId) {
        if (!this.bloqueado) this.moverCamera(e.clientX - this.ponteiroCamera.x, e.clientY - this.ponteiroCamera.y);
        this.ponteiroCamera.x = e.clientX; this.ponteiroCamera.y = e.clientY;
        return;
      }
      if (this.ponteiro !== e.pointerId || this.bloqueado) return;
      const dx = e.clientX - this.origem.x, dy = e.clientY - this.origem.y;
      const d = Math.hypot(dx, dy), raio = 48, escala = d > raio ? raio / d : 1;
      this.vetor = d < 5 ? { x: 0, y: 0 } : { x: dx * escala / raio, y: dy * escala / raio };
      joystick.firstElementChild.style.transform = `translate(${dx * escala}px, ${dy * escala}px)`;
    });
    const soltar = e => {
      if (this.toques.delete(e.pointerId)) {
        this.ultimoGesto = this.toques.size > 1 ? this.gestoDoisDedos() : null;
        if (this.arrastandoComDoisDedos && this.toques.size === 0) this.arrastandoComDoisDedos = false;
        if (this.arrastandoComDoisDedos) return;
      }
      if (this.ponteiroCamera?.id === e.pointerId) this.ponteiroCamera = null;
      if (this.ponteiro === e.pointerId) this.pararJoystick();
    };
    superficie.addEventListener('pointerup', soltar);
    superficie.addEventListener('pointercancel', soltar);
    superficie.addEventListener('lostpointercapture', soltar);
  }
  gestoDoisDedos() {
    const [a, b] = [...this.toques.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distancia: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  limpar() {
    this.teclas.clear(); this.ponteiroCamera = null; this.toques.clear(); this.arrastandoComDoisDedos = false; this.ultimoGesto = null;
    this.pararJoystick();
  }
  pararJoystick() {
    this.ponteiro = null; this.vetor = { x: 0, y: 0 };
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
