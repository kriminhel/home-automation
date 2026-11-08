# home-automation

Domotique de la maison : **Home Assistant** + un **portail tablette léger** pour un iPad
sous iOS 9, le tout en Docker sur le serveur `pcdomotique`.

- Produit, inventaire, jalons : [`docs/PRD.md`](docs/PRD.md)
- Avancement : [`PROJECT_STATE.md`](PROJECT_STATE.md)

| Service | Adresse | Usage |
|---------|---------|-------|
| Home Assistant | http://192.168.1.37:8123 | Administration (PC, téléphone récent) |
| Portail tablette | http://192.168.1.37:8124 | iPad (Safari iOS 9) |

## Arborescence

```
docker-compose.yml          Home Assistant + portail + pont Matter
homeassistant-config/       Config HA versionnée (les données d'exécution sont ignorées par git)
portail/                    Portail tablette : server.py (relais), maison.json, static/ (ES5)
scripts/scan-network.py     Inventaire des appareils du réseau → docs/scan-report.md
scripts/broadlink-rf.py     Apprentissage / test des codes RF du Broadlink (volets)
matter/pont-google.json     Lumières et 2 TV exposées à la Google Home Mini (garage exclu)
scripts/matter-pont.py      Crée / met à jour le pont Matter, affiche le code d'appairage
tests/                      Tests du portail (faux HA), du pont Matter et garde-fous du script portail
docs/ACCES-DISTANT.md       VPN WireGuard de la Freebox (accès depuis la 4G)
docs/PORTAIL-SIRI.md        « Dis Siri, ouvre le portail » (raccourci iPhone + Shelly)
docs/AUTOMATISATIONS.md     Automatisations (extérieur, alerte garage, annonces vocales)
docs/INTERNET-ENFANTS.md    Couper internet d'un enfant (contrôle parental Freebox)
docs/AGENDA.md              Brancher Google Agenda ou iCloud
docs/TELEPHONES.md          Batterie des téléphones (appli Home Assistant)
```

## Installation sur le serveur

```bash
git clone https://github.com/kriminhel/home-automation.git ~/home-automation
cd ~/home-automation
cp .env.example .env                                            # mettre HA_TOKEN
cp homeassistant-config/secrets.yaml.example homeassistant-config/secrets.yaml
docker compose up -d
```

`HA_TOKEN` : dans Home Assistant, Profil → Sécurité → **Jetons d'accès longue durée**.

Commande vocale (Google Home Mini) : voir [`docs/MATTER.md`](docs/MATTER.md).

## Mise à jour

```bash
cd ~/home-automation && git pull
docker compose restart portail          # changement dans portail/
docker exec homeassistant python -m homeassistant --script check_config -c /config \
  && docker restart homeassistant        # changement dans homeassistant-config/
```

## Ajouter un équipement sur la tablette

1. L'intégrer dans Home Assistant et noter son `entity_id`.
2. L'ajouter dans `portail/maison.json`, dans la bonne pièce.
3. `python3 -m unittest discover -s tests`, commit, `git pull` sur le serveur, `docker compose restart portail`.
