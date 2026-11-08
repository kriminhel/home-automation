# Commande vocale : Google Home Mini via Matter

« Ok Google, allume le salon » → enceinte « Alia » (Google Home Mini) → **Matter (réseau local)** →
pont `matter-hub` (Docker, sur pcdomotique) → Home Assistant → IPX800.

- **Gratuit et local** : rien n'est ouvert sur Internet, aucun abonnement.
- Pont utilisé : [home-assistant-matter-hub](https://github.com/RiDDiX/home-assistant-matter-hub)
  (fork maintenu, v2.0.59 figée dans `docker-compose.yml`).
- **En service depuis le 05/11/2026** : appairage fait, commandes vocales du salon testées.

## Ce qui est exposé à Google

Config versionnée : [`matter/pont-google.json`](../matter/pont-google.json).

| Inclus | Exclu |
|--------|-------|
| Les lumières (`light.*`), soit 22 appareils | **Porte de garage** (`cover.garage*`, `device_class` garage/gate) : jamais à la voix, faute de code vocal |
| TV Philips de Naïm (`media_player.tv_naim`) et Apple TV d'Amel (`media_player.apple_tv_amel`), vues par Google comme des **enceintes** : marche/arrêt, volume, lecture/pause | Ambilight de Naïm, entités techniques (`config`, `diagnostic`) |
| | TV du salon et boîtier de la chambre parentale : déjà compatibles Google d'origine, on ne les expose pas une 2ᵉ fois |

`scripts/matter-pont.py` **refuse** une config qui n'exclut pas le garage. Les tests le vérifient aussi.

## Réinstaller le pont

Le pont démarre avec `docker compose up -d`. Il réutilise `HA_TOKEN` de `.env`, un jeton à accès complet à HA.

Dans `.env` sur le serveur :
```
MATTER_ADMIN_USER=admin
MATTER_ADMIN_PASSWORD=<mot de passe de l'interface du pont>
```
Sans mot de passe, l'interface reste ouverte sur le réseau local et le script refuse de tourner.

```bash
docker compose up -d
python3 scripts/matter-pont.py    # crée ou met à jour le pont, affiche le code d'appairage
```

## Appairer avec Google Home

Inutile tant que le volume `matter-hub-data` existe : il contient l'identité Matter et l'appairage.

1. iPhone sur le même Wi-Fi que le serveur, enceinte visible dans l'appli Google Home.
2. **+** → **Appareil** → **Appareil Matter**.
3. Scanner le QR code sur `http://192.168.1.37:8482`, ou saisir le code à 11 chiffres **sans tirets**.
4. Accepter le message « appareil non certifié ».
5. Ranger les lumières dans leurs pièces Google.

## TV

| TV | Comment Google la pilote |
|----|--------------------------|
| Salon (Xiaomi Google TV) | **D'origine** : appli Google Home → + → Configurer un appareil, même compte Google. Applis, lecture, volume, arrêt. |
| Chambre parentale (boîtier Xiaomi Android TV) | **D'origine**, comme le salon. « Allume » échoue tant qu'il coupe son Wi-Fi en veille. |
| Naïm (Philips) | **Via le pont**, comme une enceinte : « Ok Google, éteins la TV de Naïm », « monte le volume de la TV de Naïm ». Pas de choix d'appli ni de chaîne. |
| Amel (Apple TV) | **Via le pont**, comme une enceinte : marche/arrêt, lecture/pause. Le volume dépend de la TV branchée derrière (HDMI-CEC). |

Après `python3 scripts/matter-pont.py`, Google ajoute les 2 nouveaux appareils au pont « Maison ». Il faut ensuite les renommer dans l'appli Google Home (« TV Naïm », « TV Amel ») et les ranger dans leur pièce.
> Google affiche parfois les enceintes Matter de façon limitée. Si une commande ne marche pas, me dire laquelle : le pont permet de les présenter autrement (simple interrupteur marche/arrêt).

## Plus tard : ajouter les volets

Quand ils seront dans HA (ESPSomfy-RTS) :
1. Ajouter `{ "type": "domain", "value": "cover" }` à `filter.include` dans `matter/pont-google.json` et adapter le test `test_lumieres_et_deux_tv_incluses`.
2. Lancer `python3 scripts/matter-pont.py`.
3. Vérifier que le garage n'apparaît pas dans Google Home.

## Commandes utiles

```bash
python3 scripts/matter-pont.py --etat    # état, nombre d'appareils, entités en échec
python3 scripts/matter-pont.py --essai   # voir la config qui serait envoyée
docker compose restart matter-hub        # si Google indique « hors ligne »
```

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Google ne trouve pas le pont | Téléphone sur un autre réseau ou mDNS bloqué | Même Wi-Fi que le serveur |
| Appareils « hors ligne » | Pont démarré avant HA, ou adresse IPv6 publique annoncée | `docker compose restart matter-hub`, puis essayer l'option `--mdns-strip-global-ipv6` |
| Nouvelle lumière absente | Le pont n'a pas relu HA | `python3 scripts/matter-pont.py` |
| Nom mal compris | Nom ambigu : « Garage » est la lumière, la porte est exclue | Renommer dans l'appli Google Home |
| `401` dans le script | Mot de passe différent entre `.env` et le conteneur | `docker compose up -d matter-hub` |
| `403` sur l'interface | Adresse hors de `192.168.1.0/24` | Passer par le réseau local en IPv4 |

## Sécurité

- Le volume `matter-hub-data` contient les clés de l'appairage : à inclure dans les sauvegardes du serveur.
- L'interface d'admin (port 8482) est protégée par mot de passe et limitée au réseau `192.168.1.0/24`.
- Le pont détient un jeton à accès complet à HA. L'exclusion du garage vaut pour Google, pas pour le jeton.
