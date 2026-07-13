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
    capturePhoto: 'images/01_jeanlouisaure_card.png',  // photo souvenir à mettre
    anecdote: `C'était l'époque où tu passais à Crimée tous les matins en allant au boulot. Et moi j'habitais juste à côté. On s'est croisés cent fois sans se voir. Puis un soir l'app nous a dit : 90% de compatibilité, 800 mètres. Premier match. Premier "salut" tapé à 23h. Tu m'as répondu sept minutes plus tard. La suite, tu la connais.`,
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
    anecdote: `Quai des Célestins, le premier vrai face-à-face. J'avais préparé trois sujets de conversation, j'en ai oublié deux dans la première minute. Toi tu m'as regardé avec un sourire en coin, et tu as dit un truc tellement bête que tout le stress est tombé. On a marché jusqu'à l'île Saint-Louis sans regarder l'heure.`,
    settingsModule: 'settings/quoikoube_settings.js',
    loader: 'loadQuoikoube',
  },
  {
    id: 'taytay',
    order: 3,
    name: 'Tay-tay',
    tagline: 'Une chanson, un écouteur, et tout a changé.',
    gps: { lat: 48.84620, lng: 2.33710 },
    place: 'Grand bassin octogonal',
    capturePhoto: 'images/03_taytay_card.png',
    anecdote: `Cette après-midi-là, on s'était donné rendez-vous au grand bassin sans plan précis. Tu marchais à côté de moi avec un écouteur dans une oreille — l'autre, tu me l'as tendu sans rien dire. C'était Daylight. Tu chantonnais entre tes dents, tu connaissais chaque mot. Je t'ai regardé, et j'ai compris. Quand le soleil a commencé à baisser, on n'a rien dit. Mais on est rentrés ensemble, même écouteur dans l'oreille.`,
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
    anecdote: `Ce sont les deux phrases qu'on se balance dix fois par semaine. "Ah bah d'accord" quand l'un commande sans demander à l'autre. "Tu es une personne abjecte" quand l'un vole le dernier morceau de pain. Personne d'autre ne comprend pourquoi on rit. C'est devenu notre code à nous.`,
    settingsModule: 'settings/abjectus_settings.js',
    loader: 'loadAbjectus',
  },
  {
    id: 'bahdaccord',
    order: 5,
    name: 'Bahdaccord',
    tagline: 'Le shiny qui ne viendra jamais.',
    gps: { lat: 48.84840, lng: 2.33730 },
    place: 'Devant le palais du Sénat',
    capturePhoto: 'images/05_bahdaccord_card.png',
    anecdote: `Le Pokémon GO, c'est toi. Le grand bassin, les raids, les PokéStops devant le Sénat, tout ça. La première fois que je t'ai vu chasser, je t'ai trouvé ridicule, attendrissant, magnifique. Tu m'as expliqué les CP, les IV, les shinies. Je n'ai rien compris. Je t'ai écouté parler une heure. C'est là que j'ai commencé à t'aimer pour de bon.`,
    settingsModule: 'settings/jeboudelix_settings.js',
    loader: 'loadJeboudelix',
  },
  {
    id: 'jeboudelix',
    order: 6,
    name: 'Jeboudelix',
    tagline: 'Toutes les vies qu\'on n\'a pas encore vécues.',
    gps: { lat: 48.84770, lng: 2.33800 },
    place: 'Fontaine Médicis',
    capturePhoto: 'images/06_jeboudelix_card.png',
    anecdote: `Tu boudes plus souvent que moi, c'est un fait. Mais c'est toujours toi qui reviens en premier. On a commencé à parler d'un appart à nous. Pas pour fuir nos chez-nous séparés — pour en construire un troisième, qui serait le vrai. Huit avenirs possibles, comme un Évoli. Je les prendrais tous avec toi.`,
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
