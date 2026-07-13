// ============================================================
// QUOIKOUBÉ — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 10 juin 2026 par Andy via creature_preview.html
// Concept : canard bleu pâle "quoi ?", bec orange, expression confuse
//
// Modèle source :
// - models/02_quoikoube.glb     (mesh riggé Meshy + anim idle)
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Quoikoubé.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadQuoikoube(scene, lights) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('models/02_quoikoube.glb');
  const model = gltf.scene;

  // Normalize size (mesh recentered & scaled to size ~2)
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(1.4 / size);  // réduit pour cadrer dans le viewport

  // ---------- Smooth normals (efface les facettes Meshy) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    try {
      const merged = mergeVertices(child.geometry, 0);
      merged.computeVertexNormals();
      child.geometry = merged;
    } catch (e) {
      // Some meshes (e.g. with morph targets) can't be merged; fallback
      child.geometry.computeVertexNormals();
    }
  });

  // ---------- Material override (PBR atténuée, satin léger) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    const mat = child.material.clone();
    // mat.color reste sur l'original (texture diffuse Meshy)
    if ('roughness' in mat) mat.roughness = 0.46;
    if ('metalness' in mat) mat.metalness = 0.12;
    if (mat.normalScale) mat.normalScale.set(0.46, 0.46);
    child.material = mat;
  });

  // ---------- Éclairage (à appliquer aux lights existantes) ----------
  if (lights) {
    if (lights.ambient) lights.ambient.intensity = 0.80;
    if (lights.directional) lights.directional.intensity = 1.50;
    if (lights.rim) lights.rim.intensity = 0.60;
  }
  // scene.environmentIntensity = 1.0; (à régler sur la scène globale)

  scene.add(model);

  // ---------- Animations ----------
  const mixer = new THREE.AnimationMixer(model);
  let currentAction = null;
  if (gltf.animations.length > 0) {
    currentAction = mixer.clipAction(gltf.animations[0]);
    currentAction.timeScale = 1.0;
    currentAction.play();
  }

  return {
    model,
    mixer,
    animations: gltf.animations,
    update(deltaTime) {
      mixer.update(deltaTime);
    },
  };
}

// ============================================================
// Usage dans la PWA :
// ============================================================
//
// import { loadQuoikoube } from './quoikoube_settings.js';
//
// const lights = { ambient, directional, rim };
// const quoikoube = await loadQuoikoube(scene, lights);
//
// // dans la loop de rendu :
// quoikoube.update(deltaTime);
//
// // pour retirer de la scène :
// scene.remove(quoikoube.model);
