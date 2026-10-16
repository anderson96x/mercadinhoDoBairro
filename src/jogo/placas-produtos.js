import * as THREE from 'three';
import { PRODUTOS } from './configuracao.js';

const materiaisTexto = new Map();
const madeira = new THREE.MeshStandardMaterial({ color: 0xd6ad70, roughness: 0.9 });
const fundo = new THREE.MeshStandardMaterial({ color: 0xcddc39, roughness: 0.85 });

function materialTexto(texto) {
  if (materiaisTexto.has(texto)) return materiaisTexto.get(texto);
  // A construção dos modelos também é usada pelos testes sem navegador.
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d');
  let textura;
  if (ctx) {
    canvas.width = 512; canvas.height = 160;
    textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    const desenhar = () => {
      ctx.fillStyle = '#dce64b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#244528';
      ctx.font = '700 88px Outfit, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(texto, canvas.width / 2, canvas.height / 2 + 3, canvas.width - 40);
      textura.needsUpdate = true;
    };
    desenhar();
    // Redesenha uma única vez após as fontes locais terminarem de carregar.
    document.fonts?.ready.then(desenhar);
  }
  const material = new THREE.MeshBasicMaterial({ map: textura ?? null, color: textura ? 0xffffff : 0xdce64b, toneMapped: false });
  materiaisTexto.set(texto, material);
  return material;
}

export function criarPlacaProduto(id, p) {
  const produto = PRODUTOS[id];
  const altura = 2.05, base = 1.1;
  const grupo = new THREE.Group();
  grupo.name = `placa-produto-${id}`;
  grupo.userData.texto = produto.nome;
  grupo.position.set(p.x - 0.35, 0, p.z);
  // Paralela à frente da banca, com o texto voltado para o corredor (+x).
  grupo.rotation.y = Math.PI / 2;
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.065, altura - base, 0.065), madeira);
  poste.position.y = (altura + base) / 2;
  poste.castShadow = true; poste.receiveShadow = true;
  grupo.add(poste);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.56, 0.06), fundo);
  placa.position.y = altura;
  placa.castShadow = true; placa.receiveShadow = true;
  grupo.add(placa);
  const texto = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 0.5), materialTexto(produto.nome));
  texto.position.set(0, altura, 0.034);
  grupo.add(texto);
  return grupo;
}
