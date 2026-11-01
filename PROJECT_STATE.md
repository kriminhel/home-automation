# PROJECT_STATE.md — Portail domotique tablette

## Métadonnées
- **Repo** : github.com/kriminhel/home-automation
- **Stack** : Home Assistant (Docker), YAML Lovelace, HACS (Mushroom, card-mod, button-card, browser_mod, kiosk-mode), IPX800 V3, Tuya/Loratap, Broadlink, Mosquitto
- **Déploiement** : `docker-compose up -d` sur le serveur local (Watchtower pour les mises à jour)
- **Dernière mise à jour** : 2026-11-01

## PRD — Objectif du projet
Piloter tous les équipements de la maison (lumières, volets, TV, garage, médias…) depuis un vieil
iPad, via un portail Home Assistant coloré et intuitif, avec un onglet par niveau de la maison et
toute action courante en 2 touchers maximum.
Lien PRD complet : [`docs/PRD.md`](docs/PRD.md) · Règles UI : [`.claude/skills/ha-tablet-dashboard/SKILL.md`](.claude/skills/ha-tablet-dashboard/SKILL.md)

## Features — Statut
| Feature | Statut | Branch | Notes |
|---------|--------|--------|-------|
| Socle Docker + config HA initiale | ✅ Done | main | Commit initial |
| PRD + skill design + script de scan | 🔄 En cours | main | Cette session |
| J0 — Inventaire des équipements (scan) | 📋 À faire | — | `python3 scripts/scan-network.py` sur le LAN |
| J1 — Test vieil iPad (compatibilité frontend) | 📋 À faire | — | Modèle et version iOS à fournir |
| J2 — Correctifs socle (nginx/, IP IPX800 → secrets, GPS) | 📋 À faire | — | |
| J3 — Intégrations (TV, box, audio, Tuya, Broadlink volets) | 📋 À faire | — | Modèle Broadlink à identifier |
| J4 — Dashboard par niveau + thème | 📋 À faire | — | Niveaux et pièces à fournir |
| J5 — Scènes, automatisations, test 7 jours | 📋 À faire | — | |

## Session en cours
- **Objectif** : rédiger le PRD (sous forme de prompt), outiller le scan réseau, définir les règles UI
- **Fichiers modifiés** : `docs/PRD.md`, `scripts/scan-network.py`, `.claude/skills/ha-tablet-dashboard/SKILL.md`, `PROJECT_STATE.md`
- **Tests effectués** : le script de scan s'exécute sans erreur et détecte un service simulé (port 8001 → TV Samsung)

## Changelog
### 2026-11-01 — Niveaux et architecture
- PRD : 2 niveaux (RDC, Étage) ; architecture « serveur + iPad simple navigateur » explicitée

### 2026-11-01 — PRD et outillage
- Ajout du PRD/prompt de référence `docs/PRD.md`
- Ajout du script d'inventaire réseau `scripts/scan-network.py` (SSDP, mDNS, Broadlink, Tuya, ports TCP)
- Ajout de la skill projet `ha-tablet-dashboard` (navigation par niveau, code couleur, recettes YAML)

## Blocages / Décisions pendantes
- ✅ Niveaux : RDC + Étage. Pièces de chaque niveau à préciser
- ✅ Architecture : Home Assistant sur le serveur uniquement, l'iPad n'affiche que la page web (Safari)
- Modèle de l'iPad et version d'iOS (détermine le choix entre frontend HA natif et le plan B léger)
- Modèle du Broadlink (RF 433 MHz nécessaire pour les volets ?) et marque des moteurs de volets
- Marques et modèles des TV et de la box / du décodeur
- `docker-compose.yml` référence `nginx/nginx.conf`, qui n'existe pas
