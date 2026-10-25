import * as THREE from 'three';

const VARIEDADES = [
  { id: 'milho', cor: 0xf2bf39, altura: 0.4, raio: 0.15 },
  { id: 'atum', cor: 0xe76e59, altura: 0.19, raio: 0.17 },
  { id: 'sardinha-azul', cor: 0x3289ad, altura: 0.14 },
  { id: 'sardinha-vermelha', cor: 0xd95347, altura: 0.14 }
];
const metal = new THREE.MeshStandardMaterial({ color: 0xd3dce0, metalness: 0.55, roughness: 0.42 });
const materiais = new Map();
const pinturas = VARIEDADES.map(tipo => new THREE.MeshStandardMaterial({ color: tipo.cor, roughness: 0.7 }));

function arteSvg(nome, cor) {
  if (!materiais.has(nome)) {
    const mapa = typeof document !== 'undefined'
      ? new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL ?? '/'}produtos/enlatados/${nome}.svg`)
      : null;
    if (mapa) mapa.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: mapa, color: mapa ? 0xffffff : cor, toneMapped: false });
    material.userData.svg = `produtos/enlatados/${nome}.svg`;
    materiais.set(nome, material);
  }
  return materiais.get(nome);
}

function peca(grupo, geometria, material, y = 0) {
  const mesh = new THREE.Mesh(geometria, material);
  mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true;
  grupo.add(mesh); return mesh;
}

function retanguloArredondado(w, d, h) {
  const forma = new THREE.Shape(), r = 0.045;
  forma.moveTo(-w / 2 + r, -d / 2);
  forma.lineTo(w / 2 - r, -d / 2); forma.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  forma.lineTo(w / 2, d / 2 - r); forma.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  forma.lineTo(-w / 2 + r, d / 2); forma.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  forma.lineTo(-w / 2, -d / 2 + r); forma.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  const geometria = new THREE.ExtrudeGeometry(forma, { depth: h, bevelEnabled: false, curveSegments: 3 });
  geometria.rotateX(-Math.PI / 2); geometria.translate(0, -h / 2, 0);
  return geometria;
}

export function criarEnlatado(variante = 0) {
  const indice = Math.floor(variante / 3) % VARIEDADES.length;
  const tipo = VARIEDADES[indice];
  const grupo = new THREE.Group(); grupo.name = `enlatado-${tipo.id}`;
  grupo.userData.variedade = tipo.id; grupo.userData.altura = tipo.altura;
  const pintura = pinturas[indice];
  const { altura: h, raio } = tipo;
  if (raio) {
    peca(grupo, new THREE.CylinderGeometry(raio, raio, h - 0.024, 24), pintura);
    for (const lado of [-1, 1]) {
      peca(grupo, new THREE.CylinderGeometry(raio + 0.007, raio + 0.007, 0.012, 24), metal, lado * (h / 2 - 0.006));
    }
    for (const r of [raio * 0.56, raio * 0.8, raio * 0.96]) {
      const aro = peca(grupo, new THREE.TorusGeometry(r, 0.0025, 3, 24), metal, h / 2 + 0.001);
      aro.rotation.x = Math.PI / 2;
    }
    // Arte plana pequena sobre a frente da lata: o volume continua sendo 3D.
    const rotulo = peca(grupo, new THREE.PlaneGeometry(raio * 1.65, h - 0.04), arteSvg(tipo.id, tipo.cor));
    rotulo.name = 'rotulo-enlatado'; rotulo.position.z = raio + 0.001;
    if (tipo.id === 'atum') {
      const anel = peca(grupo, new THREE.TorusGeometry(0.034, 0.007, 4, 12), metal, h / 2 + 0.008);
      anel.rotation.x = Math.PI / 2; anel.scale.y = 1.4;
    }
  } else {
    peca(grupo, retanguloArredondado(0.4, 0.26, h - 0.02), pintura);
    for (const lado of [-1, 1]) {
      peca(grupo, retanguloArredondado(0.414, 0.274, 0.012), metal, lado * (h / 2 - 0.006));
    }
    const rotulo = peca(grupo, new THREE.PlaneGeometry(0.35, h - 0.025), arteSvg(tipo.id, tipo.cor));
    rotulo.name = 'rotulo-enlatado'; rotulo.position.z = 0.131;
    const tampa = peca(grupo, new THREE.PlaneGeometry(0.38, 0.24), arteSvg('tampa-sardinha', 0xd3dce0), h / 2 + 0.001);
    tampa.name = 'tampa-svg-enlatado'; tampa.rotation.x = -Math.PI / 2;
  }
  return grupo;
}
