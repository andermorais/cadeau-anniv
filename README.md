# Cadeau Guillaume — PWA V1

PWA Pokémon-GO-like géolocalisée pour le jardin du Luxembourg.
6 créatures-souvenirs cachées sur des spots GPS, capture par swipe Pokéball, carte-souvenir typewriter.

---

## Structure

```
pwa/
├── index.html              ← entrée HTML
├── app.js                  ← orchestrateur (carte, géoloc, capture, pokédex, debug)
├── creatures.js            ← config des 6 créatures (GPS, anecdotes, settings)
├── manifest.json           ← PWA manifest (install écran d'accueil iPhone)
├── service-worker.js       ← cache offline
├── settings/               ← 6 modules Three.js validés dans le preview
│   ├── jeanlouisaure_settings.js    (hybride blob + JL)
│   ├── quoikoube_settings.js
│   ├── taytay_settings.js
│   ├── abjectus_settings.js
│   ├── bahdaccord_settings.js
│   └── jeboudelix_settings.js
├── models/                 ← les 7 fichiers .glb
├── images/                 ← photos pour Pokédex + carte-souvenir (V1 ChatGPT)
└── icons/                  ← à remplir (192x192, 512x512 pour PWA)
```

## Tester en local

Le code utilise des modules ES, donc **il faut un serveur HTTP**, pas une ouverture `file://`.

```bash
cd "Cadeau Gui/pwa"
python3 -m http.server 8000
# ouvrir http://localhost:8000 dans le navigateur
```

Sur iPhone (sur le même Wi-Fi que le Mac) :
1. Trouve l'IP du Mac : Réglages > Réseau, ou `ipconfig getifaddr en0` dans Terminal
2. Sur iPhone Safari : `http://<IP-du-Mac>:8000`
3. Bouton de partage → "Sur l'écran d'accueil" → installable comme une vraie app

**Test des créatures sans aller au Luxembourg** : triple-tap sur le 🌸 en haut à gauche → panel debug avec téléportation directe.

## Déployer (Netlify)

1. Crée un compte sur [netlify.com](https://www.netlify.com/)
2. Drag-drop le dossier `pwa/` complet sur la page "Sites"
3. Tu obtiens une URL `https://cadeau-gui-xxxx.netlify.app`
4. Donne le lien à Guillaume (par QR code imprimé en plus, recommandé)

## ⚠️ Optimisations à faire avant livraison

### 1. Taille des `.glb` (URGENT)

Les modèles font 20-30 MB chacun. **Total : ~140 MB.** Trop lourd pour la 4G du Luxembourg.

→ Installer **gltfpack** et compresser tous les modèles :

```bash
npm install -g gltfpack
cd pwa/models
for f in *.glb; do
  gltfpack -i "$f" -o "${f%.glb}_compressed.glb" -tc
  # -tc : compression de textures KTX2 (très efficace)
done
```

Attendu : ~2-5 MB par fichier après compression. Diviser le total par 8-10.

Une fois compressés, remplacer les originaux et **importer DRACOLoader + KTX2Loader** dans `app.js`.

### 2. Photos souvenirs

Les images `images/*_card.png` sont pour l'instant les **rendus ChatGPT V1 des créatures**.

Tu peux les remplacer par les **vraies photos** de vous deux (selfie au grand bassin, premier RDV, etc.) — même dimensions (carré idéalement), même noms de fichiers.

### 3. Anecdotes

Les textes dans `creatures.js` sont la v1 de ce qu'on avait écrit ensemble. Relis-les à tête reposée et ajuste le ton/les détails.

### 4. Icônes PWA

Crée 2 icônes dans `icons/` :
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Pas urgent — fonctionne sans, mais ça fait pro à l'install.

## Flux utilisateur (Guillaume)

```
┌─ Ouvre l'app (lien envoyé / icône écran d'accueil)
│
├─ Écran de bienvenue (1x) ──► "Commencer"
│
├─ Map sombre du Luxembourg, marqueur GPS bleu pulsant
│   │
│   └─ Il marche dans le jardin
│       │
│       └─ S'approche à <25m d'un spot
│           │
│           ├─ La créature 3D apparaît plein écran (anim idle)
│           │   │
│           │   ├─ Nom + tagline en haut
│           │   ├─ Pokéball rouge/blanche en bas
│           │   │
│           │   └─ Swipe up sur la Pokéball
│           │       │
│           │       ├─ Anim throw + flash + capture
│           │       │
│           │       └─ Carte-souvenir plein écran
│           │           │
│           │           ├─ Photo de vous
│           │           ├─ Anecdote en typewriter
│           │           │
│           │           └─ "Continuer ♥" → retour à la map
│           │
│           └─ Compteur Pokédex incrémenté (1/6, 2/6...)
│
└─ Toutes capturées → message final "Tu les as toutes trouvées ♥"
```

## Mode debug (toi)

- **Triple-tap sur le 🌸** : ouvre le panel
  - Boutons par créature → déclenche la scène directement (sans GPS)
  - Reset Pokédex
- **Tester en marchant** : iPhone dans la main, ouvre Safari sur l'URL, le GPS marche en arrière-plan

## Crédits

- Créatures 2D : ChatGPT (gpt-image-2)
- 3D : Meshy 6
- Carte : Leaflet + CARTO dark tiles
- 3D engine : Three.js
- Code et concept : Andy ♥
