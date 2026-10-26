import * as THREE from 'three';

export function criarGeometriasSaco(w, h, d) {
  const niveis = [
    { y: h * 0.34, x: w * 0.39, z: d * 0.06 },
    { y: h * 0.18, x: w * 0.5, z: d * 0.5 },
    { y: -h * 0.5, x: w * 0.5, z: d * 0.5 }
  ];
  const faces = [1, -1].map(lado => {
    const geometria = new THREE.PlaneGeometry(w, h * 0.84, 1, 2);
    const posicoes = geometria.attributes.position, uv = geometria.attributes.uv;
    for (let i = 0; i < posicoes.count; i++) {
      const nivel = niveis[Math.floor(i / 2)], u = i % 2;
      posicoes.setXYZ(i, (u * 2 - 1) * nivel.x, nivel.y, nivel.z * lado);
      uv.setXY(i, lado > 0 ? u : 1 - u, (nivel.y + h / 2) / (h * 0.84));
    }
    if (lado < 0) {
      const indices = geometria.index.array;
      for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    }
    geometria.computeVertexNormals(); return geometria;
  });
  const posicoes = [];
  const quad = (a, b, c, e) => {
    for (const p of [a, b, c, a, c, e]) posicoes.push(...p);
  };
  for (const lado of [-1, 1]) for (let i = 0; i < niveis.length - 1; i++) {
    const a = niveis[i], b = niveis[i + 1];
    const pontos = [[lado * a.x, a.y, a.z], [lado * b.x, b.y, b.z],
      [lado * b.x, b.y, -b.z], [lado * a.x, a.y, -a.z]];
    if (lado > 0) quad(...pontos); else quad(...pontos.reverse());
  }
  for (const i of [0, niveis.length - 1]) {
    const n = niveis[i];
    const pontos = [[-n.x, n.y, n.z], [n.x, n.y, n.z], [n.x, n.y, -n.z], [-n.x, n.y, -n.z]];
    if (i === 0) quad(...pontos); else quad(...pontos.reverse());
  }
  const bordas = new THREE.BufferGeometry();
  bordas.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3)); bordas.computeVertexNormals();
  const topo = new THREE.Shape();
  topo.moveTo(-w * 0.39, h * 0.34); topo.lineTo(w * 0.39, h * 0.34);
  topo.lineTo(w * 0.39, h * 0.5); topo.lineTo(-w * 0.39, h * 0.5); topo.closePath();
  const furo = new THREE.Path(), x = w * 0.22, y = h * 0.425, r = h * 0.025;
  furo.moveTo(-x + r, y - r); furo.lineTo(x - r, y - r);
  furo.quadraticCurveTo(x, y - r, x, y); furo.quadraticCurveTo(x, y + r, x - r, y + r);
  furo.lineTo(-x + r, y + r); furo.quadraticCurveTo(-x, y + r, -x, y);
  furo.quadraticCurveTo(-x, y - r, -x + r, y - r); furo.closePath(); topo.holes.push(furo);
  const alca = new THREE.ExtrudeGeometry(topo, { depth: d * 0.12, bevelEnabled: false, curveSegments: 4 });
  alca.translate(0, 0, -d * 0.06);
  return { frente: faces[0], verso: faces[1], bordas, alca };
}
