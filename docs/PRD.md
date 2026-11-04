# PRD — Portail domotique tablette

> PRD du projet **et** prompt de référence à donner à Claude en début de session.
> Les points `⚠️` attendent une réponse de Karim avant de coder la partie concernée.
> État d'avancement : [`PROJECT_STATE.md`](../PROJECT_STATE.md).

## 1. Objectif

> « Depuis le vieil iPad du salon, n'importe qui dans la maison (adultes, enfants, invités)
> pilote lumières, volets, TV et garage **en 2 touchers maximum**, sans jamais se perdre. »

Indicateurs de réussite :
- **2 touchers max** pour toute action courante : l'onglet du niveau, puis la tuile.
- **Retour visuel < 1 s** après un toucher ; message clair si l'appareil ne répond pas.
- On sait toujours **à quel niveau on est** (couleur, onglet actif, titre).
- L'iPad tient **7 jours sans intervention** (pas de veille, reconnexion automatique).
- La maison fonctionne **sans l'iPad** : les interrupteurs et télécommandes restent utilisables.

## 2. Architecture (décidée)

```
[Équipements] ⇄ [Serveur pcdomotique : Home Assistant + portail (Docker)] ⇄ Wi-Fi ⇄ [iPad iOS 9 : Safari]
                                    port 8123 (admin, depuis un PC)      port 8124 (tablette)
```

- **L'iPad est sous iOS 9** : le frontend Home Assistant n'y fonctionne pas. On utilise donc
  le **plan B** : un **portail web léger** (`portail/`) hébergé sur le serveur, en JavaScript
  ES5, qui pilote Home Assistant par son API REST.
- **Rien n'est installé sur l'iPad** : un raccourci Safari sur l'écran d'accueil.
- Home Assistant reste le cerveau : intégrations, automatisations, scènes, codes Broadlink.
  Son interface (port 8123) sert à l'administration depuis un PC ou un téléphone récent.
- Le portail garde le jeton Home Assistant côté serveur et n'accepte qu'une **liste blanche
  d'actions** sur les équipements déclarés dans `portail/maison.json`.
- Tout tourne dans `~/home-automation` sur le serveur (`docker compose up -d`).

## 3. Inventaire des équipements

Scan réseau du 04/11/2026 : [`docs/scan-report.md`](scan-report.md).

| Catégorie | Équipement | Adresse | Intégration HA | Statut |
|-----------|-----------|---------|----------------|--------|
| 💡 Lumières | Salon, spots salon, cuisine, chambre, salle de bain (relais 1-5) | IPX800 V3 · 192.168.1.250 | `rest_command` + `light.template` | ✅ en service |
| 💡 Lumières | Relais 6 à 8 | IPX800 V3 | idem | ⚠️ à quoi sont-ils reliés ? |
| 🎛️ Télécommande universelle | Broadlink **RM4 Pro** (IR + RF 433 MHz) | 192.168.1.64 | `broadlink` → `remote.broadlink` | ✅ intégré 04/11, codes à apprendre |
| 🪟 Volets | Moteurs **Came**, télécommandes RF | via Broadlink | `remote.send_command` + `cover.template` | 📋 test d'apprentissage à faire (§6) |
| 🚪 Garage | Porte de garage, marque inconnue | ⚠️ | ⚠️ | 📋 à identifier |
| 📺 TV salon | **Xiaomi** MiTV (Google TV) | 192.168.1.45 | `androidtv_remote` → `media_player.salon` | ✅ intégrée 04/11, sur la tablette |
| 📺 TV chambre de Naïm | **Philips** 43PUS7608/12 (filaire) | 192.168.1.144 | `philips_js` → `media_player.43pus7608_12` + Ambilight | ✅ intégrée 04/11, sur la tablette |
| 📺 Chambre | **Xiaomi** TV Box (Android TV 12) | 192.168.1.59 | `androidtv_remote` | 📋 association (code à l'écran) |
| 📺 Chambre | **Apple TV 4** « Chambre » (filaire) | 192.168.1.136 ? | `apple_tv` | 📋 association (code à l'écran) |
| 📡 Box | **Freebox** v8 | 192.168.1.254 | `freebox` (débits, appels, Wi-Fi) | ✅ intégrée 04/11 (Wi-Fi et redémarrage volontairement absents de la tablette) |
| 🔌 Tuya / Smart Life | « Passerelle ZigBee » (Tuya + HomeKit « Gateway-type c ») + 1 autre appareil Tuya | 192.168.1.145 / .155 | `homekit_controller` (local) ou `tuya` (cloud) | ⚠️ cloud déconnecté ; appairage HomeKit possible avec le code à 8 chiffres de la passerelle |
| 🔊 Audio | Enceinte Spotify Connect | 192.168.1.157 | `spotify` | hors V1 |
| 🖥️ NAS | Synology DS216se | 192.168.1.134 | `synology_dsm` | hors V1 |

Règle : on n'intègre **que ce qui est confirmé**. Aucune entité inventée.

## 4. Niveaux, navigation, interface

3 onglets fixes en haut de l'écran :

| Onglet | Couleur | Contenu |
|--------|---------|---------|
| 🏠 **Accueil** | `#3949AB` | Heure en grand, scènes, tout ce qui est allumé/ouvert (un toucher l'éteint) |
| 🛋 **RDC** | `#FB8C00` | Salon, cuisine ⚠️ + entrée, garage, extérieur ? |
| 🛏 **Étage** | `#43A047` | Chambre, chambre de Naïm, salle de bain ⚠️ (niveau de la chambre de Naïm à confirmer) |

⚠️ Répartition actuelle supposée (salon/cuisine au RDC, chambre/SdB à l'étage) : à confirmer.

- Une **section par pièce**, toujours dans l'ordre lumières → volets → médias → autres.
- En tête de chaque niveau : **Tout éteindre**, **Ouvrir / Fermer les volets du niveau**.
- Tuiles ≥ 64 px, texte ≥ 18 px. Allumé = couleur vive (lumière ambre, volet bleu, TV violet),
  éteint = neutre. Volets : ▲ ■ ▼ directement sur la tuile. TV : marche/arrêt, volume, pause.
- Thème sombre automatique la nuit, retour à l'Accueil après 2 min d'inactivité.
- Règles techniques détaillées : skill `.claude/skills/portail-tablette/SKILL.md`.

## 5. iPad (iOS 9)

- Ouvrir `http://192.168.1.37:8124` dans Safari → Partager → **Sur l'écran d'accueil**
  (plein écran, sans barre Safari).
- Réglages → Luminosité → Verrouillage auto : **Jamais** ; iPad branché en permanence.
- Réglages → Général → Accessibilité → **Accès guidé** pour bloquer l'iPad sur le portail.
- ⚠️ Modèle exact (Réglages → Général → Informations) : utile si l'écran est petit (iPad mini).

## 6. Broadlink RM4 Pro et volets Came

Constat du 04/11 : le RM4 Pro répond sur le réseau, il est **non verrouillé** et accepte la
connexion depuis le serveur. Le blocage venait de l'appli, pas de l'appareil.

1. **Test d'apprentissage hors Home Assistant**, avec `scripts/broadlink-rf.py` :
   balayage de fréquence (bouton maintenu), puis appui court ; on renvoie ensuite le code et on
   regarde si le volet bouge. À faire ensemble, une télécommande Came à la main.
2. **Risque principal** : certaines télécommandes Came utilisent un **code tournant**
   (gammes ATOMO, TWIN…), qui n'est pas apprenable. Les télécommandes à code fixe (ex.
   TOP-432EE) le sont. ⚠️ Référence écrite au dos de la télécommande des volets ?
3. Si le code est apprenable : intégration `broadlink` dans HA, apprentissage
   monter / stop / descendre par volet, puis un `cover.template` par volet (état « optimiste »
   et durée de course pour estimer la position).
4. Si le code n'est pas apprenable : piloter les moteurs autrement (récepteur Came compatible,
   module filaire sur l'IPX800 ou module Zigbee). Décision à prendre après le test.
5. Le RM4 Pro sert aussi de télécommande **infrarouge** pour ce qui n'est pas pilotable en IP.

## 7. Périmètre

**V1** : lumières IPX800 · volets via Broadlink (si apprenables) · TV Xiaomi, Philips et
boîtier · Freebox · garage (selon matériel) · portail tablette par niveau · scènes · iPad en
kiosque.

**Hors V1** : accès depuis l'extérieur (Cloudflare, Nabu Casa), assistants vocaux, plan 3D,
caméras, suivi d'énergie, NAS.

## 8. Critères d'acceptation

- [ ] L'inventaire §3 ne contient plus de ⚠️.
- [ ] Chaque équipement de l'inventaire a une entité HA qui marche **depuis l'iPad**.
- [ ] Accueil + un onglet par niveau, chacun à sa couleur ; toute action courante en 2 touchers.
- [ ] Les volets montent, descendent et s'arrêtent depuis la tablette.
- [ ] Chaque TV s'allume, s'éteint et change de volume depuis la tablette.
- [ ] `check_config` passe sans erreur ; `python3 -m unittest discover -s tests` passe.
- [ ] L'iPad tient 7 jours sans intervention.

## 9. Jalons

| Jalon | Contenu | Statut |
|-------|---------|--------|
| J0 | Inventaire réseau | ✅ 04/11 |
| J1 | iPad identifié (iOS 9) → portail léger | ✅ décidé 04/11 |
| J2 | Socle : dépôt unique, config nettoyée, HA relancé, portail lumières | 🔄 04/11 |
| J3 | Broadlink : test RF Came, puis volets | 📋 |
| J4 | TV Xiaomi / Philips, Freebox, Tuya, garage | 🔄 Broadlink, Freebox, TV salon et Philips faits le 04/11 |
| J5 | Scènes et automatisations réelles (volets au coucher du soleil…), test 7 jours | 📋 |

## 10. Questions ouvertes

- ⚠️ Référence de la télécommande Came des volets ; nombre de volets et pièces.
- ⚠️ Porte de garage : marque du moteur et de la télécommande ?
- ⚠️ Pièces exactes du RDC et de l'Étage ; à quoi servent les relais 6 à 8 ?
- ⚠️ Chambre : sur quelle TV sont branchés le boîtier Xiaomi et l'Apple TV ?
- ⚠️ Commune de la maison (pour les heures de lever et de coucher du soleil ; HA est réglé par défaut sur Amsterdam).
- ⚠️ Faut-il un code PIN pour le garage ?
