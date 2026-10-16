import * as THREE from 'three';
import { CONFIG } from './configuracao.js';

export function criarSol() {
  const limites = CONFIG.limiteCamera;
  const sol = new THREE.DirectionalLight(0xffebc9, 2.8);
  sol.target.position.set((limites.minX + limites.maxX) / 2, 0, (limites.minZ + limites.maxZ) / 2);
  // Mantém a direção da luz, afastando sua origem para incluir todo o terreno.
  sol.position.copy(sol.target.position).add(new THREE.Vector3(-16, 44, 26));
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.normalBias = 0.035;
  sol.shadow.bias = -0.0002;
  sol.updateMatrixWorld();
  sol.target.updateMatrixWorld();
  sol.shadow.updateMatrices(sol);

  // Ajusta o volume no espaço da luz, incluindo chão, telhados e margem de sombra.
  const volume = new THREE.Box3();
  for (const x of [limites.minX, limites.maxX]) for (const y of [-0.5, 8]) {
    for (const z of [limites.minZ, limites.maxZ]) {
      volume.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(sol.shadow.camera.matrixWorldInverse));
    }
  }
  const camera = sol.shadow.camera, margem = 2;
  camera.left = volume.min.x - margem; camera.right = volume.max.x + margem;
  camera.bottom = volume.min.y - margem; camera.top = volume.max.y + margem;
  camera.near = Math.max(0.1, -volume.max.z - margem);
  camera.far = -volume.min.z + margem;
  camera.updateProjectionMatrix();
  return sol;
}
