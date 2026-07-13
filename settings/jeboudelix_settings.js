// ============================================================
// JEBOUDELIX — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 10 juin 2026 par Andy via creature_preview.html
// Concept : lapin blanc-crème, joues roses, yeux mi-clos, moue résignée
//           — l'incarnation de "je boude"
// Détourné de Grodoudou
//
// Effet particulier : oreilles légèrement translucides (transmission)
//                    pour simuler la lumière qui passe à travers comme un vrai lapin
//
// Modèle source :
// - models/06_jeboudelix.glb     (mesh riggé Meshy + anim idle)
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Jeboudelix.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadJeboudelix(scene, lights) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('models/06_jeboudelix.glb');
  const model = gltf.scene;

  // Normalize size
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(1.4 / size);  // réduit pour cadrer dans le viewport

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

  // ---------- Material override (fourrure mate + oreilles translucides) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    const mat = child.material.clone();
    if ('roughness' in mat) mat.roughness = 0.82;       // très mat, façon feutre
    if ('metalness' in mat) mat.metalness = 0.06;
    if (mat.normalScale) mat.normalScale.set(0.40, 0.40);
    if (mat.emissive) {
      mat.emissive.set(0xffffff);
      mat.emissiveIntensity = 0.04;                     // très subtil glow doux
    }

    // Promote to MeshPhysicalMaterial for transmission (oreilles translucides)
    const phys = new THREE.MeshPhysicalMaterial();
    phys.copy(mat);
    phys.transparent = true;
    phys.opacity = 1.00;
    phys.transmission = 0.64;                           // lumière traverse subtilement
    phys.thickness = 0.45;
    phys.ior = 1.00;
    phys.depthWrite = false;
    phys.side = THREE.DoubleSide;
    child.material = phys;
  });

  // ---------- Éclairage ----------
  if (lights) {
    if (lights.ambient) lights.ambient.intensity = 0.80;
    if (lights.directional) lights.directional.intensity = 1.50;
    if (lights.rim) lights.rim.intensity = 0.60;
  }
  // scene.environmentIntensity = 1.0;

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
