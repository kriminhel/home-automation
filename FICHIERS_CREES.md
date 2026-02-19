# 📁 Fichiers Créés - Projet Domotique

Liste complète des fichiers créés pour votre système domotique.

---

## 📚 Documentation

| Fichier | Description |
|---------|-------------|
| `README.md` | Documentation principale du projet |
| `GUIDE_INSTALLATION.md` | Guide complet d'installation pas à pas (le plus important !) |
| `QUICKSTART.md` | Démarrage rapide en 5 minutes |
| `FICHIERS_CREES.md` | Ce fichier - liste de tous les fichiers |

---

## 🐳 Configuration Docker

| Fichier | Description |
|---------|-------------|
| `docker-compose.yml` | Orchestration de tous les services (Home Assistant, MQTT, Cloudflare, Nginx) |
| `.env.example` | Exemple de variables d'environnement |
| `.env` | Variables d'environnement (À CRÉER - copier depuis .env.example) |
| `.gitignore` | Fichiers à ignorer dans Git |

---

## 🏠 Configuration Home Assistant

### Fichiers principaux

| Fichier | Description |
|---------|-------------|
| `homeassistant-config/configuration.yaml` | Configuration principale de Home Assistant |
| `homeassistant-config/secrets.yaml` | Mots de passe et secrets (À CONFIGURER !) |
| `homeassistant-config/automations.yaml` | Automatisations (volets, lumières, etc.) |
| `homeassistant-config/customize.yaml` | Personnalisation des entités (icônes, noms) |

### Dashboard tablette

| Fichier | Description |
|---------|-------------|
| `homeassistant-config/lovelace/tablet.yaml` | Interface optimisée pour iPad |
| `homeassistant-config/lovelace/resources.yaml` | Ressources frontend (cartes personnalisées) |

---

## 🔧 Configuration MQTT

| Fichier | Description |
|---------|-------------|
| `mosquitto/config/mosquitto.conf` | Configuration du broker MQTT |

---

## 🚀 Scripts

| Fichier | Description |
|---------|-------------|
| `start.sh` | Script de démarrage automatique (chmod +x déjà fait) |

---

## 📊 Structure Complète

```
home-automation/
│
├── 📚 DOCUMENTATION
│   ├── README.md                           ← Commencer ici
│   ├── QUICKSTART.md                       ← Démarrage rapide
│   ├── GUIDE_INSTALLATION.md               ← Guide complet
│   └── FICHIERS_CREES.md                   ← Ce fichier
│
├── 🐳 DOCKER
│   ├── docker-compose.yml                  ← Orchestration services
│   ├── .env.example                        ← Template variables
│   ├── .env                                ← À CRÉER + CONFIGURER
│   └── .gitignore                          ← Git ignore
│
├── 🏠 HOME ASSISTANT
│   └── homeassistant-config/
│       ├── configuration.yaml              ← Config principale
│       ├── secrets.yaml                    ← À CONFIGURER !
│       ├── automations.yaml                ← Automatisations
│       ├── customize.yaml                  ← Personnalisation
│       └── lovelace/
│           ├── tablet.yaml                 ← Dashboard iPad
│           └── resources.yaml              ← Ressources frontend
│
├── 📡 MQTT
│   └── mosquitto/
│       └── config/
│           └── mosquitto.conf              ← Config MQTT
│
└── 🚀 SCRIPTS
    └── start.sh                            ← Démarrage auto
```

---

## ✅ Fichiers à Configurer AVANT de Démarrer

### 1. `.env` (OBLIGATOIRE)

```bash
cp .env.example .env
nano .env
```

Modifier :
- `IPX800_HOST` : IP de votre IPX800
- `IPX800_USER` et `IPX800_PASSWORD`
- `CLOUDFLARE_TOKEN` (optionnel pour accès distant)

### 2. `homeassistant-config/secrets.yaml` (OBLIGATOIRE)

```bash
nano homeassistant-config/secrets.yaml
```

Modifier :
- `ipx800_user` et `ipx800_password`
- `tuya_username` et `tuya_password` (email/password Smart Life)

---

## 🎯 Ordre de Lecture Recommandé

Pour bien démarrer, lire dans cet ordre :

1. **README.md** - Vue d'ensemble du projet
2. **QUICKSTART.md** - Installation rapide
3. **GUIDE_INSTALLATION.md** - Guide détaillé complet
4. Configurer `.env` et `secrets.yaml`
5. Lancer `./start.sh`

---

## 🔐 Sécurité

### Fichiers à NE JAMAIS committer dans Git :

- ❌ `.env` (contient les IPs et tokens)
- ❌ `homeassistant-config/secrets.yaml` (contient les mots de passe)
- ❌ `homeassistant-config/.storage/` (données sensibles)
- ❌ `*.db` (base de données)
- ❌ `*.log` (logs)

Ces fichiers sont déjà dans `.gitignore` !

### Fichiers à committer :

- ✅ Tous les fichiers `.yaml` de configuration (sauf `secrets.yaml`)
- ✅ `docker-compose.yml`
- ✅ `.env.example` (template sans vraies valeurs)
- ✅ Documentation (README, GUIDE, etc.)

---

## 📝 Personnalisation

### Ajouter une pièce/lumière

Modifier : `homeassistant-config/configuration.yaml`

### Créer une automatisation

Modifier : `homeassistant-config/automations.yaml`
OU utiliser l'interface web : Paramètres → Automatisations

### Personnaliser le dashboard tablette

Modifier : `homeassistant-config/lovelace/tablet.yaml`

---

## 🆘 Fichiers de Debug

En cas de problème, vérifier ces fichiers/logs :

```bash
# Logs Home Assistant
docker-compose logs homeassistant

# Vérifier config YAML
docker-compose exec homeassistant python -m homeassistant --script check_config

# Logs MQTT
cat mosquitto/log/mosquitto.log
```

---

## 📦 Sauvegardes

Pour sauvegarder tout le projet :

```bash
cd ~/
tar -czf backup-home-automation-$(date +%Y%m%d).tar.gz home-automation/
```

Restaurer :

```bash
tar -xzf backup-home-automation-YYYYMMDD.tar.gz
```

---

## 🎉 Prêt à Démarrer ?

1. Vérifier que `.env` est configuré
2. Vérifier que `secrets.yaml` est configuré
3. Lancer : `./start.sh`
4. Ouvrir : `http://[IP_SERVEUR]:8123`

**Bon automatisation ! 🏠🤖**
