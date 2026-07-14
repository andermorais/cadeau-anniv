// ============================================================
// Cadeau Guillaume — App principale (V1 monolithique)
// ============================================================
// Orchestre : intro, carte Leaflet, géoloc, détection proximité,
// scène Three.js de capture, swipe Pokéball, carte souvenir typewriter,
// Pokédex, mode debug.
//
// Cycle de vie :
//   intro → map+geoloc → (proximité) → creature-scene → swipe → capture → memory → continue → map
//
// Tout en module ES, pas de bundler. Trois grands invariants :
// - 1 seule créature affichée à la fois en scène
// - La progression vit dans localStorage sous la clé STATE_KEY
// - Le mode debug s'active au triple-tap sur le logo (.logo)

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CREATURES, CAPTURE_RADIUS, MAP_CENTER, MAP_ZOOM, distanceMeters } from './creatures.js';

console.log('[BOOT] app.js module chargé');
window.addEventListener('error', e => console.error('[BOOT] Global error:', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => console.error('[BOOT] Unhandled rejection:', e.reason));

const STATE_KEY = 'cadeau-gui-state-v1';
const INTRO_SEEN_KEY = 'cadeau-gui-intro-seen-v1';

// Mode debug — activé uniquement via ?debug=1 (Gui n'a pas ce paramètre dans son lien)
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === '1';

// ---------- State persistance ----------
function loadState() {
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || { captured: [] }; }
  catch (e) { return { captured: [] }; }
}
function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }
const state = loadState();

function isCaptured(id) { return state.captured.includes(id); }
function markCaptured(id) {
  if (isCaptured(id)) return;
  state.captured.push(id);
  saveState(state);
  refreshPokedexCount();
}

// ---------- Toast ----------
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg, duration = 1800) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ---------- INTRO ----------
const introEl = document.getElementById('intro');
// En mode debug, on force l'intro à s'afficher pour permettre de la revoir
if (DEBUG_MODE || !localStorage.getItem(INTRO_SEEN_KEY)) {
  introEl.classList.add('open');
}
document.getElementById('intro-start').addEventListener('click', () => {
  introEl.classList.remove('open');
  localStorage.setItem(INTRO_SEEN_KEY, '1');
  startGeolocation();
});

// ---------- MAP (MapLibre GL + OpenFreeMap Liberty, style clair 3D bâtiments) ----------
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [MAP_CENTER.lng, MAP_CENTER.lat],  // MapLibre = [lng, lat]
  zoom: MAP_ZOOM,
  pitch: 55,           // vue tiltée style Pokémon GO
  bearing: 0,
  attributionControl: true,
  interactive: true,   // pan + pinch-zoom + rotation OK (proche Pokémon GO officiel)
});

console.log('[BOOT] map créée, en attente du load event');
// Personnalisation style + créatures 3D sur la carte
map.on('load', () => {
  console.log('[BOOT] map.on(load) déclenché');
  try {
    ['poi_r1', 'poi_r7', 'poi_r20'].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
    if (map.getLayer('building-3d')) {
      map.setPaintProperty('building-3d', 'fill-extrusion-color', '#e8ddc8');
    }
    if (map.getLayer('building')) {
      map.setPaintProperty('building', 'fill-color', '#ebe0cc');
    }
    console.log('[BOOT] style tweaks OK, appel setupCreaturesLayer');
    setupCreaturesLayer();
  } catch (err) {
    console.error('[BOOT] map.on(load) plantage', err);
  }
});

let meMarker = null;
let myPosition = null;
let debugGpsOverride = false;  // si true, watchPosition n'écrase pas myPosition (mode debug)

function updateMyPosition(lat, lng, accuracy) {
  myPosition = { lat, lng, accuracy };
  if (!meMarker) {
    const el = document.createElement('div');
    el.className = 'me-marker pulse';
    meMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    map.flyTo({ center: [lng, lat], zoom: 18, essential: true });
  } else {
    meMarker.setLngLat([lng, lat]);
  }
  checkProximity();
}

// ---------- GPS ----------
const gpsStatusEl = document.getElementById('gps-status');
const gpsTextEl = document.getElementById('gps-text');
let gpsWatchId = null;

function startGeolocation() {
  if (!('geolocation' in navigator)) {
    gpsStatusEl.classList.add('error');
    gpsTextEl.textContent = 'GPS non supporté';
    return;
  }
  gpsTextEl.textContent = 'recherche GPS…';
  gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      if (debugGpsOverride) return;  // le mode debug tient les rênes
      const { latitude, longitude, accuracy } = pos.coords;
      gpsStatusEl.classList.remove('error');
      gpsStatusEl.classList.add('active');
      gpsTextEl.textContent = `GPS ${Math.round(accuracy)}m`;
      updateMyPosition(latitude, longitude, accuracy);
    },
    err => {
      gpsStatusEl.classList.remove('active');
      gpsStatusEl.classList.add('error');
      gpsTextEl.textContent = 'GPS bloqué';
      console.warn('GPS error', err);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 }
  );
}

// Démarrer si pas d'intro à afficher
if (!introEl.classList.contains('open')) {
  startGeolocation();
}

// ---------- PROXIMITY DETECTION ----------
let nearbyCreature = null;         // la créature la plus proche à portée (< 25m)
let captureInProgress = false;     // évite re-capture pendant l'anim de lancer

function checkProximity() {
  if (!myPosition || captureInProgress) return;
  let closest = null;
  let closestDist = Infinity;
  for (const c of CREATURES) {
    if (isCaptured(c.id)) continue;
    const d = distanceMeters(myPosition, c.gps);
    if (d <= CAPTURE_RADIUS && d < closestDist) {
      closest = c;
      closestDist = d;
    }
  }
  if (closest !== nearbyCreature) {
    nearbyCreature = closest;
    if (closest) showCaptureUI(closest);
    else hideCaptureUI();
  }
}

// ---------- POKÉDEX (header count + grid) ----------
function refreshPokedexCount() {
  document.getElementById('pokedex-count').textContent = state.captured.length;
}
refreshPokedexCount();

const pokedexEl = document.getElementById('pokedex');
const pokedexGridEl = document.getElementById('pokedex-grid');
const pokedexProgressEl = document.getElementById('pokedex-progress');

function openPokedex() {
  pokedexProgressEl.textContent = `${state.captured.length} / ${CREATURES.length} capturées`;
  pokedexGridEl.innerHTML = CREATURES.map(c => {
    const captured = isCaptured(c.id);
    return `
      <div class="pokedex-card ${captured ? 'captured' : ''}" data-id="${c.id}" style="--card-url: url('${c.capturePhoto}')">
        <div class="silhouette"></div>
        <div class="label">${captured ? c.name : '???'}</div>
      </div>
    `;
  }).join('');
  pokedexGridEl.querySelectorAll('.pokedex-card.captured').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const c = CREATURES.find(x => x.id === id);
      if (c) {
        pokedexEl.classList.remove('open');
        showMemoryCard(c, /* skipTypewriter */ true);
      }
    });
  });
  pokedexEl.classList.add('open');
}
document.getElementById('pokedex-open').addEventListener('click', openPokedex);
document.getElementById('pokedex-close').addEventListener('click', () => pokedexEl.classList.remove('open'));

// ---------- DEBUG (triple-tap logo) ----------
// Actif uniquement si DEBUG_MODE (URL ?debug=1). Sinon rien ne se passe au triple-tap.
const logoEl = document.getElementById('logo');
const debugPanelEl = document.getElementById('debug-panel');
if (DEBUG_MODE) {
  let logoTaps = 0; let logoTapTimer;
  logoEl.addEventListener('click', () => {
    logoTaps++;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => { logoTaps = 0; }, 600);
    if (logoTaps >= 3) {
      logoTaps = 0;
      openDebugPanel();
    }
  });
}

function openDebugPanel() {
  const list = document.getElementById('debug-list');
  list.innerHTML = CREATURES.map(c => {
    const captured = isCaptured(c.id);
    return `<button class="debug-btn ${captured ? 'captured' : ''}" data-id="${c.id}">${c.order}. ${c.name}</button>`;
  }).join('');
  list.querySelectorAll('.debug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = CREATURES.find(x => x.id === btn.dataset.id);
      if (c) {
        // Vraie simulation GPS : téléporte myPosition aux coords de la créature.
        // updateMyPosition() met à jour le marker + déclenche checkProximity()
        // → la scène s'ouvre naturellement via la logique de proximité (< 25 m).
        debugGpsOverride = true;
        gpsStatusEl.classList.remove('error');
        gpsStatusEl.classList.add('active');
        gpsTextEl.textContent = `GPS simulé (${c.name})`;
        map.flyTo({ center: [c.gps.lng, c.gps.lat], zoom: 18, essential: true });
        updateMyPosition(c.gps.lat, c.gps.lng, 5);
        debugPanelEl.classList.remove('open');
      }
    });
  });
  debugPanelEl.classList.add('open');
}
document.getElementById('debug-close').addEventListener('click', () => debugPanelEl.classList.remove('open'));
document.getElementById('debug-reset').addEventListener('click', () => {
  if (!confirm('Tout effacer ?')) return;
  state.captured = [];
  saveState(state);
  refreshPokedexCount();
  toast('Pokédex réinitialisé');
});
// Bouton "GPS réel" — restaure la vraie géoloc après un test debug
const debugPanelHtml = debugPanelEl.querySelector('.debug-section');
if (debugPanelHtml && !document.getElementById('debug-real-gps')) {
  const realBtn = document.createElement('button');
  realBtn.id = 'debug-real-gps';
  realBtn.className = 'debug-btn';
  realBtn.textContent = '📍 Repasser en GPS réel';
  debugPanelHtml.insertBefore(realBtn, debugPanelHtml.firstChild);
  realBtn.addEventListener('click', () => {
    debugGpsOverride = false;
    gpsTextEl.textContent = 'recherche GPS…';
    toast('GPS réel réactivé');
  });
}

// ============================================================
// CRÉATURES 3D SUR LA CARTE (MapLibre custom layer + Three.js)
// ============================================================
// Chaque GLB est rendu directement à sa position GPS via un custom layer WebGL
// partagé avec MapLibre. Guillaume peut zoomer/tourner : les créatures restent
// ancrées à leur spot dans le jardin, elles grossissent avec la proximité (perspective).
// La scène 3D "plein écran" a été retirée. Le HUD + Pokéball sont overlays UI sur la carte.

const sceneEl = document.getElementById('creature-scene');
const sceneNameEl = document.getElementById('scene-name');
const sceneTaglineEl = document.getElementById('scene-tagline');
const flashEl = document.getElementById('capture-flash');
const pokeballEl = document.getElementById('pokeball');

// Créatures placées sur la carte : id → { creature, group, mercCoord, scaleFactor, update, wrapperScene }
const mapCreatures = new Map();
let layerClock = new THREE.Clock();

function setupCreaturesLayer() {
  console.log('[3D] setupCreaturesLayer démarré');
  const customLayer = {
    id: 'creatures-3d',
    type: 'custom',
    renderingMode: '3d',

    // ⚠️ onAdd DOIT être synchrone (MapLibre spec). Le chargement des GLB est
    // lancé en arrière-plan (fire-and-forget), render() gérera scene vide au début.
    onAdd(mapObj, gl) {
      console.log('[3D] onAdd démarré (sync)');
      this.map = mapObj;

      // Scène Three.js séparée pour les créatures
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();

      // Éclairage uniforme
      const ambient = new THREE.AmbientLight(0xffffff, 0.95);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
      dirLight.position.set(2, 6, 3);
      const rimLight = new THREE.DirectionalLight(0xff7eb6, 0.35);
      rimLight.position.set(-3, 2, -2);
      this.scene.add(ambient, dirLight, rimLight);

      // Renderer partage le contexte WebGL de MapLibre
      this.renderer = new THREE.WebGLRenderer({
        canvas: mapObj.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Environnement PBR (async safe : on tolère l'échec)
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = envTex;
        this.scene.environmentIntensity = 0.7;
        pmrem.dispose();
      } catch (e) { console.warn('[3D] PMREM env non chargée', e); }

      // Lance le chargement des GLB en arrière-plan (fire-and-forget)
      this._loadCreatures().catch(err => console.error('[3D] loadCreatures échoué', err));
      console.log('[3D] onAdd terminé (chargement GLB en background)');
    },

    async _loadCreatures() {
      for (const c of CREATURES) {
        try {
          console.log(`[3D] chargement ${c.id}…`);
          const wrapper = new THREE.Scene();
          const mockLights = {
            ambient: { intensity: 0.95 },
            directional: { intensity: 1.3 },
            rim: { intensity: 0.35 },
          };
          const mod = await import(`./${c.settingsModule}`);
          const loader = mod[c.loader];
          if (!loader) { console.warn(`[3D] loader ${c.loader} introuvable`); continue; }
          const result = await loader(wrapper, mockLights);

          const group = new THREE.Group();
          while (wrapper.children.length > 0) {
            group.add(wrapper.children[0]);
          }

          // Fix normales inversées par le scale Y négatif (matériaux DoubleSide)
          group.traverse((child) => {
            if (child.isMesh && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => { if (m) m.side = THREE.DoubleSide; });
              } else {
                child.material.side = THREE.DoubleSide;
              }
            }
          });

          const mercCoord = maplibregl.MercatorCoordinate.fromLngLat([c.gps.lng, c.gps.lat], 0);
          const meterUnit = mercCoord.meterInMercatorCoordinateUnits();
          const meterScale = meterUnit * 1.5;

          this.scene.add(group);
          mapCreatures.set(c.id, {
            creature: c, group, mercCoord, meterScale, update: result.update,
            captureScale: 1.0,
          });
          console.log(`[3D] ${c.id} chargée, meshes:`, group.children.length);
          this.map.triggerRepaint();
        } catch (err) {
          console.error(`[3D] chargement ${c.id} échoué`, err);
        }
      }
      console.log(`[3D] total créatures chargées: ${mapCreatures.size}`);
    },

    render(gl, matrix) {
      if (!this._renderLogged) {
        console.log(`[3D] render() 1er appel, ${mapCreatures.size} créatures`);
        this._renderLogged = true;
      }
      const dt = layerClock.getDelta();
      const t = layerClock.elapsedTime;
      const mapMatrix = new THREE.Matrix4().fromArray(matrix);
      this.renderer.resetState();

      // Rendu créature par créature avec sa propre projection matrix
      // (translate au spot GPS + scale mètre + rotation Y-up → Z-up mercator)
      mapCreatures.forEach((info) => {
        const { creature, group, mercCoord, meterScale, update, captureScale } = info;
        if (isCaptured(creature.id)) return;

        // Anim mixer/breathing du modèle
        if (update) update(dt, t);

        const scale = meterScale * captureScale;
        const rotX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        const localMatrix = new THREE.Matrix4()
          .makeTranslation(mercCoord.x, mercCoord.y, mercCoord.z)
          .scale(new THREE.Vector3(scale, -scale, scale))
          .multiply(rotX);

        this.camera.projectionMatrix = mapMatrix.clone().multiply(localMatrix);

        // Rend seulement ce group (masque les autres)
        mapCreatures.forEach((info2) => {
          info2.group.visible = (info2.creature.id === creature.id);
        });
        this.renderer.render(this.scene, this.camera);
      });

      // Restaure visibilité (utile si la scène est inspectée ailleurs)
      mapCreatures.forEach((info) => {
        info.group.visible = !isCaptured(info.creature.id);
      });

      this.map.triggerRepaint();
    },
  };
  map.addLayer(customLayer);
  // Expose au debug pour introspection Chrome DevTools
  window.__debug = { map, mapCreatures, customLayer };
}

// ============================================================
// CAPTURE UI (HUD + Pokéball overlay quand créature proche)
// ============================================================

function showCaptureUI(creature) {
  sceneNameEl.textContent = creature.name;
  sceneTaglineEl.textContent = creature.tagline;
  sceneEl.classList.add('open');
  resetPokeball();
}

function hideCaptureUI() {
  sceneEl.classList.remove('open');
}

// Le bouton close ferme aussi la capture UI (mais nearbyCreature reste, il reviendra vite)
document.getElementById('creature-close').addEventListener('click', () => {
  hideCaptureUI();
  nearbyCreature = null;
});

// ============================================================
// POKÉBALL — swipe gesture + throw animation
// ============================================================
let pokeballState = 'idle';     // idle | dragging | thrown | done
let pkStart = null;             // {x, y}
let pkDelta = null;             // {x, y}

function resetPokeball() {
  pokeballEl.classList.remove('dragging', 'thrown');
  pokeballEl.style.transform = '';
  pokeballEl.style.opacity = '1';
  pokeballState = 'idle';
  pkStart = null; pkDelta = null;
}

function getTouchPoint(e) {
  if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

pokeballEl.addEventListener('touchstart', onPkDown, { passive: false });
pokeballEl.addEventListener('mousedown', onPkDown);
window.addEventListener('touchmove', onPkMove, { passive: false });
window.addEventListener('mousemove', onPkMove);
window.addEventListener('touchend', onPkUp);
window.addEventListener('mouseup', onPkUp);

function onPkDown(e) {
  if (pokeballState !== 'idle' || !sceneEl.classList.contains('open') || !nearbyCreature) return;
  e.preventDefault();
  pkStart = getTouchPoint(e);
  pkDelta = { x: 0, y: 0 };
  pokeballEl.classList.add('dragging');
  pokeballState = 'dragging';
}

function onPkMove(e) {
  if (pokeballState !== 'dragging') return;
  e.preventDefault();
  const p = getTouchPoint(e);
  pkDelta = { x: p.x - pkStart.x, y: p.y - pkStart.y };
  // limite : seul axe Y vers le haut, x suit légèrement
  const tx = pkDelta.x * 0.5;
  const ty = Math.min(0, pkDelta.y);
  const rot = (pkDelta.x * 0.3);
  pokeballEl.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
}

function onPkUp(e) {
  if (pokeballState !== 'dragging') return;
  const distance = Math.hypot(pkDelta.x, pkDelta.y);
  const isUp = pkDelta.y < -40 && distance > 50;
  pokeballEl.classList.remove('dragging');
  if (isUp) {
    throwPokeball();
  } else {
    // retour à la position de départ
    pokeballEl.style.transition = 'transform 0.25s ease-out';
    pokeballEl.style.transform = '';
    pokeballState = 'idle';
    setTimeout(() => { pokeballEl.style.transition = ''; }, 250);
  }
}

function throwPokeball() {
  if (!nearbyCreature) return;
  pokeballState = 'thrown';
  captureInProgress = true;
  pokeballEl.classList.add('thrown');
  const h = window.innerHeight;
  const targetY = -(h * 0.55);
  pokeballEl.style.transform = `translate(0px, ${targetY}px) scale(0.45) rotate(720deg)`;
  setTimeout(() => { triggerCapture(); }, 600);
}

function triggerCapture() {
  const captured = nearbyCreature;
  if (!captured) { captureInProgress = false; return; }

  // Flash blanc plein écran
  flashEl.classList.add('flash');

  // Animer la créature sur la carte : rétrécit (via captureScale multiplicateur)
  const info = mapCreatures.get(captured.id);
  if (info) {
    const start = performance.now();
    const duration = 450;
    function shrink() {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / duration);
      info.captureScale = Math.max(0.0001, 1 - p);
      if (p < 1) requestAnimationFrame(shrink);
    }
    shrink();
  }

  setTimeout(() => { flashEl.classList.remove('flash'); }, 300);

  setTimeout(() => {
    markCaptured(captured.id);
    nearbyCreature = null;
    captureInProgress = false;
    hideCaptureUI();
    // Réinitialise le captureScale pour l'anim (invisible car isCaptured=true)
    if (info) info.captureScale = 1.0;
    showMemoryCard(captured);
  }, 750);
}

// ============================================================
// MEMORY CARD — plein écran immersif + typewriter
// ============================================================
const memoryEl = document.getElementById('memory-card');
const memoryPhotoEl = document.getElementById('memory-photo');
const memoryNameEl = document.getElementById('memory-name');
const memoryPlaceEl = document.getElementById('memory-place');
const memoryTaglineEl = document.getElementById('memory-tagline');
const memoryTextEl = document.getElementById('memory-text');
const memoryActionsEl = document.getElementById('memory-actions');

let typewriterToken = 0;

function showMemoryCard(creature, skipTypewriter = false) {
  memoryPhotoEl.style.setProperty('--photo-url', `url('${creature.capturePhoto}')`);
  memoryNameEl.textContent = creature.name;
  // Le nom du lieu n'est plus affiché (le jardin entier = le lieu du jeu)
  memoryPlaceEl.textContent = '';
  memoryTaglineEl.textContent = creature.tagline;
  memoryTextEl.textContent = '';
  memoryTextEl.classList.remove('done');
  memoryActionsEl.classList.remove('show');
  memoryEl.classList.add('open');
  memoryEl.scrollTop = 0;

  if (skipTypewriter) {
    memoryTextEl.textContent = creature.anecdote;
    memoryTextEl.classList.add('done');
    memoryActionsEl.classList.add('show');
  } else {
    typewriter(creature.anecdote);
  }
}

function typewriter(text) {
  const token = ++typewriterToken;
  let i = 0;
  const baseDelay = 26;
  const variance = 30;
  function step() {
    if (token !== typewriterToken) return;
    if (i < text.length) {
      memoryTextEl.textContent = text.slice(0, ++i);
      const c = text[i - 1];
      // micro-pauses pour ponctuation
      const pause = (c === '.' || c === '!' || c === '?') ? 380
        : (c === ',' || c === ';' || c === ':') ? 180
        : baseDelay + Math.random() * variance;
      setTimeout(step, pause);
    } else {
      memoryTextEl.classList.add('done');
      memoryActionsEl.classList.add('show');
    }
  }
  step();
}

function closeMemoryCard() {
  memoryEl.classList.remove('open');
  typewriterToken++;  // arrête le typewriter en cours
}

document.getElementById('memory-continue').addEventListener('click', () => {
  closeMemoryCard();
  // Si toutes capturées, message final
  if (state.captured.length === CREATURES.length) {
    setTimeout(() => {
      toast('Tu les as toutes trouvées ♥', 4000);
    }, 400);
  } else {
    toast('Reprends la promenade…', 2400);
  }
});
document.getElementById('memory-pokedex').addEventListener('click', () => {
  closeMemoryCard();
  openPokedex();
});

// ============================================================
// Service Worker (PWA install)
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('SW registration failed', err);
    });
  });
}
