// ============================================================
// Configuration des 6 créatures du Cadeau Guillaume
// ============================================================
// GPS, photo, anecdote, settings Three.js, mode de chargement.
// Édité par Andy avec les coordonnées GPS exactes des spots au Luxembourg.

export const CREATURES = [
  {
    id: 'jeanlouisaure',
    order: 1,
    name: 'Jeanlouisaure',
    tagline: 'Tu étais à 800 mètres et tu ne le savais pas.',
    gps: { lat: 48.84720, lng: 2.33530 },
    place: 'Porte de Vaugirard',
    capturePhoto: 'images/01_jeanlouisaure_card.png',
    anecdote: `Tu passais tous les matins dans le métro juste à côté de chez moi, sans le savoir. Puis une app nous a fait signe. Le reste, tu le connais.`,
    settingsModule: 'settings/jeanlouisaure_settings.js',
    loader: 'loadJeanlouisaureHybrid',  // hybride : blob + jl
  },
  {
    id: 'quoikoube',
    order: 2,
    name: 'Quoikoubé',
    tagline: 'Premier rendez-vous, premier flottement.',
    gps: { lat: 48.84800, lng: 2.33700 },
    place: 'Allée près du palais du Sénat',
    capturePhoto: 'images/02_quoikoube_card.png',
    anecdote: `Notre premier vrai face-à-face. Tout ce que j'avais préparé, envolé. Tu as souri, et c'est parti.`,
    settingsModule: 'settings/quoikoube_settings.js',
    loader: 'loadQuoikoube',
  },
  {
    id: 'taytay',
    order: 3,
    name: 'Tay-tay',
    tagline: 'Ton artiste préférée, tu sais toutes les coréos.',
    gps: { lat: 48.84620, lng: 2.33710 },
    place: 'Grand bassin octogonal',
    capturePhoto: 'images/03_taytay_card.png',
    anecdote: `Tu es fan de Taylor Swift à un niveau qui devrait être illégal. Je râle. Je chantonne quand même.`,
    settingsModule: 'settings/taytay_settings.js',
    loader: 'loadTayTay',
  },
  {
    id: 'abjectus',
    order: 4,
    name: 'Abjectus',
    tagline: 'Tu es une personne abjecte. ♥',
    gps: { lat: 48.84660, lng: 2.33680 },
    place: 'Allée des reines de France',
    capturePhoto: 'images/04_abjectus_card.png',
    anecdote: `« Tu es une personne abjecte. » « Ah bah d'accord. » Deux phrases, dix fois par semaine. Notre code à nous.`,
    settingsModule: 'settings/abjectus_settings.js',
    loader: 'loadAbjectus',
  },
  {
    id: 'bahdaccord',
    order: 5,
    name: 'Bahdaccord',
    tagline: 'Bah, d\'accord.',
    gps: { lat: 48.84840, lng: 2.33730 },
    place: 'Devant le palais du Sénat',
    capturePhoto: 'images/05_bahdaccord_card.png',
    anecdote: `Ta phrase préférée quand tu es d'accord sans l'être vraiment. On ne sait jamais si c'est oui ou non. Mais c'est toi.`,
    settingsModule: 'settings/jeboudelix_settings.js',
    loader: 'loadJeboudelix',
  },
  {
    id: 'jeboudelix',
    order: 6,
    name: 'Jeboudelix',
    tagline: 'Tu boudes. Souvent.',
    gps: { lat: 48.84770, lng: 2.33800 },
    place: 'Fontaine Médicis',
    capturePhoto: 'images/06_jeboudelix_card.png',
    anecdote: `Personne ne boude aussi joliment que toi. Tu croises les bras, tu détournes le regard, tu attends. Et tu reviens toujours en premier.`,
    settingsModule: 'settings/bahdaccord_settings.js',
    loader: 'loadBahdaccord',
  },
];

// Distance en mètres pour déclencher la capture
export const CAPTURE_RADIUS = 25;

// Centre par défaut de la carte (entrée du jardin)
export const MAP_CENTER = { lat: 48.84660, lng: 2.33700 };
export const MAP_ZOOM = 17;

// Calcule la distance entre 2 points GPS en mètres (Haversine)
export function distanceMeters(a, b) {
  const R = 6371000;
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const Δφ = (b.lat - a.lat) * Math.PI / 180;
  const Δλ = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}
