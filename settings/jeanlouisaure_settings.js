// ============================================================
// JEANLOUISAURE — Réglages validés pour intégration PWA finale
// ============================================================
// Validé le 10 juin 2026 par Andy via jeanlouisaure_preview.html
// Concept : blob rose translucide (bubble gum) + Jean-Louis humain à l'intérieur
//
// Modèles source :
// - models/blob_vide.glb            (mesh translucide, pas d'anim Meshy)
// - models/jeanlouis_humain.glb     (mesh humain riggé + anim idle "Armature|Idle_15|baselayer")
//
// Code à intégrer dans la scène Three.js de la PWA quand on capture Jeanlouisaure.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function loadJeanlouisaureHybrid(scene, lights) {
  const loader = new GLTFLoader();

  const [blobGltf, jlGltf] = await Promise.all([
    loader.loadAsync('models/blob_vide.glb'),
    loader.loadAsync('models/jeanlouis_humain.glb'),
  ]);

  const blob = blobGltf.scene;
  const jl = jlGltf.scene;

  // Normalize size (both meshes recentered & scaled to size ~2)
  const norm = obj => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    obj.scale.setScalar(2 / size);
  };
  norm(blob);
  norm(jl);

  // ---------- Material bubble-gum sur le blob ----------
  const blobMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffb0c8,
    transparent: true,
    opacity: 0.55,
    transmission: 0.60,
    thickness: 0.80,
    roughness: 0.12,
    ior: 1.40,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  blob.traverse(child => {
    if (child.isMesh) {
      // keep eye/mouth texture if present
      if (child.material?.map) blobMaterial.map = child.material.map;
      if (child.material?.normalMap) {
        blobMaterial.normalMap = child.material.normalMap;
        blobMaterial.normalScale.set(0.21, 0.21);
      }
      child.material = blobMaterial;
    }
  });

  // Make Jean-Louis fully opaque
  jl.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.transparent = false;
      child.material.depthWrite = true;
    }
  });

  // ---------- Composition ----------
  const jlGroup = new THREE.Group();
  jlGroup.add(jl);
  jlGroup.position.set(-0.05, -0.40, 0.03);
  jlGroup.scale.setScalar(0.35);
  jlGroup.rotation.y = -0.052;
  jlGroup.renderOrder = 0;

  const blobGroup = new THREE.Group();
  blobGroup.add(blob);
  blobGroup.renderOrder = 1;

  const root = new THREE.Group();
  root.add(jlGroup);
  root.add(blobGroup);
  scene.add(root);

  // ---------- Éclairage (à appliquer aux lights existantes) ----------
  if (lights) {
    if (lights.ambient) lights.ambient.intensity = 0.80;
    if (lights.directional) lights.directional.intensity = 1.50;
    if (lights.rim) lights.rim.intensity = 0.80;
  }

  // ---------- Animations ----------
  const jlMixer = new THREE.AnimationMixer(jl);
  if (jlGltf.animations.length > 0) {
    // Anim idle (premier clip = "Armature|Idle_15|baselayer")
    jlMixer.clipAction(jlGltf.animations[0]).play();
  }

  // Le blob n'a pas d'anim Meshy — on l'anime via sinusoidal breathing
  const breathe = (time) => {
    blobGroup.scale.y = 1 + 0.025 * Math.sin(time * 1.4);
    blobGroup.scale.x = 1 + 0.018 * Math.cos(time * 1.4);
  };

  // Retourne ce qu'il faut pour le render loop principal
  return {
    root,
    mixers: [jlMixer],
    update(deltaTime, elapsedTime) {
      jlMixer.update(deltaTime);
      breathe(elapsedTime);
    },
  };
}

// ============================================================
// Usage dans la PWA :
// ============================================================
//
// import { loadJeanlouisaureHybrid } from './jeanlouisaure_settings.js';
//
// const lights = { ambient, directional, rim };
// const jeanlouisaure = await loadJeanlouisaureHybrid(scene, lights);
//
// // dans la loop de rendu :
// jeanlouisaure.update(deltaTime, clock.elapsedTime);
//
// // pour retirer de la scène :
// scene.remove(jeanlouisaure.root);
