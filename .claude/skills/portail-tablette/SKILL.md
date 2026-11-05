---
name: portail-tablette
description: Règles pour le portail tablette léger (portail/) qui pilote Home Assistant depuis un iPad sous iOS 9 — JavaScript ES5 uniquement, ajout d'équipements dans maison.json, liste blanche d'actions du relais, code couleur par niveau, tests. À utiliser dès qu'on modifie portail/, qu'on ajoute un équipement à la tablette ou qu'on touche à l'interface.
---

# Portail tablette — règles

Référence produit : `docs/PRD.md`. L'iPad est sous **iOS 9** (Safari 9) : le frontend
Home Assistant ne s'y affiche pas, d'où ce portail servi par le serveur sur le port 8124.

## Architecture
- `portail/server.py` : Python standard, sert `static/` et relaie vers Home Assistant.
  Le jeton `HA_TOKEN` (.env) ne quitte jamais le serveur.
- Seules passent les actions de `ACTIONS` / `ACTIONS_NIVEAU`, sur les entités déclarées
  dans `portail/maison.json`. Nouvelle action = l'ajouter à la liste blanche **et** un test.
- `portail/maison.json` : niveaux → pièces → équipements (`entity_id`, `nom`, `icone` emoji).
  Ajouter un équipement = une ligne ici, rien d'autre (l'entité doit exister dans HA).

## Compatibilité Safari 9 (bloquant)
- JavaScript **ES5** : pas de `let`/`const`, `=>`, template strings, `fetch`, `Promise`
  obligatoires, `class`, spread, `Array.from`, `Object.assign`. XHR uniquement.
- CSS : pas de variables CSS, pas de `grid`, pas de `gap` en flexbox ; doubler `display:flex`
  avec `display:-webkit-flex` (et `-webkit-flex`, `-webkit-align-items`…).
- Vérifier avant commit :
  `node -e "require('acorn').parse(require('fs').readFileSync('portail/static/app.js','utf8'),{ecmaVersion:5})"`

## Interface
- Onglets fixes en haut : Accueil `#3949AB`, RDC `#FB8C00`, Étage `#43A047`. La couleur du
  niveau est reprise sur l'onglet actif, l'en-tête et la bordure des tuiles.
- 2 touchers max : onglet puis tuile. Pas de sous-page ; volets et TV ont leurs boutons
  directement dans la tuile.
- Cibles ≥ 64 px, texte ≥ 18 px. Actif = couleur vive (lumière ambre, volet bleu, média
  violet), inactif = neutre. Retour visuel immédiat (état optimiste), message rouge si échec.
- Thème sombre automatique de 20 h à 7 h. Retour à l'Accueil après 2 min sans toucher.
- Rafraîchissement des états toutes les 2 s ; ne jamais reconstruire une vue entière à
  chaque rafraîchissement (un toucher en cours serait perdu).

## Tests
`python3 -m unittest discover -s tests -v` (faux Home Assistant intégré).

## Achats
Tout besoin de matériel découvert en session s'ajoute à `docs/ACHATS.md` (article, usage, prix vérifié, lien, statut).
