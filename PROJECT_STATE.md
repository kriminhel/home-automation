# PROJECT_STATE.md — Portail domotique tablette

## Métadonnées
- **Repo** : github.com/kriminhel/home-automation (dépôt unique ; sorti de betanalyst-pro le 04/11/2026)
- **Serveur** : pcdomotique (192.168.1.37), `~/home-automation`, `docker compose up -d`
- **Stack** : Home Assistant (Docker), portail Python standard + HTML/JS ES5, IPX800 V3, Broadlink RM4 Pro
- **Dernière mise à jour** : 2026-11-04

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
| J3 — Garage / volets | 🔄 | Garage ✅ via Broadlink ; volets = Somfy RTS → ESPSomfy-RTS à commander |
| J4 — TV Xiaomi/Philips, Freebox, Tuya, garage | 🔄 | Broadlink, Freebox, toutes les TV intégrées et renommées ; reste Tuya, garage |
| J4 bis — Caméras sur la tablette | 🔄 | Onglet Caméras (dernière image de mouvement, cloud) ✅ ; direct local à tester sur les C6N, absent sur la H8c |
| J5 — Scènes/automatisations réelles, test 7 jours | 📋 | |

## Achats
Liste cumulative : [`docs/ACHATS.md`](docs/ACHATS.md) — Karim achète tout quand elle est complète. **À mettre à jour dès qu'un besoin matériel apparaît.**

## Blocages / décisions pendantes
Voir `docs/PRD.md` §10 (référence de la télécommande Came, garage, pièces, Philips, commune).

## Changelog
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
