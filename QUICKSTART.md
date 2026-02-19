# ⚡ Démarrage Rapide - 5 Minutes

Guide ultra-rapide pour lancer votre système domotique.

---

## 🚀 Installation Express

```bash
# 1. Cloner/télécharger le projet
cd ~/
git clone <votre-repo>
cd home-automation

# 2. Configurer
cp .env.example .env
nano .env  # Modifier IPX800_HOST et mots de passe

# 3. Démarrer
./start.sh

# 4. Accéder
# Ouvrir : http://[IP_SERVEUR]:8123
```

---

## 📝 Configuration Minimale

### Fichier `.env`

```env
IPX800_HOST=192.168.1.100        # ← CHANGER ICI
IPX800_USER=admin
IPX800_PASSWORD=votre_password    # ← CHANGER ICI
```

### Fichier `secrets.yaml`

```yaml
ipx800_user: admin
ipx800_password: votre_password   # ← CHANGER ICI

tuya_username: votre@email.com    # ← Email Smart Life
tuya_password: votre_password     # ← Password Smart Life
```

---

## ✅ Checklist de Démarrage

### Avant de commencer

- [ ] Docker et Docker Compose installés
- [ ] IPX800 V3 accessible sur le réseau
- [ ] Modules Loratap configurés dans Smart Life
- [ ] Connaître l'IP de votre serveur

### Installation

- [ ] Fichier `.env` configuré
- [ ] Fichier `secrets.yaml` configuré
- [ ] Script `./start.sh` exécuté
- [ ] Home Assistant accessible sur port 8123

### Première configuration

- [ ] Compte admin créé dans Home Assistant
- [ ] Intégration Tuya ajoutée (Paramètres → Intégrations)
- [ ] Appareils Loratap détectés
- [ ] Test : Allumer/éteindre une lumière IPX800
- [ ] Test : Ouvrir/fermer un volet Loratap

### iPad

- [ ] Safari ouvert sur `http://[IP]:8123`
- [ ] Dashboard "Tablette" accessible
- [ ] Ajouté à l'écran d'accueil
- [ ] Mode plein écran fonctionnel

---

## 🎯 Premiers Tests

### Test 1 : Lumières IPX800

```bash
# Tester l'API IPX800 directement
curl http://192.168.1.100/api/xdevices.json -u admin:password
```

Dans Home Assistant :
1. Vue d'ensemble → Lumières
2. Cliquer sur une lumière → Elle doit s'allumer

### Test 2 : Volets Loratap

1. Paramètres → Intégrations → Tuya
2. Vérifier que les volets apparaissent
3. Vue d'ensemble → Volets
4. Cliquer sur Monter/Descendre

### Test 3 : Scènes

1. Dashboard Tablette → Vue Accueil
2. Cliquer sur "Mode Soirée"
3. Vérifier que les lumières s'allument selon la scène

---

## 🌐 Accès Distant (Optionnel)

### Option Simple : Nabu Casa (6.50€/mois)

1. Home Assistant → Paramètres → Home Assistant Cloud
2. S'inscrire à Nabu Casa
3. Activer Remote Access
4. Accès via : `https://[votre-id].ui.nabu.casa`

### Option Gratuite : Cloudflare Tunnel

1. Créer compte sur https://dash.cloudflare.com
2. Zero Trust → Tunnels → Create Tunnel
3. Copier le token
4. Ajouter dans `.env` : `CLOUDFLARE_TOKEN=votre-token`
5. Relancer : `docker-compose up -d cloudflared`

---

## 🆘 Problèmes Courants

### "Home Assistant ne répond pas"

```bash
# Vérifier les logs
docker-compose logs homeassistant

# Redémarrer
docker-compose restart homeassistant
```

### "IPX800 non détecté"

1. Vérifier l'IP : `ping 192.168.1.100`
2. Vérifier les credentials dans `secrets.yaml`
3. Tester l'API : `curl http://192.168.1.100/api/xdevices.json`

### "Loratap non détecté"

1. Vérifier que les modules fonctionnent dans Smart Life
2. Home Assistant → Intégrations → Tuya → ⋮ → Recharger
3. Vérifier email/password Smart Life dans `secrets.yaml`

### "Dashboard tablette vide"

1. Vérifier que le fichier existe : `homeassistant-config/lovelace/tablet.yaml`
2. Home Assistant → Tableau de bord → Modifier
3. Recharger la page (CTRL+F5)

---

## 📱 App Mobile (Bonus)

### iOS

1. App Store → "Home Assistant"
2. Se connecter : `http://[IP_SERVEUR]:8123`
3. Activer les notifications

### Android

1. Play Store → "Home Assistant"
2. Se connecter
3. Activer notifications et géolocalisation

---

## 🔧 Commandes Utiles

```bash
# Démarrer tout
docker-compose up -d

# Arrêter tout
docker-compose down

# Redémarrer Home Assistant
docker-compose restart homeassistant

# Voir les logs en direct
docker-compose logs -f homeassistant

# Status des containers
docker-compose ps

# Sauvegarde
tar -czf backup-$(date +%Y%m%d).tar.gz homeassistant-config/

# Mise à jour
docker-compose pull
docker-compose up -d
```

---

## 📚 Documentation Complète

Pour aller plus loin :

- **[GUIDE_INSTALLATION.md](GUIDE_INSTALLATION.md)** - Guide détaillé complet
- **[README.md](README.md)** - Documentation du projet
- **Home Assistant Docs** - https://www.home-assistant.io/docs/

---

## 🎉 Prochaines Étapes

Une fois que tout fonctionne :

1. ✅ Personnaliser les automatisations
2. ✅ Créer vos propres scènes
3. ✅ Ajouter Google Home / Alexa
4. ✅ Installer l'app mobile
5. ✅ Configurer l'accès distant
6. ✅ Ajouter d'autres appareils (capteurs, caméras, etc.)

**Bon contrôle domotique ! 🏠**
