# PROJECT_STATE.md — Portail domotique tablette

## Métadonnées
- **Repo** : github.com/kriminhel/home-automation (dépôt unique ; sorti de betanalyst-pro le 04/11/2026)
- **Serveur** : pcdomotique (192.168.1.37), `~/home-automation`, `docker compose up -d`
- **Stack** : Home Assistant (Docker), portail Python standard + HTML/JS ES5, IPX800 V3, Broadlink RM4 Pro
- **Dernière mise à jour** : 2026-11-06 (commande vocale Google en service)

## Objectif
Piloter toute la maison depuis un iPad sous iOS 9, en 2 touchers maximum, via un portail
léger servi par le serveur. Détails : [`docs/PRD.md`](docs/PRD.md).

## Features — Statut
| Feature | Statut | Notes |
|---------|--------|-------|
| J0 — Inventaire réseau | ✅ | `docs/scan-report.md` (04/11) |
| J1 — Choix iPad | ✅ | iOS 9 → portail léger (plan B) |
| J2 — Dépôt unique + config nettoyée | ✅ | betanalyst-pro n'héberge plus la domotique |
| J2 — Portail tablette (lumières, scènes, TV) | ✅ | Jeton en place, à tester sur l'iPad |
| J3 — Garage / volets | 🔄 | Garage ✅ via Broadlink ; volets = Somfy RTS → **module ESPSomfy-RTS commandé le 08/11** (appairage à réception) |
| J4 — TV Xiaomi/Philips, Freebox, Tuya, garage | 🔄 | Broadlink, Freebox, toutes les TV intégrées et renommées ; reste Tuya, garage |
| J4 bis — Caméras sur la tablette | 🔄 | Onglet Caméras (dernière image de mouvement, cloud) ✅ ; direct local à tester sur les C6N, absent sur la H8c |
| J4 ter — Voix Google Home Mini (Matter) | ✅ | Lumières testées à la voix le 05/11 ; TV Naïm + Apple TV Amel ajoutées au pont le 08/11 (à tester) ; volets à ajouter ; garage exclu |
| Accès extérieur (VPN WireGuard Freebox) | 📋 | Guide prêt (`docs/ACCES-DISTANT.md`, 08/11) ; à installer à la maison |
| « Dis Siri, ouvre le portail » | 🔄 | `script.ouvrir_portail` prêt (inactif sans Shelly) + guide raccourci (`docs/PORTAIL-SIRI.md`) ; attend le Shelly sur la carte Nice |
| Aspirateur Roomba (tablette + voix) | 📋 | Code prêt 08/11 (`docs/ROOMBA.md`) : intégration iRobot à ajouter dans HA (bouton HOME), entité `vacuum.roomba`, puis `matter-pont.py` |
| J5 — Scènes/automatisations réelles, test 7 jours | 🔄 | 08/11 : extérieur au coucher du soleil + extinction 23 h 30, alerte garage resté ouvert (annonce Google Home Mini) — `docs/AUTOMATISATIONS.md` ; test 7 jours à faire |
| Internet des enfants (contrôle parental Freebox) | 🔄 | Code prêt 08/11 (`docs/INTERNET-ENFANTS.md`) ; à faire : profils Alia/Naïm/Amel dans Freebox Connect, `scripts/freebox-autoriser.py`, permission |
| Agenda Google | 📋 | **Google retenu** (08/11) pour ajouter des rdv à la voix via la Google Home Mini ; guide `docs/AGENDA.md` (intégration Google Calendar dans HA + Voice Match) |
| Liste de courses (Ok Google, Siri, tablette) | 📋 | Code prêt 09/11 (`docs/COURSES.md`) : onglet 🧺 de la tablette, `todo.courses` ; à faire : Google Keep Sync (HACS) ou liste locale, raccourci Siri. Drive : pas d'API publique, pas d'automatisation |
| Batterie des téléphones | 📋 | Affichage prêt (`docs/TELEPHONES.md`) ; installer l'appli HA sur chaque téléphone |

## Achats
Liste cumulative : [`docs/ACHATS.md`](docs/ACHATS.md) — Karim achète tout quand elle est complète. **À mettre à jour dès qu'un besoin matériel apparaît.**

## Blocages / décisions pendantes
Voir `docs/PRD.md` §10 (référence de la télécommande Came, garage, pièces, Philips, commune).

## À reprendre (prochaine session)
1. **Portail / arrivée** : décidé le 08/11 → VPN Freebox + « Dis Siri, ouvre le portail » (confirmation, jamais automatique). Reste : installer le VPN, créer le raccourci, acheter / poser le Shelly (entrée OPEN de préférence). Lumières terrasse à l'arrivée la nuit : à reproposer. Phrase coupée « … allume les lumières de la terrasse et » : toujours à clarifier.
2. **Contrôle parental Freebox** : code prêt (08/11). À la maison : créer les profils, `python3 scripts/freebox-autoriser.py`, cocher « Contrôle parental », `docker compose up -d portail` (`docs/INTERNET-ENFANTS.md`).
3. **Agenda** : Google retenu (ajout à la voix). Brancher Google Calendar dans HA, activer Voice Match + résultats personnels sur l'enceinte, me donner les entités (`docs/AGENDA.md`).
4. **Batterie des téléphones** : appli HA sur chaque téléphone, me donner les noms des capteurs (`docs/TELEPHONES.md`).
6. **Synthèse vocale** : ajouter l'intégration Google Translate TTS (fr) pour que les alertes soient dites sur la Google Home Mini (`docs/AUTOMATISATIONS.md`).
5. **Caméra garage** : nouveau code de chiffrement d'image à créer par Karim → `EZVIZ_CODES` dans `.env` (Karim l'écrit lui-même).

## Changelog
### 2026-11-09 — Liste de courses
- Tablette : onglet 🧺 Courses (ajouter, cocher, retirer les cochés, rafraîchi toutes les 10 s) ; `/api/courses` limité à `todo.add_item`, `update_item`, `remove_completed_items` sur l'entité déclarée (`maison.json` → `courses`).
- Une seule liste `todo.courses` : Google Keep Sync (HACS, non officiel) pour « Ok Google, ajoute… », raccourci Siri `todo.add_item`. Guide `docs/COURSES.md`.
- Commande drive automatique écartée : pas d'API publique, robot fragile et contraire aux CGU.
### 2026-11-08 (nuit) — Aspirateur Roomba
- Tablette : tuile `vacuum.roomba` dans le Salon (▶ nettoyer, ⏸ pause, ⌂ base), états en français, « Bloqué » en rouge ; actions limitées à start / pause / return_to_base.
- Voix : domaine `vacuum` ajouté au pont Matter (Google gère les aspirateurs Matter en mode pont).
- `docs/ROOMBA.md` : intégration locale iRobot (bouton HOME), ne pas lier aussi l'appli iRobot à Google (doublon).
### 2026-11-08 (soir) — J5, internet des enfants, agenda, téléphones
- Automatisations : extérieur au coucher du soleil / 23 h 30, alerte garage resté ouvert (30 min et 22 h) annoncée via `script.annonce_maison` (notification + Google Home Mini) ; interrupteurs « pause » ; rien ne s'ouvre automatiquement (tests).
- Contrôle parental Freebox : `portail/freebox.py` (API v8 profils / network_control), `/api/internet`, boutons Couper 30 min / 1 h / 2 h / Rétablir dans les profils, bouton Wi-Fi des chambres ; jeton rangé dans `.env` par `scripts/freebox-autoriser.py`.
- Agenda : un agenda en panne ne masque plus les autres ; guide iCloud / Google.
- Batterie des téléphones dans les profils (lecture seule, rouge ≤ 20 %, ⚡ en charge).
### 2026-11-08 — Portail par Siri, accès extérieur
- `script.ouvrir_portail` (HA) : impulsion de 1 s sur `switch.portail_nice` (Shelly à venir), anti-rebond 20 s, journalisé ; sans Shelly → simple notification, rien n'est envoyé. Jamais dans une automatisation ni exposé à Google (tests `tests/test_portail_siri.py`).
- `docs/PORTAIL-SIRI.md` : raccourci iPhone « Ouvre le portail » avec confirmation ; câblage Shelly (entrée OPEN plutôt que « pas à pas », qui ouvre *ou* ferme).
- `docs/ACCES-DISTANT.md` : VPN WireGuard de la Freebox (activation à la demande sur l'iPhone, IPv4 full-stack si besoin).
### 2026-11-08 — TV à la voix
- Pont Matter : TV Philips de Naïm et Apple TV d'Amel exposées (Google les voit comme des enceintes : marche/arrêt, volume, lecture). TV salon et boîtier chambre parentale : Google d'origine, non dupliqués. Reste à appliquer sur le serveur (`python3 scripts/matter-pont.py`) et tester.
### 2026-11-05 — Commande vocale Google Home Mini (Matter)
- Enceinte « Alia » (Google Home Mini, 192.168.1.23) intégrée à HA via Cast (`media_player.alia`) et hub Matter de Google Home.
- Service `matter-hub` (home-assistant-matter-hub 2.0.59, fork RiDDiX maintenu) dans `docker-compose.yml`, volume `matter-hub-data`, jeton `HA_TOKEN`, annonces limitées à `wlp2s0`.
- Pont « Maison » versionné (`matter/pont-google.json`) : 22 lumières (sans l'Ambilight) ; **garage exclu** (vérifié par le script et les tests).
- `scripts/matter-pont.py` : crée / met à jour le pont via son API, affiche le code d'appairage Google Home.
- `tests/test_matter.py`. Fonctionnement et réinstallation : `docs/MATTER.md`.
- Testé en réel : appairage Google Home et commandes vocales du salon validés par Karim.
### 2026-11-05 (matin) — Accueil et plans
- Accueil : agenda tout en haut, carte « Lumières » retirée, bouton « Tout éteindre » en haut à droite (scène `scene.tout_eteindre`), météo dans le rond de la barre latérale à la place du logo.
- Niveaux : la liste « Toutes les commandes » est retirée ; les cartes photo des pièces du niveau sont sous le plan 3D (retirées de l'accueil).
- Plan RDC : WC enfants entre la porte d'entrée et la SdB (`light.wc_enfants`, ampoule séparée de la SdB) ; entrée dessinée en L (`poly`).
### 2026-11-05 — Agenda, navigation, couloir
- Agenda local HA `calendar.famille` : carte sur l'accueil + ajout d'événements depuis la tablette (`/api/agenda`). iCloud / Google à brancher ensuite (ajouter l'entité dans `maison.json` → `agendas`).
- Glisser pour changer de vue ; pictogrammes arrondis ; vue 3D globale supprimée ; barre latérale façon référence ; police Plus Jakarta Sans ; avatars (privés, serveur seulement).
- Plan : couloir buanderie (light.couloir_buanderie), petite terrasse devant la baie du salon (light.facade_rue), entrée ouverte sur salon et salle à manger, boutons ▲■▼ du garage en 3D.
### 2026-11-04 (nuit) — Portail noir et or
- HA localisé à Saint-Aubin-lès-Elbeuf (Europe/Paris) ; météo met.no → `weather.forecast_maison`.
- Accueil type tableau de bord (illustration maison toit terrasse en attendant une vraie photo, heure, météo, courbes lumières / internet, famille Karim · Samia · Alia · Naïm · Amel, scènes, cartes de pièces avec marche/arrêt), navigation latérale, vue Famille.
- 3D : portes, baies vitrées (salle à manger côté terrasse, salon à côté de la TV), volet roulant noir du garage côté caméra qui suit `cover.garage`, entrée ouverte sur le salon, plus de noms de pièces, icônes ampoule / TV dessinées, palette sobre, cuisine noire, canapé en L dos à la cuisine face à la TV ; « Plan » = vue de dessus de la 3D.
- À faire : **Wi-Fi par pièce** (app Freebox à autoriser + appareils par pièce), **photos** (maison et pièces : `portail/static/photos/`, clés `photo` dans maison.json), téléphones (appli HA → batterie).
### 2026-11-04 — Nouveau design du portail
- Accueil = récapitulatif sombre (salutation, heure, résumé, dernière caméra, puces lumières/écrans/garage/internet/soleil, scènes, cartes de pièces → pièce en 1 toucher). Thème sombre « verre » sur toutes les vues ; liens directs `/#rdc`, `/#etage`, `/#cameras`.
- Correction : la lumière de la cuisine était `light.cuisine_2` dans HA (le portail et les scènes visaient `light.cuisine`) → renommée.
- **Plan de la maison** interactif (RDC + étage, relevés sur les croquis de Karim) en tête des vues de niveau : zones reliées à leurs équipements, pièces allumées en ambre, toucher = fenêtre de commandes de la pièce, repère caméra garage. Géométrie dans `maison.json` → `niveaux[].plan` (rects ou poly).
- **Séjour ouvert** (salle à manger + cuisine + salon, `zones[].espace`) : pas de cloisons, zones de lumière séparées seulement (pointillés en 2D). Rendu 3D v2 : meubles arrondis, textures canvas, ombres douces ; **2 lumières max** dans la scène (sinon l'iPad n'affiche plus les objets éclairés).
- **Vue 3D globale** (onglet « 🏠 3D ») : RDC + étage empilés (`plan.position3d` de l'étage), murs du fond hauts / avant coupés, mobilier procédural (`plan.meubles`, en partie inventé : voiture, cuisine, PS5…), icônes 💡 par lumière et 📺 par TV qui basculent l'appareil au toucher.
- **Maquette 3D en coupe** (par défaut, bouton 3D / Plan) : `portail/static/plan3d.js` + Three.js r110 local (`static/lib/`, ES5, MIT). Murs alignés sur une grille 1000 × 640 (retours de Karim : chambres d'enfants de même taille, mur du fond commun Alia / Naïm / Amel / salon).
### 2026-11-04 — Caméras
- Portail : onglet **Caméras** (visiophone, garage, salon, salle de jeux) avec la dernière image de mouvement fournie par le cloud EZVIZ, relayée par `/api/image/<entity_id>` (liste blanche `cameras` de maison.json, cache 10 s, jeton côté serveur) ; plein écran au toucher.
- Images chiffrées par EZVIZ (« hikencodepicture ») : déchiffrées par le portail (`portail/ezviz_image.py`, AES en Python standard, code vérifié hors ligne par son empreinte) avec `EZVIZ_CODES` dans `.env` du serveur. Codes salon / salle de jeux probablement inversés. Garage : nouveau code de chiffrement à créer dans l'appli (choix de Karim : ne pas stocker le mot de passe du compte).
- Garage H8c : le mot de passe local est celui du compte EZVIZ (pas le code de l'étiquette) ; pas de port 554 même avec le direct LAN activé. Carte microSD 537 Go (4 partitions) : contrefaite, la caméra ne peut pas l'initialiser.
### 2026-11-04 — Liste d'achats
- `docs/ACHATS.md` créé (ESPSomfy-RTS, Shelly 1 Mini Gen3, contact garage) ; portail et EZVIZ ajoutés au PRD.

### 2026-11-04 — Garage et diagnostic volets
- Garage Came (TOP code fixe) : 3 codes appris et rejoués, `cover.garage` dans HA, tuile avec confirmation, exclu des actions groupées.
- Volets : émetteurs Somfy RTS (433,42 MHz, code tournant) → Broadlink et Loratap SC500W inadaptés ; solution ESPSomfy-RTS.
- IPX800 : 21 relais sous leurs vrais noms.

### 2026-11-04 — Intégrations
- HA : Broadlink, Freebox, TV Xiaomi salon, TV Philips (+ Ambilight) intégrés ; 8 entités fantômes et floor3d supprimés.
- HA : boîtier Xiaomi (chambre parentale) et Apple TV (Amel) intégrés ; entités TV renommées (tv_salon, tv_naim, ambilight_naim…).
- Portail : TV salon, chambre de Naïm (TV Philips, Ambilight), boîtier chambre parentale, chambre d'Amel (Apple TV).

### 2026-11-04 — Ménage et portail iOS 9
- Dépôt unique `home-automation` ; suppression des guides et scripts obsolètes (Windows, Mosquitto, nginx, Cloudflare, Watchtower, Lovelace et plan 3D).
- Config HA : IPX800 dans les secrets, `default_config`, journaux ramenés à `warning` (le debug avait produit un journal de 131 Mo), lumières marquées « indisponibles » si l'IPX800 ne répond pas, automatisations fantômes retirées.
- Portail tablette `portail/` (ES5, port 8124), 11 tests.
- Scan réseau : Broadlink RM4 Pro, TV Xiaomi, boîtier Xiaomi, Freebox, passerelle Tuya Zigbee, NAS Synology.
- Script `scripts/broadlink-rf.py` (apprentissage RF hors de l'appli Broadlink).
- PRD réécrit.

### 2026-11-01 — PRD et outillage
- Premier PRD tablette, script de scan, skill dashboard (remplacée le 04/11).
