# Batterie des téléphones sur la tablette

Les profils de la tablette (Famille) affichent la batterie de chaque téléphone : `82 % ⚡` quand il
charge, en **rouge** à 20 % ou moins. Les données viennent de l'**appli Home Assistant** installée
sur chaque téléphone. La tablette les lit seulement, elle ne peut rien piloter sur un téléphone.

## Brancher un téléphone (≈ 5 min par téléphone)
1. Installer l'appli **Home Assistant** (App Store ou Play Store).
2. Se connecter au serveur `http://192.168.1.37:8123` depuis le Wi-Fi de la maison, avec son propre
   compte HA. Les enfants peuvent avoir un compte non administrateur.
3. Accepter les **notifications** et la **localisation**, celle-ci étant facultative pour la batterie.
4. Dans HA → **Paramètres → Appareils et services → Application mobile** : le téléphone apparaît.
   Ses capteurs s'appellent par exemple :
   - `sensor.iphone_de_karim_battery_level` (niveau en %)
   - `sensor.iphone_de_karim_battery_state` (en charge ou non)
5. Me donner ces deux noms, ou les ajouter soi-même dans `portail/maison.json`, sur l'habitant
   concerné :
   ```json
   { "nom": "Karim", "pieces": ["Chambre parentale"], "avatar": "prive/karim.jpg",
     "batterie": "sensor.iphone_de_karim_battery_level",
     "batterie_etat": "sensor.iphone_de_karim_battery_state" }
   ```
6. `docker compose restart portail`.

## Bon à savoir
- Hors de la maison, le téléphone n'envoie sa batterie que s'il joint Home Assistant, c'est-à-dire
  avec le **VPN Freebox** (`docs/ACCES-DISTANT.md`). Sinon la tablette affiche la dernière valeur
  connue, puis « pas de nouvelles ».
- L'appli met à jour la batterie toutes les quelques minutes, pas en continu. iOS économise la
  batterie.
- Le même branchement donne aussi les **notifications sur le téléphone** : `notify.mobile_app_…`,
  utilisable plus tard pour l'alerte garage.
