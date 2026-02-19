# 🏠 Guide d'Installation - Domotique Complète

Contrôle unifié : IPX800 V3 (lumières) + Loratap (volets/garage)

---

## 📋 Prérequis Matériel

### Équipement nécessaire :
- ✅ **IPX800 V3** configuré sur le réseau (ex: 192.168.1.100)
- ✅ **Modules Loratap** :
  - Volets roulants (SW-RC01 ou similaire)
  - Porte de garage (SW-GD01 ou similaire)
- ✅ **Serveur** (Raspberry Pi 4, NAS Synology, PC Linux, etc.)
- ✅ **Tablette iPad** (iOS 12+)
- ✅ **Box Internet** avec accès à la configuration réseau

---

## 🚀 ÉTAPE 1 : Configuration des Modules Loratap

### 1.1 - Installation App Tuya/Smart Life

Sur votre smartphone :

1. **Télécharger l'app**
   - iOS : App Store → "Smart Life"
   - Android : Play Store → "Smart Life"

2. **Créer un compte**
   - Email + mot de passe
   - **IMPORTANT** : Noter vos identifiants pour plus tard

3. **Ajouter les modules Loratap**
   - Ouvrir Smart Life
   - Appuyer sur `+` (ajouter appareil)
   - Sélectionner "Volet roulant" ou "Porte de garage"
   - Suivre les instructions :
     1. Mettre le module en mode appairage (LED clignote)
     2. Connecter au WiFi 2.4GHz de votre maison
     3. Nommer l'appareil (ex: "Volet Salon", "Garage")

4. **Répéter pour chaque module**
   - Volet Salon
   - Volet Cuisine
   - Volet Chambre 1
   - Volet Chambre 2
   - Volet SdB
   - Garage

5. **Tester le contrôle**
   - Vérifier que chaque volet/garage répond dans l'app

### 1.2 - Obtenir les Credentials Tuya (pour Home Assistant)

**Option A - Via l'intégration Home Assistant (RECOMMANDÉ)**

Vous configurerez directement dans Home Assistant à l'étape 3.

**Option B - Via Tuya Cloud (avancé)**

Si vous voulez le contrôle local :

1. Aller sur https://iot.tuya.com/cloud/
2. Créer un compte développeur (gratuit)
3. Créer un projet "Cloud"
4. Obtenir :
   - `Access ID`
   - `Access Secret`
   - `Device ID` (pour chaque appareil)
5. Noter ces informations dans `.env`

---

## 🐳 ÉTAPE 2 : Installation Home Assistant

### 2.1 - Préparer le serveur

```bash
# Se connecter à votre serveur en SSH
ssh user@votre-serveur-ip

# Cloner le projet
cd ~
git clone https://github.com/votre-repo/betanalyst-pro.git
cd betanalyst-pro/home-automation

# Ou créer manuellement si vous avez les fichiers
mkdir -p ~/home-automation
cd ~/home-automation
```

### 2.2 - Configurer les variables

```bash
# Éditer le fichier .env
nano .env
```

**Modifier les valeurs :**

```env
# IPX800
IPX800_HOST=192.168.1.100        # ← Votre IP IPX800
IPX800_USER=admin                 # ← Votre user IPX800
IPX800_PASSWORD=votremotdepasse  # ← Votre password IPX800

# MQTT
MQTT_USER=homeassistant
MQTT_PASSWORD=changez-moi-123    # ← Choisir un mot de passe fort

# Cloudflare Tunnel (optionnel pour l'instant)
# CLOUDFLARE_TOKEN=laisser-vide-pour-le-moment
```

### 2.3 - Configurer Home Assistant

```bash
# Éditer secrets.yaml
nano homeassistant-config/secrets.yaml
```

**Modifier :**

```yaml
ipx800_user: admin
ipx800_password: votre_mot_de_passe_ipx800

# Identifiants Smart Life (app mobile)
tuya_username: votre@email.com
tuya_password: votre_mot_de_passe_smartlife
tuya_country_code: "33"  # France
tuya_application_type: smart_life
```

### 2.4 - Démarrer Home Assistant

```bash
# Lancer Docker Compose
docker-compose up -d homeassistant

# Vérifier les logs
docker-compose logs -f homeassistant

# Attendre 2-3 minutes le démarrage
```

### 2.5 - Première connexion

1. **Ouvrir le navigateur**
   - Aller sur : `http://[IP_SERVEUR]:8123`
   - Exemple : `http://192.168.1.50:8123`

2. **Configuration initiale**
   - Créer un compte administrateur
   - Nom : Votre nom
   - Username : admin
   - Mot de passe : **CHOISIR UN MOT DE PASSE FORT**

3. **Configurer la localisation**
   - Pays : France
   - Fuseau : Europe/Paris
   - Unités : Métriques

4. **Terminer la configuration**

---

## 🔌 ÉTAPE 3 : Intégration Loratap dans Home Assistant

### 3.1 - Ajouter l'intégration Tuya

1. **Dans Home Assistant**
   - Aller dans `Paramètres` (icône ⚙️)
   - Cliquer sur `Appareils et services`
   - Cliquer sur `+ Ajouter une intégration`
   - Chercher : **"Tuya"**

2. **Connexion à votre compte Smart Life**
   - Sélectionner : "Smart Life App"
   - Entrer votre **email Smart Life**
   - Entrer votre **mot de passe Smart Life**
   - Choisir le pays : **France**

3. **Vérification**
   - Home Assistant va découvrir automatiquement vos appareils Loratap
   - Vous devriez voir :
     - `cover.volet_salon`
     - `cover.volet_cuisine`
     - `cover.garage`
     - etc.

4. **Renommer les entités** (optionnel mais recommandé)
   - Cliquer sur chaque appareil
   - Onglet "Paramètres" (⚙️)
   - Modifier le `Entity ID` si besoin
   - Exemple : `cover.tuya_xxxxx` → `cover.volet_salon`

### 3.2 - Tester les appareils

1. **Vue d'ensemble**
   - Aller dans `Vue d'ensemble`
   - Vous devriez voir toutes vos entités

2. **Test de contrôle**
   - Cliquer sur un volet → Il devrait monter/descendre
   - Cliquer sur le garage → Il devrait s'ouvrir/fermer

---

## 📱 ÉTAPE 4 : Configuration Interface Tablette

### 4.1 - Activer le dashboard tablette

Le dashboard est déjà configuré dans `lovelace/tablet.yaml`.

1. **Dans Home Assistant**
   - Aller dans `Vue d'ensemble`
   - Cliquer sur les **3 points** en haut à droite
   - `Modifier le tableau de bord`
   - Vérifier que le mode YAML est activé

2. **Accéder au dashboard tablette**
   - Dans la barre latérale : `Tablette` (icône 📱)

### 4.2 - Installer sur iPad

1. **Sur l'iPad, ouvrir Safari**
   - Aller sur : `http://[IP_SERVEUR]:8123`
   - Se connecter avec vos identifiants

2. **Naviguer vers le dashboard tablette**
   - Cliquer sur "Tablette" dans la sidebar

3. **Ajouter à l'écran d'accueil**
   - Cliquer sur le bouton **Partager** (⬆️)
   - Sélectionner **"Sur l'écran d'accueil"**
   - Nommer : "Maison" ou "Domotique"
   - Cliquer sur **Ajouter**

4. **Mode Kiosque (optionnel)**
   - Dans Home Assistant → Paramètres → Utilisateurs
   - Créer un utilisateur "Tablette"
   - Activer "Autoriser uniquement les dashboards sélectionnés"
   - Sélectionner uniquement "Tablette"

### 4.3 - Optimisation pour tablette fixe

Si vous laissez l'iPad fixé au mur :

1. **Désactiver verrouillage auto**
   - iPad → Réglages → Luminosité et affichage
   - Verrouillage auto : Jamais

2. **Mode Guidé** (empêche de sortir de l'app)
   - iPad → Réglages → Accessibilité → Accès guidé
   - Activer
   - Définir un code PIN
   - Dans Safari sur la page Home Assistant, triple-clic sur le bouton principal
   - Activer l'accès guidé

---

## 🌐 ÉTAPE 5 : Accès Depuis l'Extérieur

Plusieurs options pour contrôler depuis Internet :

### Option 1 : Nabu Casa (RECOMMANDÉ - Facile)

**Avantages :**
- ✅ Configuration automatique en 2 clics
- ✅ HTTPS sécurisé
- ✅ Intégration Google Home / Alexa incluse
- ✅ Support officiel Home Assistant
- ❌ Payant : 6.50€/mois (65€/an)

**Installation :**

1. Dans Home Assistant :
   - `Paramètres` → `Home Assistant Cloud`
   - S'inscrire à Nabu Casa
   - Activer le Remote Access

2. Accès distant :
   - URL : `https://[votre-id].ui.nabu.casa`
   - Accessible depuis n'importe où

### Option 2 : Cloudflare Tunnel (GRATUIT - Moyen)

**Avantages :**
- ✅ Gratuit à vie
- ✅ HTTPS automatique
- ✅ Pas besoin d'ouvrir de ports
- ✅ Protection DDoS incluse
- 🟡 Configuration un peu technique

**Installation :**

1. **Créer un compte Cloudflare**
   - Aller sur https://dash.cloudflare.com/sign-up
   - Gratuit

2. **Créer un tunnel**
   - Dashboard Cloudflare → `Zero Trust` → `Tunnels`
   - Cliquer sur `Create a tunnel`
   - Nommer : "home-assistant"
   - Copier le **token**

3. **Configurer le tunnel**

   Éditer `.env` :
   ```env
   CLOUDFLARE_TOKEN=votre-token-copié
   ```

4. **Relancer Docker**
   ```bash
   docker-compose up -d cloudflared
   ```

5. **Configurer le routing**
   - Dans Cloudflare Tunnel → Public Hostname
   - Subdomain : `home` (ou ce que vous voulez)
   - Domain : votre domaine ou créer un gratuit sur Cloudflare
   - Service : `http://localhost:8123`
   - Sauvegarder

6. **Accès distant**
   - URL : `https://home.votre-domaine.com`
   - Accessible depuis n'importe où

### Option 3 : DuckDNS + Let's Encrypt (GRATUIT - Avancé)

**Avantages :**
- ✅ Gratuit
- ✅ Votre propre domaine
- 🔴 Nécessite ouverture de port (port forwarding)
- 🔴 Plus complexe

**Installation :**

1. **Créer un compte DuckDNS**
   - https://www.duckdns.org/
   - Créer un sous-domaine : `mamaison.duckdns.org`

2. **Configurer port forwarding sur votre box**
   - Port 8123 (TCP) → IP du serveur
   - Port 443 (TCP) → IP du serveur (pour HTTPS)

3. **Configurer Home Assistant**

   Ajouter dans `configuration.yaml` :
   ```yaml
   http:
     ssl_certificate: /ssl/fullchain.pem
     ssl_key: /ssl/privkey.pem
   ```

4. **Installer Let's Encrypt**
   - Home Assistant → Add-ons → Add-on store
   - Installer "Let's Encrypt"
   - Configurer avec votre domaine DuckDNS

### Option 4 : VPN WireGuard (GRATUIT - Très sécurisé)

**Avantages :**
- ✅ Le plus sécurisé
- ✅ Gratuit
- ✅ Accès complet au réseau local
- 🟡 Nécessite une app VPN sur le téléphone

**Installation :**

Voir le guide séparé `GUIDE_VPN_WIREGUARD.md`

---

## 🔐 Sécurité & Bonnes Pratiques

### Mots de passe

- ✅ Utiliser des mots de passe **différents** pour :
  - Home Assistant
  - IPX800
  - Smart Life / Tuya
  - Cloudflare / DuckDNS

- ✅ Activer l'**authentification 2FA** quand disponible
  - Home Assistant supporte 2FA (recommandé !)
  - Cloudflare supporte 2FA

### Réseau

- ✅ Mettre les appareils IoT sur un VLAN séparé si possible
- ✅ Ne PAS exposer l'IPX800 directement sur Internet
- ✅ Utiliser HTTPS pour l'accès distant
- ✅ Configurer un firewall sur le serveur

### Sauvegardes

```bash
# Sauvegarder la configuration Home Assistant
cd ~/home-automation
tar -czf backup-ha-$(date +%Y%m%d).tar.gz homeassistant-config/

# Automatiser avec cron (tous les jours à 3h)
crontab -e
# Ajouter :
0 3 * * * cd ~/home-automation && tar -czf backup-ha-$(date +\%Y\%m\%d).tar.gz homeassistant-config/
```

---

## 🧪 Tests & Validation

### Checklist de validation

- [ ] Home Assistant accessible sur `http://IP:8123`
- [ ] IPX800 - Toutes les lumières contrôlables
- [ ] Loratap - Tous les volets contrôlables
- [ ] Loratap - Garage contrôlable
- [ ] Dashboard tablette fonctionnel sur iPad
- [ ] iPad ajouté à l'écran d'accueil
- [ ] Automatisations testées (volets au coucher du soleil)
- [ ] Accès distant configuré et fonctionnel
- [ ] Application mobile Home Assistant installée
- [ ] Google Home intégré (optionnel)

### Commandes de test

```bash
# Vérifier les containers Docker
docker-compose ps

# Logs Home Assistant
docker-compose logs -f homeassistant

# Redémarrer Home Assistant
docker-compose restart homeassistant

# Tester l'API IPX800
curl http://192.168.1.100/api/xdevices.json -u admin:password
```

---

## 📱 Application Mobile (Bonus)

### Installer l'app Home Assistant

**iOS :**
1. App Store → "Home Assistant"
2. Se connecter avec l'URL de votre instance
3. Activer les notifications

**Android :**
1. Play Store → "Home Assistant"
2. Se connecter
3. Activer les notifications et géolocalisation

### Fonctionnalités app mobile

- ✅ Contrôle complet de la maison
- ✅ Notifications push
- ✅ Automatisation basée sur la géolocalisation
  - Éteindre tout en partant
  - Allumer chauffage en arrivant
- ✅ Widgets iOS/Android

---

## 🎨 Personnalisation

### Ajouter des pièces

Éditer `homeassistant-config/configuration.yaml` :

```yaml
light:
  - platform: template
    lights:
      bureau:
        friendly_name: "Lumière Bureau"
        value_template: "{{ states('sensor.ipx800_relay_6') == 'on' }}"
        turn_on:
          service: rest_command.ipx800_set_relay
          data:
            relay: 6
            state: true
        turn_off:
          service: rest_command.ipx800_set_relay
          data:
            relay: 6
            state: false
```

### Modifier le dashboard

Éditer `homeassistant-config/lovelace/tablet.yaml`

---

## 🆘 Dépannage

### Problème : Home Assistant ne démarre pas

```bash
# Vérifier les logs
docker-compose logs homeassistant

# Vérifier la syntaxe YAML
docker run --rm -v $(pwd)/homeassistant-config:/config homeassistant/home-assistant:stable python -m homeassistant --script check_config --config /config
```

### Problème : IPX800 injoignable

```bash
# Tester la connectivité
ping 192.168.1.100

# Tester l'API
curl http://192.168.1.100/api/xdevices.json
```

### Problème : Loratap non détecté

1. Vérifier que les modules sont bien sur le WiFi 2.4GHz
2. Vérifier l'intégration Tuya dans Home Assistant
3. Re-synchroniser : Paramètres → Intégrations → Tuya → ⋮ → Recharger

### Problème : Accès distant ne fonctionne pas

**Cloudflare :**
```bash
# Vérifier le container
docker-compose logs cloudflared
```

**Nabu Casa :**
- Vérifier l'abonnement actif
- Paramètres → Home Assistant Cloud → État

---

## 📚 Ressources

- [Documentation Home Assistant](https://www.home-assistant.io/docs/)
- [Forum Home Assistant](https://community.home-assistant.io/)
- [IPX800 API](https://gce.ovh/wiki/index.php?title=API_V4)
- [Tuya Integration](https://www.home-assistant.io/integrations/tuya/)
- [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

## ✅ Prochaines Étapes

Vous avez maintenant :
- ✅ Contrôle unifié lumières + volets + garage
- ✅ Interface tablette optimisée
- ✅ Accès distant sécurisé
- ✅ Automatisations intelligentes

**Évolutions possibles :**
- 🎯 Intégration Google Home / Alexa
- 🎯 Capteurs de température/humidité
- 🎯 Caméras de surveillance
- 🎯 Détection de présence
- 🎯 Contrôle du chauffage
- 🎯 Alarme connectée

---

**Besoin d'aide ?** Créez une issue sur le repo GitHub !
