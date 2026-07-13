// ============================================================
// ABJECTUS — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 10 juin 2026 par Andy via creature_preview.html
// Concept : créature violet-vert "abjecte", langue tirée, deux mouches en orbite
//
// Modèle source :
// - models/04_abjectus.glb     (mesh riggé Meshy + anim idle)
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Abjectus.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadAbjectus(scene, lights) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('models/04_abjectus.glb');
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
      const merged = mergeVertices(child.geometry, 0.0001);
      merged.computeVertexNormals();
      child.geometry = merged;
    } catch (e) {
      child.geometry.computeVertexNormals();
    }
  });

  // ---------- Material override (look slimy mat, PBR atténuée) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    const mat = child.material.clone();
    if ('roughness' in mat) mat.roughness = 0.71;
    if ('metalness' in mat) mat.metalness = 0.0;
    if (mat.normalScale) mat.normalScale.set(0.45, 0.45);
    child.material = mat;
  });

  // ---------- Éclairage ----------
  if (lights) {
    if (lights.ambient) lights.ambient.intensity = 0.80;
    if (lights.directional) lights.directional.intensity = 1.50;
    if (lights.rim) lights.rim.intensity = 0.60;
  }
  // scene.environmentIntensity = 1.25; (plus marqué qu'ailleurs pour effet gluant)

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
