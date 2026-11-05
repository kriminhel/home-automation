# Commande vocale : Google Home Mini via Matter

« Ok Google, allume le salon » → Google Home Mini → **Matter (réseau local)** → pont `matter-hub`
(Docker, sur pcdomotique) → Home Assistant → IPX800.

- **Gratuit et local** : rien n'est ouvert sur Internet, aucun abonnement.
- La Google Home Mini (1ʳᵉ génération) sert de **hub Matter**, au même titre que les Nest Mini et Nest Audio.
- Pont utilisé : [home-assistant-matter-hub](https://github.com/RiDDiX/home-assistant-matter-hub)
  (fork maintenu, v2.0.59 figée dans `docker-compose.yml`).

## Ce qui est exposé à Google

Config versionnée : [`matter/pont-google.json`](../matter/pont-google.json).

| Inclus | Exclu |
|--------|-------|
| Toutes les lumières (`light.*`) : 21 relais IPX800, le groupe façade jardin, l'Ambilight | **Porte de garage** (`cover.garage*`, `device_class` garage/gate) : jamais à la voix, pour que personne ne l'ouvre en criant depuis la rue |
| Tous les volets (`cover.*`) dès qu'ils existeront dans HA (ESPSomfy-RTS) | Entités techniques (`config`, `diagnostic`) |

`scripts/matter-pont.py` **refuse** une config qui n'exclut pas le garage. Les tests le vérifient aussi.

## Mise en route (à faire une fois, à la maison)

Il faut environ 15 minutes, avec le téléphone sur le **même Wi-Fi** que le serveur.

### 1. Vérifier l'IPv6 du serveur
Matter a besoin de l'IPv6, au moins en lien local. La Freebox le fournit par défaut.
```bash
ip -6 addr show | grep inet6      # au moins une adresse fe80:: sur l'interface réseau
```

### 2. Créer un utilisateur Home Assistant dédié
Dans HA : **Paramètres → Personnes → Utilisateurs → Ajouter**.
1. Nom `matter`, sans droits d'administration.
2. Se connecter avec ce compte : **Profil → Sécurité → Jetons d'accès longue durée → Créer**.
3. Copier le jeton.

### 3. Compléter `.env` sur le serveur
```bash
cd ~/home-automation && git pull
nano .env
```
Ajouter :
```
COMPOSE_PROFILES=matter
MATTER_HA_TOKEN=<le jeton de l'étape 2>
MATTER_ADMIN_USER=admin
MATTER_ADMIN_PASSWORD=<un mot de passe pour l'interface du pont>
MATTER_IP_WHITELIST=192.168.1.0/24
```

### 4. Démarrer le pont et créer la passerelle
```bash
docker compose up -d                 # démarre matter-hub en plus de HA et du portail
docker compose logs -f matter-hub    # attendre « listening » puis Ctrl+C
python3 scripts/matter-pont.py       # crée le pont et affiche le code d'appairage
```
Le script affiche un code à 11 chiffres, par exemple `3497-011-2332`. Le QR code est aussi visible sur `http://192.168.1.37:8482`.

### 5. Appairer avec Google Home
1. Appli **Google Home** → **+** → **Appareil** → **Nouvel appareil** → choisir la maison → **Appareil Matter**.
2. « **Configurer sans QR code** » → saisir le code.
3. Google trouve le pont « Maison - Google » et importe les lumières, une par une.
4. Ranger chaque lumière dans sa **pièce Google** (Salon, Cuisine, Chambre Naïm…). Cela permet de dire « éteins tout au salon » ou « éteins toutes les lumières ».

### 6. Essayer
- « Ok Google, allume le salon » / « éteins la cuisine »
- « Ok Google, éteins toutes les lumières »
- Plus tard, avec les volets : « Ok Google, ferme les volets de la chambre parentale » / « ouvre les volets à 50 % »

## Plus tard : ajouter les volets

Quand ESPSomfy-RTS sera installé, les volets apparaîtront dans HA en `cover.volet_*`. Ils sont déjà inclus par la config. Il suffit de :
```bash
python3 scripts/matter-pont.py       # rafraîchit le pont
```
Google les ajoute alors tout seul. Il reste à les ranger dans les bonnes pièces de l'appli.

> Limite de Google : un volet Matter ne peut pas servir d'**action** dans une routine Google Home.
> Les ouvertures et fermetures automatiques restent donc dans les automatisations de Home Assistant, c'est mieux ainsi.

## Commandes utiles

```bash
python3 scripts/matter-pont.py --etat    # état, nombre d'appareils, entités en échec
python3 scripts/matter-pont.py --essai   # voir la config qui serait envoyée
docker compose restart matter-hub        # après un redémarrage de HA, si Google dit « appareil hors ligne »
```

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Google ne trouve pas le pont | Téléphone sur un autre réseau (4G, Wi-Fi invité) ou mDNS bloqué | Même Wi-Fi que le serveur ; vérifier l'étape 1 |
| Appareils « hors ligne » après l'appairage | IPv6 absent ou pont démarré avant HA | `docker compose restart matter-hub` ; vérifier `ip -6 addr` |
| Nouvelle lumière absente | Le pont ne relit pas HA tout seul | `python3 scripts/matter-pont.py` |
| Nom mal compris par Google | Nom HA ambigu (ex. « Garage », la lumière, à ne pas confondre avec la porte, exclue) | Renommer l'appareil dans l'appli Google Home : seul Google est concerné |
| `401` dans le script | Mot de passe différent entre `.env` et le conteneur | `docker compose up -d matter-hub` après avoir modifié `.env` |

## Sécurité

- Le dossier `matter-hub/` du serveur contient l'identité Matter et les clés de l'appairage. Il est ignoré par git (dépôt public) et doit être **sauvegardé** avec le reste.
- L'interface d'admin (port 8482) est protégée par un mot de passe et limitée au réseau `192.168.1.0/24`.
- Le jeton HA du pont appartient à un utilisateur non administrateur dédié. On peut le révoquer sans toucher au portail.
