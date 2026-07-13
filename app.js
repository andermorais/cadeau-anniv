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

const STATE_KEY = 'cadeau-gui-state-v1';
const INTRO_SEEN_KEY = 'cadeau-gui-intro-seen-v1';

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
if (!localStorage.getItem(INTRO_SEEN_KEY)) {
  introEl.classList.add('open');
}
document.getElementById('intro-start').addEventListener('click', () => {
  introEl.classList.remove('open');
  localStorage.setItem(INTRO_SEEN_KEY, '1');
  startGeolocation();
});

// ---------- MAP ----------
const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
}).setView([MAP_CENTER.lat, MAP_CENTER.lng], MAP_ZOOM);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO',
  maxZoom: 19,
  subdomains: 'abcd',
}).addTo(map);

let meMarker = null;
let myPosition = null;
let debugGpsOverride = false;  // si true, watchPosition n'écrase pas myPosition (mode debug)

function updateMyPosition(lat, lng, accuracy) {
  myPosition = { lat, lng, accuracy };
  if (!meMarker) {
    meMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'me-marker-wrapper',
        html: '<div class="me-marker pulse"></div>',
        iconSize: [0, 0],
      }),
    }).addTo(map);
    map.setView([lat, lng], 18);
  } else {
    meMarker.setLatLng([lat, lng]);
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
let currentSceneCreature = null;  // la créature actuellement affichée en scène
let proximityLocked = false;       // pour éviter re-déclenchement pendant scène

function checkProximity() {
  if (!myPosition || proximityLocked) return;
  for (const c of CREATURES) {
    if (isCaptured(c.id)) continue;
    const d = distanceMeters(myPosition, c.gps);
    if (d <= CAPTURE_RADIUS) {
      openCreatureScene(c);
      return;
    }
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
const logoEl = document.getElementById('logo');
const debugPanelEl = document.getElementById('debug-panel');
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
        map.setView([c.gps.lat, c.gps.lng], 18);
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
// CREATURE SCENE (Three.js + swipe Pokéball)
// ============================================================
const sceneEl = document.getElementById('creature-scene');
const canvasEl = document.getElementById('creature-canvas');
const sceneNameEl = document.getElementById('scene-name');
const sceneTaglineEl = document.getElementById('scene-tagline');
const flashEl = document.getElementById('capture-flash');
const pokeballEl = document.getElementById('pokeball');

const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene3D = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene3D.environment = env;
scene3D.environmentIntensity = 1.0;

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(0, 0.5, 4);
camera.lookAt(0, 0.2, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.8);
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(2, 4, 3);
const rim = new THREE.DirectionalLight(0xff7eb6, 0.6);
rim.position.set(-3, 2, -2);
scene3D.add(ambient, dir, rim);

const sceneRoot = new THREE.Group();
scene3D.add(sceneRoot);

const sharedLoader = new GLTFLoader();

function resizeRenderer() {
  if (!sceneEl.classList.contains('open')) return;
  const w = sceneEl.clientWidth;
  const h = sceneEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeRenderer);

// Le "modèle vivant" et ses mixers
let activeCreature = null;        // {model, mixers[], update(dt,t), dispose()}

async function loadCreatureModel(creature) {
  // Charge le module settings.js dynamiquement
  const mod = await import(`./${creature.settingsModule}`);
  const loader = mod[creature.loader];
  if (!loader) throw new Error(`Loader ${creature.loader} introuvable dans ${creature.settingsModule}`);
  const lights = { ambient, directional: dir, rim };
  return await loader(sceneRoot, lights);
}

async function openCreatureScene(creature) {
  proximityLocked = true;
  currentSceneCreature = creature;

  sceneNameEl.textContent = creature.name;
  sceneTaglineEl.textContent = creature.tagline;
  sceneEl.classList.add('open');
  resizeRenderer();

  // dispose ancien modèle
  if (activeCreature) {
    sceneRoot.clear();
    activeCreature = null;
  }

  try {
    activeCreature = await loadCreatureModel(creature);
  } catch (err) {
    console.error('Erreur chargement créature', err);
    toast('Erreur de chargement (' + creature.name + ')');
    closeCreatureScene();
  }

  resetPokeball();
}

function closeCreatureScene() {
  sceneEl.classList.remove('open');
  proximityLocked = false;
  currentSceneCreature = null;
  if (activeCreature) {
    sceneRoot.clear();
    activeCreature = null;
  }
}
document.getElementById('creature-close').addEventListener('click', closeCreatureScene);

// ---------- Render loop ----------
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!sceneEl.classList.contains('open')) return;
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  if (activeCreature?.update) activeCreature.update(dt, t);
  renderer.render(scene3D, camera);
}
tick();

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
  if (pokeballState !== 'idle' || !sceneEl.classList.contains('open')) return;
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
  pokeballState = 'thrown';
  pokeballEl.classList.add('thrown');
  // monte vers le centre, devient plus petite (perspective)
  const h = sceneEl.clientHeight;
  const targetY = -(h * 0.55);
  pokeballEl.style.transform = `translate(0px, ${targetY}px) scale(0.45) rotate(720deg)`;

  // après l'arrivée, déclenche la capture
  setTimeout(() => {
    triggerCapture();
  }, 600);
}

function triggerCapture() {
  // flash blanc
  flashEl.classList.add('flash');
  // animer la créature qui rétrécit
  if (activeCreature?.model) {
    const start = performance.now();
    const duration = 450;
    const initialScale = activeCreature.model.scale.x;
    const initialRotY = activeCreature.model.rotation.y;
    function shrink() {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / duration);
      const s = initialScale * (1 - t);
      activeCreature.model.scale.setScalar(Math.max(0.001, s));
      activeCreature.model.rotation.y = initialRotY + t * Math.PI * 2;
      if (t < 1) requestAnimationFrame(shrink);
    }
    shrink();
  }

  setTimeout(() => { flashEl.classList.remove('flash'); }, 300);

  // après le flash, marque comme capturée et ouvre la carte souvenir
  setTimeout(() => {
    if (!currentSceneCreature) return;
    markCaptured(currentSceneCreature.id);
    const c = currentSceneCreature;
    closeCreatureScene();
    showMemoryCard(c);
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
  memoryPlaceEl.textContent = creature.place;
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
