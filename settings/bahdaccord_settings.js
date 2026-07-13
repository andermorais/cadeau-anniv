// ============================================================
// BAHDACCORD — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 11 juin 2026 par Andy via creature_preview.html
// Concept : renard fennec caramel-beige, grandes oreilles dressées, yeux ambres,
//           expression légèrement résignée — "ah bah d'accord"
// Détourné d'Évoli/Fennekin
//
// Effet particulier : fourrure dense des oreilles avec transmission subtile
//                     (la lumière traverse les oreilles fines comme un vrai fennec)
//
// Modèle source :
// - models/05_bahdaccord.glb     (mesh riggé Meshy + anim idle)
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Bahdaccord.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadBahdaccord(scene, lights) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('models/05_bahdaccord.glb');
  const model = gltf.scene;

  // Normalize size
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(1.4 / size);  // réduit pour cadrer dans le viewport
  model.position.y -= 0.3;  // descend pour ne pas chevaucher le HUD titre/tagline

  // ---------- Smooth normals ----------
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

  // ---------- Material override (fourrure semi-translucide, oreilles fennec) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    const mat = child.material.clone();
    if ('roughness' in mat) mat.roughness = 0.65;
    if ('metalness' in mat) mat.metalness = 0.14;
    if (mat.normalScale) mat.normalScale.set(0.59, 0.59);

    // Promote to MeshPhysicalMaterial for transmission (oreilles fennec)
    const phys = new THREE.MeshPhysicalMaterial();
    phys.copy(mat);
    phys.transparent = true;
    phys.opacity = 1.00;
    phys.transmission = 0.40;                   // lumière traverse les oreilles
    phys.thickness = 2.10;
    phys.ior = 1.54;
    phys.depthWrite = false;
    phys.side = THREE.DoubleSide;
    child.material = phys;
  });

  // ---------- Éclairage (similaire à Tay-tay : ambient fort, doux) ----------
  if (lights) {
    if (lights.ambient) lights.ambient.intensity = 1.10;
    if (lights.directional) lights.directional.intensity = 0.20;
    if (lights.rim) lights.rim.intensity = 0.55;
  }
  // scene.environmentIntensity = 1.25;

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
