# Carte Stellaire — `carte-stellaire-manhwa`

Carte de l'univers en plein écran (calque `#csm-overlay` + iframe `app/carte.html`) et Flotte des Groupes MJ. L'hôte (`scripts/main.js`) et l'iframe dialoguent par `postMessage` (`init`, `fleet`, `play-trip`, `set-fleet`, `show-trip`).

Code de la version **1.11.3** (dernière release), pour Foundry VTT v13.

## Liens avec la suite Manhwa

La suite compte un système (Fiche - Manhwa) et 11 modules. La Fiche est le centre : les données partagées y vivent et les modules les lisent via `globalThis.MANHWA`.

- Lit les Groupes MJ de la Fiche (`MANHWA.gmGroups` + hook `manhwaGmGroups`).
- Fournit les lieux au bandeau de la Boutique, aux Scénarios et au Domaine.
- Renvoie vers le Worldbook.
- Règle commune : un module ne plante jamais si un autre est absent (vérifier `game.modules.get(id)?.active` avant d'appeler son API).

## À savoir

`app/carte.html` **est la source** du moteur de la carte (≈ 800 Ko) : on le modifie directement. Les anciennes sources `src/*.js` et `src/build.py` n'existent plus. Test hors Foundry : servir le dossier (`python3 -m http.server`) et ouvrir `app/carte.html`.

## Livraison

1. Augmenter `version` dans `module.json` (jamais deux livraisons au même numéro).
2. Construire le zip, qui doit contenir le dossier `carte-stellaire-manhwa/` :
   ```bash
   mkdir -p build/carte-stellaire-manhwa && git archive HEAD | tar -x -C build/carte-stellaire-manhwa
   cd build && zip -qr carte-stellaire-manhwa.zip carte-stellaire-manhwa
   ```
3. Créer la release GitHub `vX.Y.Z` avec **exactement 2 fichiers** : `module.json` et `carte-stellaire-manhwa.zip`. Le manifeste pointe vers `releases/latest/download/…`.
4. The Forge : Bazaar → *Install From Manifest* avec l'URL versionnée `https://github.com/blendbastien/carte-stellaire-manhwa/releases/download/vX.Y.Z/module.json`. Ne jamais utiliser *Update All Packages*.
5. Redémarrer le monde de test, vérifier la version installée et tester.
