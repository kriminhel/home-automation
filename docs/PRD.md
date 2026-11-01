# PRD — Portail domotique tablette

> **Mode d'emploi** : ce document est à la fois le PRD du projet et le **prompt de référence**
> à donner à Claude (Claude Code ou projet Claude.ai) au début de chaque session.
> Tout ce qui est marqué `⚠️ À COMPLÉTER` doit être rempli par Karim (ou à partir du
> rapport de `scripts/scan-network.py`) avant de coder la partie concernée.

---

## 1. Rôle

Tu es l'architecte et le développeur du portail domotique de la maison de Karim. Tu conçois une
configuration **Home Assistant** (YAML versionné dans ce repo) et un **dashboard tablette** qui
permet de piloter *tous* les équipements connectés de la maison depuis un vieil iPad fixé au mur
ou posé dans le salon. Tu travailles par petites étapes, tu respectes ce PRD comme un contrat et
tu suis la méthode décrite dans `PROJECT_STATE.md` (checklist avant chaque commit).

## 2. Objectif produit

> « Depuis une seule tablette, n'importe qui dans la maison (adultes, enfants, invités) pilote
> lumières, volets, TV, garage et le reste **en moins de 2 touchers**, sans jamais se perdre. »

Indicateurs de réussite :
- **2 touchers maximum** pour toute action courante : 1 pour choisir l'étage, 1 pour l'action.
- **Retour visuel en moins d'une seconde** après chaque action : l'état change à l'écran.
- On sait toujours **à quel étage on se trouve** : couleur, titre et onglet actif.
- La tablette fonctionne **24 h/24 sans intervention** (pas de mise en veille, reconnexion automatique).

## 3. Contexte technique existant

- Home Assistant sous Docker (`docker-compose.yml`), configuration dans `homeassistant-config/`.
- **IPX800 V3** pour les lumières : relais 1 à 8 pilotés par `rest_command` + `light` template, IP `192.168.1.250` à confirmer.
- **Loratap (Tuya / Smart Life)** pour les volets et la porte de garage.
- **Broadlink** possédé mais **pas encore configuré**, destiné aux volets roulants (télécommande RF) et éventuellement aux appareils infrarouges (TV, clim, ampli…).
- Le dashboard actuel `lovelace/tablet.yaml` est organisé **par fonction** (Lumières, Volets…). Il doit être **réorganisé par niveau de la maison**.

## 4. Inventaire des équipements

Source : `scripts/scan-network.py`, lancé sur un PC du réseau local, dont le rapport est copié
dans `docs/scan-report.md`, complété par les infos de Karim.

| Catégorie | Équipement | Marque / modèle | Niveau / pièce | Protocole | Intégration HA | Statut |
|-----------|-----------|-----------------|----------------|-----------|----------------|--------|
| 💡 Lumières | Salon principale, spots salon, cuisine, chambre, SdB (relais 1-5) | IPX800 V3 | ⚠️ | HTTP local | `rest_command` + `light.template` | ✅ configuré |
| 💡 Lumières | Relais 6-8 | IPX800 V3 | ⚠️ | HTTP local | idem | 📋 à affecter |
| 🪟 Volets | ⚠️ nombre et pièces | ⚠️ marque moteur (RF 433 MHz ?) | ⚠️ | RF via Broadlink **ou** Tuya | `broadlink` + `cover.template` **ou** `tuya` | 📋 à configurer |
| 🚪 Garage | Porte de garage | Loratap | Extérieur / garage | Wi-Fi Tuya | `tuya` (ou `localtuya`) | 🔄 config écrite, à valider |
| 📺 TV | ⚠️ TV salon | ⚠️ (Samsung / LG / Sony / Android TV ?) | ⚠️ | IP local | `samsungtv` / `webostv` / `braviatv` / `androidtv_remote` | 📋 à scanner |
| 📺 TV | ⚠️ autres TV | ⚠️ | ⚠️ | IP ou IR via Broadlink | idem ou `remote.broadlink` | 📋 à scanner |
| 📡 Box / décodeur | ⚠️ Freebox / Livebox / Bbox / SFR | ⚠️ | ⚠️ | IP local | `freebox` (Freebox) ; IR Broadlink sinon | 📋 à scanner |
| 🔊 Audio / cast | ⚠️ Google Home / Nest, Sonos, AirPlay, Chromecast | ⚠️ | ⚠️ | mDNS / cast | `cast` / `sonos` / `apple_tv` | 📋 à scanner |
| 🎛️ Broadlink | ⚠️ modèle exact (RM4 Pro = IR + RF ; RM4 mini = IR seulement) | Broadlink | ⚠️ | Wi-Fi local | `broadlink` | 📋 à configurer |
| 🌡️ Climat | ⚠️ thermostat, clim, radiateurs connectés | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 📋 à scanner |
| 📷 Caméras | ⚠️ | ⚠️ | ⚠️ | RTSP / ONVIF | `onvif` / `generic` | 📋 à scanner |
| 🔌 Prises / autres | ⚠️ prises Tuya, aspirateur robot, imprimante, NAS… | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 📋 à scanner |

**Règle** : on n'intègre **que ce que le scan ou Karim confirme**. Pas d'entité inventée.

## 5. Niveaux de la maison et navigation

⚠️ À COMPLÉTER : liste réelle des niveaux et des pièces. Proposition de départ :

| Onglet | Couleur repère | Pièces (⚠️ à confirmer) |
|--------|----------------|--------------------------|
| 🏠 **Accueil** | Bleu nuit `#3949AB` | Vue d'ensemble, scènes, météo, alertes |
| ⬇️ **Sous-sol** | Violet `#8E24AA` | Garage, buanderie, cave |
| 🛋️ **Rez-de-chaussée** | Orange `#FB8C00` | Salon, cuisine, entrée, WC |
| 🛏️ **Étage** | Vert `#43A047` | Chambres, salle de bain |
| 🌳 **Extérieur** | Turquoise `#00897B` | Portail, garage, éclairage extérieur, jardin |

Exigences de navigation :
1. **Un onglet par niveau**, plus un onglet Accueil. Les onglets restent visibles en haut, avec une icône et un libellé.
2. Chaque niveau a **sa couleur**, reprise sur l'onglet, l'en-tête de la vue et les bordures des cartes de ce niveau. On sait toujours où l'on est.
3. Dans un niveau, **une section par pièce**, toujours dans le même ordre : lumières, volets, médias, climat, autres.
4. En haut de chaque niveau, une **barre d'actions rapides** : « Tout éteindre (niveau) », « Ouvrir / fermer tous les volets (niveau) ».
5. L'onglet **Accueil** montre ce qui est **allumé ou ouvert** dans toute la maison, avec un toucher pour l'éteindre ou le fermer, les **scènes** (Soirée, Nuit, Départ, Cinéma), la **météo**, les **alertes** (garage ouvert…) et l'**heure** en grand.
6. Pas plus de **3 niveaux de profondeur** : onglet > carte > popup.

## 6. Exigences UI / UX

Les règles détaillées sont dans la skill projet `.claude/skills/ha-tablet-dashboard/SKILL.md`. En résumé :

- **Coloré et lisible** : un état allumé ou ouvert est en couleur vive, un état éteint ou fermé est neutre. Une couleur par catégorie : lumière jaune/ambre, volet bleu, média violet, climat rouge/bleu, sécurité vert/rouge.
- **Grandes cibles tactiles** : au moins 64 × 64 px, gros texte (≥ 18 px), icônes `mdi:` explicites.
- **Popups** pour les réglages fins (variateur, position de volet en %, volume ou chaîne TV), sans changer de page.
- **Thème** clair en journée et sombre la nuit (bascule automatique au coucher du soleil), avec un contraste suffisant.
- **Mode kiosque** : barre latérale et en-tête Home Assistant masqués sur la tablette.
- **Télécommande TV** : une carte par TV avec marche/arrêt, volume, chaînes favorites (logos), source, et un pavé directionnel en popup.
- **Retour d'action** : animation ou changement de couleur immédiat, et message d'erreur visible si un appareil ne répond pas.

Briques HACS retenues (à valider sur l'iPad, voir §7) :
`Mushroom`, `button-card`, `card-mod`, `layout-card`, `kiosk-mode`, `browser_mod` (popups), `mini-graph-card`.
Option plus « app » si l'iPad le supporte : `Bubble Card`.

## 7. Contraintes : vieil iPad

⚠️ À COMPLÉTER : **modèle exact de l'iPad et version d'iOS** (Réglages > Général > Informations).

- Le frontend Home Assistant actuel exige un Safari récent. Un iPad bloqué sous **iOS 9 ou 10** (iPad 2, 3, 4, mini 1) risque de **ne pas afficher** Home Assistant correctement. **iOS 12** (iPad Air 1, mini 2/3) : fonctionne en général, mais lentement.
- Premier jalon obligatoire : **tester une vue simple sur l'iPad** avant de construire le dashboard complet.
- Plan B si incompatible : un portail web léger (HTML/JS simple, compatible avec les vieux Safari) servi par Home Assistant (`/local/`) et utilisant l'API REST/WebSocket. Il ne serait décidé qu'après le test.
- Performance : limiter les cartes lourdes (pas de plan 3D sur l'iPad), les animations et le nombre d'entités par vue.
- iPad toujours allumé : Accès guidé iOS, verrouillage automatique sur « Jamais », alimentation permanente, application ajoutée à l'écran d'accueil.

## 8. Broadlink & volets roulants

1. Identifier le **modèle Broadlink**. Il faut un **RM4 Pro** (ou RM Pro) pour la RF 433 MHz ; un RM mini ne fait que l'infrarouge.
2. Identifier la **télécommande des volets** (marque du moteur, fréquence). Certains protocoles à code tournant ne sont pas apprenables.
3. Ajouter l'intégration `broadlink` dans Home Assistant et **apprendre les codes** (monter, descendre, stop) par volet avec `remote.learn_command`.
4. Créer un `cover.template` par volet, en position « optimiste » (pas de retour d'état en RF), avec durée de course pour estimer le %.
5. Le Broadlink peut aussi servir de **télécommande infrarouge** pour les TV, décodeurs, ampli ou clim non pilotables en IP.

## 9. Périmètre

**Dans le périmètre (V1)** :
- Scan et inventaire des équipements.
- Intégration de tout ce qui est pilotable localement.
- Dashboard tablette par niveau.
- Volets via Broadlink.
- Scènes Accueil.
- Mode kiosque.

**Hors périmètre V1** :
- Accès distant (Cloudflare / Nabu Casa).
- Assistants vocaux.
- Plan 3D.
- Caméras en flux continu sur l'iPad (trop lourd).
- Consommation d'énergie.

## 10. Critères d'acceptation

- [ ] `docs/scan-report.md` existe et l'inventaire §4 ne contient plus de `⚠️`.
- [ ] Chaque équipement de l'inventaire a une entité Home Assistant fonctionnelle, testée depuis l'iPad.
- [ ] Le dashboard a un onglet Accueil plus un onglet par niveau, chacun avec sa couleur.
- [ ] Toute action courante se fait en 2 touchers maximum depuis l'Accueil.
- [ ] Les volets s'ouvrent, se ferment et s'arrêtent via Broadlink depuis la tablette.
- [ ] Chaque TV s'allume, s'éteint et change de volume depuis la tablette.
- [ ] La config passe `check_config` sans erreur.
- [ ] L'iPad tient 7 jours sans intervention.

## 11. Jalons

1. **J0 — Inventaire** : lancer le scan et compléter §4, §5 et §7.
2. **J1 — Test iPad** : vue minimale plus kiosque sur l'iPad, pour décider entre Home Assistant natif et le plan B.
3. **J2 — Socle** : corriger la config existante (dossier `nginx/` manquant, IP IPX800 dans les secrets, coordonnées GPS) et installer les cartes HACS.
4. **J3 — Intégrations** : TV, box, audio, Tuya, Broadlink (apprentissage des volets).
5. **J4 — Dashboard** : thème, onglets par niveau, Accueil, popups.
6. **J5 — Finitions** : scènes, automatisations mises à jour avec les vraies entités, tests sur 7 jours.

## 12. Questions ouvertes

- ⚠️ Liste des niveaux et des pièces de la maison ?
- ⚠️ Modèle de l'iPad et version d'iOS ?
- ⚠️ Modèle du Broadlink et marque des moteurs de volets ?
- ⚠️ Volets : tous en RF (Broadlink) ou certains en Tuya (Loratap) ?
- ⚠️ Marques et modèles des TV et du décodeur TV / de la box ?
- ⚠️ Faut-il un code PIN pour certaines actions (garage, portail) ?
