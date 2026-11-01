---
name: ha-tablet-dashboard
description: Règles de design et recettes YAML pour le dashboard Home Assistant de la tablette (vieil iPad) — navigation par niveau de la maison, code couleur, grandes cibles tactiles, cartes Mushroom / button-card / card-mod, popups, mode kiosque. À utiliser dès qu'on crée ou modifie une vue Lovelace, un thème, une carte, ou qu'on ajoute un équipement au dashboard.
---

# Dashboard tablette — règles de design

Objectif : un portail **coloré, intuitif, où l'on ne se perd jamais**, utilisable par toute la
famille, sur un **vieil iPad** (performances limitées). Référence produit : `docs/PRD.md`.

## 1. Architecture de navigation

- Fichier : `homeassistant-config/lovelace/tablet.yaml`, avec une vue (onglet) par niveau, plus une vue Accueil.
- Les vues sont dans cet ordre : `Accueil` → `RDC` → `Étage`. La maison n'a que 2 niveaux ; le garage et l'extérieur sont dans le RDC.
- Le dashboard est servi par le serveur Home Assistant. L'iPad ne fait qu'ouvrir la page dans Safari, sans application.
- Chaque vue a `path`, `icon` et `title` courts (≤ 12 caractères), sans emoji dans le titre de l'onglet. Les emojis vont dans les en-têtes de sections.
- Type de vue : `type: sections` (grille responsive native). Repli `custom:layout-card` / `masonry` si l'iPad gère mal les sections.
- Dans une vue de niveau, l'ordre est toujours le même :
  1. **En-tête coloré** du niveau : nom, icône, compteur « 3 lumières allumées ».
  2. **Actions rapides du niveau** : tout éteindre, volets ↑, volets ↓.
  3. **Une section par pièce**, chaque section dans l'ordre lumières → volets → médias → climat → autres.
- Profondeur maximale : onglet > carte > popup (`browser_mod.popup` ou `more-info`). Jamais de sous-vue cachée.

## 2. Code couleur (repérage)

**Couleur de niveau**, utilisée pour l'en-tête de la vue, la bordure gauche des cartes et l'onglet actif :

| Niveau | Couleur | Variable de thème |
|--------|---------|-------------------|
| Accueil | `#3949AB` | `--level-home` |
| RDC | `#FB8C00` | `--level-ground` |
| Étage | `#43A047` | `--level-upstairs` |

**Couleur de catégorie** : elle s'applique à l'icône quand l'état est actif. Un état inactif est gris neutre.

| Catégorie | Actif | Mushroom `icon_color` |
|-----------|-------|-----------------------|
| Lumière | ambre `#FFB300` | `amber` |
| Volet ouvert | bleu `#1E88E5` | `blue` |
| Média / TV allumée | violet `#8E24AA` | `purple` |
| Chauffage / clim | rouge `#E53935` / cyan `#00ACC1` | `red` / `cyan` |
| Sécurité OK / alerte | vert `#43A047` / rouge `#E53935` | `green` / `red` |

Règles :
- Ne jamais coder une couleur en dur dans une carte : passer par les variables du thème `homeassistant-config/themes/tablette.yaml`.
- Le contraste texte/fond doit être ≥ 4.5:1, à vérifier en thème clair **et** sombre.
- La couleur seule ne suffit jamais : toujours une icône et un libellé d'état (« Ouvert 60 % »).

## 3. Taille et ergonomie tactile

- Cible tactile ≥ **64 px** de haut ; boutons d'action rapide ≈ 96 px.
- Texte ≥ 18 px, état ≥ 16 px. Icônes 36-48 px.
- Carte « lumière » : **tap = basculer**, **appui long = popup** (variateur ou couleur).
- Carte « volet » : 3 boutons ↑ ■ ↓ visibles directement ; position en % dans la popup.
- Carte « TV » : marche/arrêt et volume ± visibles ; source, chaînes et pavé directionnel en popup.
- Actions sensibles (garage, portail, « tout éteindre ») : `confirmation: text: ...`.

## 4. Briques HACS (ordre de préférence)

1. **Mushroom** (`custom:mushroom-*`) : cartes de base, légères et jolies. Par défaut.
2. **card-mod** : bordure de niveau, arrondis, couleurs via variables.
3. **button-card** : en-têtes de niveau et boutons d'actions rapides (templates réutilisables).
4. **browser_mod** : popups.
5. **kiosk-mode** : masquer l'en-tête et la barre latérale sur la tablette (`?kiosk`).
6. **mini-graph-card** : températures (avec parcimonie).
7. **Bubble Card** : uniquement si l'iPad le fait tourner de façon fluide.

Toute nouvelle ressource doit être déclarée dans `lovelace/resources.yaml`.

## 5. Recettes YAML

### Template button-card : en-tête de niveau

```yaml
button_card_templates:
  level_header:
    show_icon: true
    show_name: true
    show_label: true
    styles:
      card:
        - background: var(--level-color)
        - color: white
        - border-radius: 20px
        - padding: 16px 20px
        - height: 96px
      grid:
        - grid-template-areas: '"i n" "i l"'
        - grid-template-columns: 64px 1fr
      icon: [width: 48px, color: white]
      name: [font-size: 26px, font-weight: 700, justify-self: start]
      label: [font-size: 16px, opacity: 0.9, justify-self: start]
```

Utilisation (le nombre de lumières allumées est calculé dans `label`) :

```yaml
- type: custom:button-card
  template: level_header
  name: Rez-de-chaussée
  icon: mdi:sofa
  variables: { area: rez_de_chaussee }
  styles: { card: [--level-color: 'var(--level-ground)'] }
  label: >
    [[[ const on = Object.values(states).filter(s => s.entity_id.startsWith('light.')
        && s.state === 'on' && (s.attributes.area === variables.area)).length;
        return on ? `${on} lumière(s) allumée(s)` : 'Tout est éteint'; ]]]
```

### Carte lumière (Mushroom + bordure de niveau)

```yaml
- type: custom:mushroom-light-card
  entity: light.salon_principale
  name: Salon
  icon_color: amber
  show_brightness_control: true
  tap_action: { action: toggle }
  hold_action: { action: more-info }
  card_mod:
    style: |
      ha-card { border-left: 6px solid var(--level-ground); min-height: 72px; }
```

### Carte volet

```yaml
- type: custom:mushroom-cover-card
  entity: cover.volet_salon
  name: Volet salon
  show_buttons_control: true
  show_position_control: false
  card_mod:
    style: |
      ha-card { border-left: 6px solid var(--level-ground); }
```

### Carte TV

```yaml
- type: custom:mushroom-media-player-card
  entity: media_player.tv_salon
  name: TV salon
  icon_color: purple
  use_media_info: true
  show_volume_level: true
  media_controls: [on_off, play_pause_stop]
  volume_controls: [volume_mute, volume_buttons]
  hold_action: { action: more-info }
```

### Action rapide de niveau

```yaml
- type: custom:mushroom-template-card
  primary: Tout éteindre
  icon: mdi:lightbulb-group-off
  icon_color: grey
  tap_action:
    action: perform-action
    perform_action: light.turn_off
    target: { area_id: rez_de_chaussee }
    confirmation: { text: Éteindre tout le rez-de-chaussée ? }
```

> Les **Areas** (pièces) et **Floors** (niveaux) se déclarent dans Home Assistant
> (Paramètres > Zones, étiquettes et étages). Toujours cibler `area_id` / `floor_id` plutôt
> qu'une liste d'entités en dur, pour qu'un nouvel équipement apparaisse tout seul dans les actions.

## 6. Thème

Fichier `homeassistant-config/themes/tablette.yaml`, chargé via `frontend: themes: !include_dir_merge_named themes`.
Il contient deux modes (`modes: light / dark`) et les variables `--level-*`. Rayon des cartes : 20 px.
Police système. Bascule automatique sur le thème sombre au coucher du soleil (automatisation `frontend.set_theme`).

## 7. Contraintes « vieil iPad »

- Pas de `floor3d-card`, de vidéo en continu, d'images de fond lourdes ni d'animations CSS infinies sur les vues de la tablette.
- ≤ 40 entités visibles par vue. Images en WebP/PNG compressé ≤ 100 Ko.
- Tester chaque nouvelle carte **sur l'iPad réel** avant de la généraliser.
- Si Safari est trop ancien pour le frontend Home Assistant, voir le plan B dans `docs/PRD.md` §7.

## 8. Checklist avant de valider une vue

- [ ] Couleur de niveau présente sur l'en-tête et sur les cartes.
- [ ] Toutes les actions courantes accessibles en ≤ 2 touchers depuis l'Accueil.
- [ ] Cibles tactiles ≥ 64 px, texte ≥ 18 px.
- [ ] États actif et inactif distincts par la couleur **et** par le libellé.
- [ ] Confirmation sur les actions sensibles.
- [ ] Testé en thème clair et sombre, et sur l'iPad.
- [ ] `check_config` OK.
