// ============================================================
// TAY-TAY — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 11 juin 2026 par Andy via creature_preview.html
// Concept : mouton rose pâle, laine bouclée, mèche blonde, cardigan beige,
//           yeux fermés (chantonne doucement), étoile subtile sur le front
//           — clin d'œil Taylor Swift (Swifties / cardigan / folklore)
// Détourné de Wattouat
//
// Effet particulier : laine légèrement translucide pour effet moelleux,
//                     éclairage doux (rétroéclairage subtil pour donner du volume aux boucles)
//
// Modèle source :
// - models/03_taytay.glb     (mesh riggé Meshy + anim idle)
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Tay-tay.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export async function loadTayTay(scene, lights) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('models/03_taytay.glb');
  const model = gltf.scene;

  // Normalize size
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.scale.setScalar(2 / size * 0.99);  // léger ajustement

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

  // ---------- Material override (laine moelleuse semi-translucide) ----------
  model.traverse(child => {
    if (!child.isMesh) return;
    const mat = child.material.clone();
    if ('roughness' in mat) mat.roughness = 0.53;
    if ('metalness' in mat) mat.metalness = 0.08;
    if (mat.normalScale) mat.normalScale.set(0.45, 0.45);

    // Promote to MeshPhysicalMaterial for transmission (laine légère)
    const phys = new THREE.MeshPhysicalMaterial();
    phys.copy(mat);
    phys.transparent = true;
    phys.opacity = 1.00;
    phys.transmission = 0.40;                  // laine légèrement translucide
    phys.thickness = 2.10;                     // épais (laine dense)
    phys.ior = 1.54;
    phys.depthWrite = false;
    phys.side = THREE.DoubleSide;
    child.material = phys;
  });

  // ---------- Éclairage (ambient fort, directionnel doux — rendu plush) ----------
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
