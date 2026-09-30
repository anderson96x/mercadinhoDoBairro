import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RUA } from '../src/jogo/bairro.js';
import { criarCarro, MODELOS_CARROS, Trafego } from '../src/jogo/trafego.js';

test('os vinte modelos têm tipos e cores variados e cabem nas faixas', () => {
  assert.equal(MODELOS_CARROS.length, 20);
  assert.equal(new Set(MODELOS_CARROS.map(modelo => modelo.nome)).size, 20);
  assert.ok(new Set(MODELOS_CARROS.map(modelo => modelo.tipo)).size >= 5);
  assert.ok(new Set(MODELOS_CARROS.map(modelo => modelo.cor)).size >= 15);
  for (const modelo of MODELOS_CARROS) {
    const carro = criarCarro(modelo);
    carro.updateMatrixWorld(true);
    const dimensoes = new THREE.Box3().setFromObject(carro).getSize(new THREE.Vector3());
    assert.ok(dimensoes.x > 1.8 && dimensoes.x < 3.4, modelo.nome);
    assert.ok(dimensoes.z < 1.7, modelo.nome);
  }
});

test('o tráfego nasce aleatoriamente, mantém cada direção em sua faixa e sai da cena', () => {
  const cena = new THREE.Scene();
  const trafego = new Trafego(cena, () => 0.5);
  const vistos = new Set();
  let ocupacao = 0;
  const antes = [...trafego.proximos];
  trafego.atualizar(0);
  assert.deepEqual(trafego.proximos, antes);
  for (let passo = 0; passo < 1600; passo++) {
    trafego.atualizar(0.1);
    assert.ok(trafego.carros.length <= 3);
    ocupacao += trafego.carros.length;
    for (const carro of trafego.carros) {
      vistos.add(carro.modelo.nome);
      assert.equal(carro.grupo.position.z, RUA.faixas[carro.faixa].z);
      assert.equal(carro.direcao, RUA.faixas[carro.faixa].direcao);
      assert.equal(carro.grupo.rotation.y, carro.direcao > 0 ? 0 : Math.PI);
      assert.equal(carro.grupo.parent, cena);
      for (const outro of trafego.carros) {
        if (outro === carro || outro.faixa !== carro.faixa) continue;
        assert.ok(Math.abs(carro.grupo.position.x - outro.grupo.position.x) >= 3.9);
      }
    }
  }
  assert.equal(vistos.size, 20);
  assert.ok(ocupacao / 1600 < 1.6, 'o tráfego deve ser esparso');
  assert.ok(trafego.carros.length < vistos.size);
  assert.equal(cena.children.length, trafego.carros.length);
});

test('todos os modelos permanecem inteiros no asfalto, desde o nascimento até a saída', () => {
  for (const modelo of MODELOS_CARROS) for (let faixa = 0; faixa < RUA.faixas.length; faixa++) {
    const cena = new THREE.Scene();
    const trafego = new Trafego(cena, () => 0.5);
    trafego.proximoModelo = () => modelo;
    trafego.proximos.fill(Infinity);
    assert.equal(trafego.criarNaFaixa(faixa), true);
    const carro = trafego.carros[0];
    const inicio = carro.grupo.position.clone();
    trafego.atualizar(0);
    assert.deepEqual(carro.grupo.position, inicio);
    for (let passo = 0; passo < 100 && trafego.carros.length; passo++) {
      const limites = new THREE.Box3().setFromObject(carro.grupo);
      assert.ok(limites.min.x >= RUA.minX, `${modelo.nome}: borda esquerda`);
      assert.ok(limites.max.x <= RUA.maxX, `${modelo.nome}: borda direita`);
      assert.ok(limites.min.z >= (faixa === 0 ? 9.26 : 11.65));
      assert.ok(limites.max.z <= (faixa === 0 ? 11.55 : 13.5));
      trafego.atualizar(0.17);
    }
    assert.equal(trafego.carros.length, 0);
    assert.equal(cena.children.length, 0);
  }
});
