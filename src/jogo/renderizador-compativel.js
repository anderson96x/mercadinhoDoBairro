import * as THREE from 'three';

// Alternativa para navegadores sem WebGL: projeta a mesma cena 3D em Canvas 2D.
// Não muda controles nem regras. A ordenação das faces é adequada ao diorama
// simples; cenas futuras com transparências complexas devem usar WebGL.
export class RenderizadorCompativel {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.ctx = this.domElement.getContext('2d', { alpha: false });
    this.shadowMap = {};
    this.geometrias = new WeakMap();
    this.texturas = new WeakMap();
    this.normal = new THREE.Vector3(); this.matrizNormal = new THREE.Matrix3();
    this.luz = new THREE.Vector3(-0.35, 0.82, 0.5).normalize();
    this.pixelRatio = 1;
  }
  setPixelRatio() { /* Um pixel por ponto limita o custo do desenho por software. */ }
  setSize(w, h) { this.w = w; this.h = h; this.domElement.width = w; this.domElement.height = h; }
  texturaRasterizada(imagem) {
    if (typeof HTMLImageElement === 'undefined' || !(imagem instanceof HTMLImageElement)) return imagem;
    if (!this.texturas.has(imagem)) {
      // Rasteriza o asset em memória uma vez, evitando redesenhar o SVG por triângulo.
      const canvas = document.createElement('canvas');
      canvas.width = imagem.naturalWidth; canvas.height = imagem.naturalHeight;
      canvas.getContext('2d').drawImage(imagem, 0, 0);
      this.texturas.set(imagem, canvas);
    }
    return this.texturas.get(imagem);
  }
  descrever(geometria) {
    if (this.geometrias.has(geometria)) return this.geometrias.get(geometria);
    const pos = geometria.attributes.position, norm = geometria.attributes.normal;
    const indices = geometria.index?.array || Array.from({ length: pos.count }, (_, i) => i);
    const faces = [], caixa = geometria.type === 'BoxGeometry';
    for (let i = 0; i < indices.length; i += caixa ? 6 : 3) {
      const ids = [...new Set(Array.from(indices.slice(i, i + (caixa ? 6 : 3))))];
      faces.push({ ids, normal: norm ? new THREE.Vector3().fromBufferAttribute(norm, ids[0]) : new THREE.Vector3(0, 1, 0) });
    }
    const dados = { faces, pontos: Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i)) };
    this.geometrias.set(geometria, dados); return dados;
  }
  render(cena, camera) {
    const ctx = this.ctx;
    ctx.fillStyle = '#78c85a'; ctx.fillRect(0, 0, this.w, this.h);
    cena.updateMatrixWorld(); camera.updateMatrixWorld();
    const matriz = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const formas = [];
    cena.traverseVisible(mesh => {
      if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!material.visible || material.opacity === 0) return;
      const dados = this.descrever(mesh.geometry);
      const mvp = new THREE.Matrix4().multiplyMatrices(matriz, mesh.matrixWorld);
      const pontos = dados.pontos.map(p => {
        const t = p.clone().applyMatrix4(mvp);
        return { x: (t.x + 1) * this.w / 2, y: (1 - t.y) * this.h / 2, z: t.z };
      });
      if (pontos.every(p => p.x < -20) || pontos.every(p => p.x > this.w + 20) || pontos.every(p => p.y < -20) || pontos.every(p => p.y > this.h + 20)) return;
      if (mesh.userData.texturaCurva && material.map?.image) {
        this.matrizNormal.getNormalMatrix(mesh.matrixWorld);
        const uv = mesh.geometry.attributes.uv;
        for (const face of dados.faces) {
          const ps = face.ids.map(i => pontos[i]);
          const area = (ps[1].x - ps[0].x) * (ps[2].y - ps[0].y) - (ps[1].y - ps[0].y) * (ps[2].x - ps[0].x);
          if (Math.abs(area) < 0.07 || (material.side !== THREE.DoubleSide && area >= 0)) continue;
          this.normal.copy(face.normal).applyMatrix3(this.matrizNormal).normalize();
          formas.push({ pontos: ps, textura: this.texturaRasterizada(material.map.image),
            uv: face.ids.map(i => ({ x: uv.getX(i), y: uv.getY(i) })),
            sombra: Math.max(0, 0.25 - Math.max(0, this.normal.dot(this.luz)) * 0.25),
            z: ps.reduce((total, p) => total + p.z, 0) / ps.length, camada: 100 });
        }
        return;
      }
      if (material.map?.image && mesh.geometry.type === 'PlaneGeometry') {
        const a = pontos[0], b = pontos[2], c = pontos[1];
        const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (Math.abs(area) < 0.07 || (material.side !== THREE.DoubleSide && area >= 0)) return;
        formas.push({ pontos: [pontos[0], pontos[1], pontos[3], pontos[2]], textura: material.map.image, z: pontos.reduce((v,p) => v + p.z, 0) / pontos.length, camada: 100 });
        return;
      }
      this.matrizNormal.getNormalMatrix(mesh.matrixWorld);
      for (const face of dados.faces) {
        let ps = face.ids.map(i => pontos[i]);
        const area = (ps[1].x - ps[0].x) * (ps[2].y - ps[0].y) - (ps[1].y - ps[0].y) * (ps[2].x - ps[0].x);
        if (Math.abs(area) < 0.07 || (material.side !== THREE.DoubleSide && area >= 0)) continue;
        if (ps.length > 3) {
          const cx = ps.reduce((v,p) => v + p.x,0) / ps.length, cy = ps.reduce((v,p) => v + p.y,0) / ps.length;
          ps = [...ps].sort((a,b) => Math.atan2(a.y-cy,a.x-cx) - Math.atan2(b.y-cy,b.x-cx));
        }
        this.normal.copy(face.normal).applyMatrix3(this.matrizNormal).normalize();
        const intensidade = material.isMeshBasicMaterial ? 1 : 0.73 + Math.max(0, this.normal.dot(this.luz)) * 0.42;
        const cor = material.color.clone().multiplyScalar(intensidade).convertLinearToSRGB();
        formas.push({ pontos: ps, z: ps.reduce((v,p) => v + p.z,0) / ps.length, camada: mesh.userData.fundo ?? 100, cor: `rgb(${Math.min(255,cor.r*255)|0},${Math.min(255,cor.g*255)|0},${Math.min(255,cor.b*255)|0})`, alfa: material.opacity });
      }
    });
    formas.sort((a,b) => a.camada - b.camada || b.z - a.z);
    for (const f of formas) {
      const ps = f.pontos;
      if (f.textura && f.uv) {
        const origem = f.uv.map(p => ({ x: p.x * f.textura.width, y: (1 - p.y) * f.textura.height }));
        const dx1 = origem[1].x - origem[0].x, dy1 = origem[1].y - origem[0].y;
        const dx2 = origem[2].x - origem[0].x, dy2 = origem[2].y - origem[0].y;
        const determinante = dx1 * dy2 - dx2 * dy1;
        if (Math.abs(determinante) < 1e-8) continue;
        const a = ((ps[1].x - ps[0].x) * dy2 - (ps[2].x - ps[0].x) * dy1) / determinante;
        const b = ((ps[1].y - ps[0].y) * dy2 - (ps[2].y - ps[0].y) * dy1) / determinante;
        const c = ((ps[2].x - ps[0].x) * dx1 - (ps[1].x - ps[0].x) * dx2) / determinante;
        const d = ((ps[2].y - ps[0].y) * dx1 - (ps[1].y - ps[0].y) * dx2) / determinante;
        ctx.save(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(ps[0].x, ps[0].y); ctx.lineTo(ps[1].x, ps[1].y); ctx.lineTo(ps[2].x, ps[2].y); ctx.closePath(); ctx.clip();
        ctx.transform(a, b, c, d, ps[0].x - a * origem[0].x - c * origem[0].y, ps[0].y - b * origem[0].x - d * origem[0].y);
        ctx.drawImage(f.textura, 0, 0);
        if (f.sombra > 0) {
          ctx.globalAlpha = f.sombra; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, f.textura.width, f.textura.height);
        }
        ctx.restore(); continue;
      }
      if (f.textura) {
        ctx.save(); ctx.transform((ps[1].x-ps[0].x)/f.textura.width,(ps[1].y-ps[0].y)/f.textura.width,(ps[3].x-ps[0].x)/f.textura.height,(ps[3].y-ps[0].y)/f.textura.height,ps[0].x,ps[0].y);
        ctx.drawImage(f.textura,0,0); ctx.restore(); continue;
      }
      ctx.globalAlpha = f.alfa ?? 1; ctx.fillStyle = f.cor;
      ctx.beginPath(); ctx.moveTo(ps[0].x,ps[0].y);
      for (let i=1; i<ps.length; i++) ctx.lineTo(ps[i].x,ps[i].y);
      ctx.closePath(); ctx.fill();
      if (f.alfa === 1) { ctx.lineWidth = 0.45; ctx.strokeStyle = f.cor; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
}
