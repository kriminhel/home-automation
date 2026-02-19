# 🏠 Système Domotique Unifié - Home Automation

Contrôle centralisé de votre maison via **Home Assistant** :
- 💡 Lumières (IPX800 V3)
- 🪟 Volets roulants (Loratap Tuya)
- 🚪 Porte de garage (Loratap Tuya)

Interface optimisée pour **tablette iPad** + **accès distant sécurisé**.

---

## 🎯 Fonctionnalités

### Contrôle Local
- ✅ Interface web responsive optimisée pour tablette tactile
- ✅ Contrôle en temps réel de tous les appareils
- ✅ Scènes prédéfinies (Mode Soirée, Mode Nuit, Tout Éteindre)
- ✅ Dashboard personnalisé par pièce

### Automatisations
- 🌅 Ouverture automatique des volets au lever du soleil
- 🌙 Fermeture automatique des volets au coucher du soleil
- 🏃 Extinction automatique en quittant la maison (géolocalisation)
- 🏖️ Simulation de présence (mode vacances)
- ⚠️ Alertes si le garage reste ouvert la nuit

### Accès Distant
- 🌐 Contrôle depuis n'importe où dans le monde
- 🔒 Connexion HTTPS sécurisée
- 📱 Application mobile iOS/Android
- 🔔 Notifications push

### Intégrations Tierces
- 🎤 Google Home / Google Assistant
- 🗣️ Amazon Alexa
- 🍎 Apple HomeKit (via bridge)
- 🤖 IFTTT

---

## 📁 Structure du Projet

```
home-automation/
├── docker-compose.yml              # Orchestration containers
├── .env                            # Variables d'environnement
├── GUIDE_INSTALLATION.md           # Guide complet pas à pas
├── README.md                       # Ce fichier
│
├── homeassistant-config/           # Configuration Home Assistant
│   ├── configuration.yaml          # Config principale
│   ├── secrets.yaml                # Secrets (mots de passe)
│   ├── automations.yaml            # Automatisations
│   ├── customize.yaml              # Personnalisation entités
│   └── lovelace/
│       ├── tablet.yaml             # Dashboard tablette
│       └── resources.yaml          # Ressources frontend
│
├── mosquitto/                      # MQTT Broker (optionnel)
│   ├── config/
│   ├── data/
│   └── log/
│
└── nginx/                          # Reverse proxy (optionnel)
    ├── nginx.conf
    └── ssl/
```

---

## 🚀 Installation Rapide

### Prérequis

- Docker & Docker Compose installés
- IPX800 V3 configuré sur votre réseau
- Modules Loratap configurés dans l'app Smart Life
- Serveur Linux/Mac/NAS (Raspberry Pi recommandé)

### Installation

```bash
# 1. Cloner le repository
git clone <votre-repo>
cd home-automation

# 2. Configurer les variables
cp .env.example .env
nano .env  # Modifier avec vos paramètres

# 3. Configurer les secrets
nano homeassistant-config/secrets.yaml

# 4. Démarrer les services
docker-compose up -d

# 5. Accéder à Home Assistant
# Ouvrir http://[IP_SERVEUR]:8123
```

**📖 Pour le guide détaillé, voir : [GUIDE_INSTALLATION.md](GUIDE_INSTALLATION.md)**

---

## 🖥️ Services

| Service | Port | Description |
|---------|------|-------------|
| Home Assistant | 8123 | Interface web principale |
| MQTT Mosquitto | 1883 | Broker MQTT (messages locaux) |
| Nginx | 80/443 | Reverse proxy HTTPS |

---

## 📱 Utilisation sur iPad

### Installation

1. Sur l'iPad, ouvrir Safari
2. Naviguer vers `http://[IP_SERVEUR]:8123`
3. Se connecter avec vos identifiants
4. Aller dans le dashboard "Tablette"
5. Cliquer sur Partager (⬆️) → "Sur l'écran d'accueil"
6. L'app apparaît comme une vraie application !

### Optimisations

- Interface tactile avec gros boutons
- Mode plein écran (pas de barre Safari)
- Fonctionne hors ligne (cache)
- Rafraîchissement temps réel (WebSocket)

---

## 🌐 Accès Distant

### Option 1 : Nabu Casa (Recommandé)

**Avantages :** Configuration automatique, HTTPS, support officiel
**Coût :** 6.50€/mois

```yaml
# Configuration automatique dans Home Assistant
Paramètres → Home Assistant Cloud → S'inscrire
```

### Option 2 : Cloudflare Tunnel (Gratuit)

**Avantages :** Gratuit, HTTPS auto, pas de port forwarding
**Complexité :** Moyenne

```bash
# Ajouter le token Cloudflare dans .env
CLOUDFLARE_TOKEN=votre-token

# Relancer
docker-compose up -d cloudflared
```

### Option 3 : VPN WireGuard (Très sécurisé)

**Avantages :** Le plus sécurisé, accès complet au réseau
**Complexité :** Avancée

Voir guide séparé.

---

## 🎨 Personnalisation

### Ajouter une lumière

Éditer `homeassistant-config/configuration.yaml` :

```yaml
light:
  - platform: template
    lights:
      nouvelle_lumiere:
        friendly_name: "Ma Nouvelle Lumière"
        value_template: "{{ states('sensor.ipx800_relay_X') == 'on' }}"
        turn_on:
          service: rest_command.ipx800_set_relay
          data:
            relay: X  # Numéro du relais
            state: true
        turn_off:
          service: rest_command.ipx800_set_relay
          data:
            relay: X
            state: false
```

### Créer une scène

```yaml
scene:
  - name: Ma Scène
    entities:
      light.salon: on
      light.cuisine: off
      cover.volet_salon: closed
```

### Ajouter une automatisation

Éditer `automations.yaml` ou utiliser l'interface web :
`Paramètres` → `Automatisations et scènes` → `Créer une automatisation`

---

## 🔧 Maintenance

### Sauvegardes

```bash
# Sauvegarde manuelle
cd ~/home-automation
tar -czf backup-$(date +%Y%m%d).tar.gz homeassistant-config/

# Restauration
tar -xzf backup-YYYYMMDD.tar.gz
```

### Mises à jour

```bash
# Mettre à jour Home Assistant
docker-compose pull homeassistant
docker-compose up -d homeassistant

# Mettre à jour tous les services
docker-compose pull
docker-compose up -d
```

### Logs

```bash
# Voir les logs Home Assistant
docker-compose logs -f homeassistant

# Voir tous les logs
docker-compose logs -f
```

---

## 🛡️ Sécurité

### Bonnes pratiques

- ✅ Utiliser des mots de passe forts et uniques
- ✅ Activer l'authentification 2FA dans Home Assistant
- ✅ Ne jamais exposer l'IPX800 directement sur Internet
- ✅ Utiliser HTTPS pour l'accès distant
- ✅ Faire des sauvegardes régulières
- ✅ Mettre à jour régulièrement

### Firewall

```bash
# Ouvrir uniquement les ports nécessaires
sudo ufw allow 8123/tcp  # Home Assistant (local seulement)
sudo ufw enable
```

---

## 🧪 Tests

### Vérifier que tout fonctionne

```bash
# Status des containers
docker-compose ps

# Tester l'API IPX800
curl http://192.168.1.100/api/xdevices.json -u admin:password

# Vérifier Home Assistant
curl http://localhost:8123

# Logs en temps réel
docker-compose logs -f
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│         ACCÈS UTILISATEUR               │
│  [iPad] [Smartphone] [PC] [Voice]      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│       HOME ASSISTANT (Docker)           │
│  • Interface web                        │
│  • API REST                             │
│  • WebSocket                            │
│  • Automatisations                      │
└─────┬──────────────────┬────────────────┘
      │                  │
      ▼                  ▼
┌──────────────┐   ┌──────────────────┐
│  IPX800 V3   │   │  Loratap (Tuya)  │
│  (Lumières)  │   │  (Volets+Garage) │
│  API REST    │   │  Cloud/Local API │
└──────────────┘   └──────────────────┘
```

---

## 🆘 Dépannage

### Home Assistant ne démarre pas

```bash
# Vérifier les logs
docker-compose logs homeassistant

# Vérifier la config YAML
docker-compose exec homeassistant python -m homeassistant --script check_config
```

### IPX800 injoignable

```bash
# Tester la connectivité
ping 192.168.1.100

# Tester l'API
curl http://192.168.1.100/api/xdevices.json
```

### Loratap non détecté

1. Vérifier dans l'app Smart Life que les modules fonctionnent
2. Home Assistant → Paramètres → Intégrations → Tuya → Recharger
3. Vérifier que le compte Tuya est correct dans `secrets.yaml`

---

## 📚 Documentation

- [Guide Installation Complet](GUIDE_INSTALLATION.md)
- [Documentation Home Assistant](https://www.home-assistant.io/docs/)
- [IPX800 API Documentation](https://gce.ovh/wiki/)
- [Tuya Integration](https://www.home-assistant.io/integrations/tuya/)

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📝 License

Ce projet est sous licence MIT. Voir `LICENSE` pour plus d'informations.

---

## 👤 Auteur

Créé avec ❤️ pour automatiser votre maison !

**Support :** Créez une issue sur GitHub

---

## ⭐ Remerciements

- [Home Assistant](https://www.home-assistant.io/) - La meilleure plateforme domotique open-source
- [GCE Electronics](https://gce-electronics.com/) - IPX800
- [Loratap](https://www.loratap.com/) - Modules WiFi
- [Tuya](https://www.tuya.com/) - Plateforme IoT
