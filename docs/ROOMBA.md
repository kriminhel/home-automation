# Aspirateur Roomba : tablette et voix

```
Roomba ⇄ Wi-Fi local ⇄ Home Assistant (intégration iRobot Roomba)
          ├─ tablette : tuile « Roomba » dans le Salon (▶ nettoyer · ⏸ pause · ⌂ retour à la base)
          └─ pont Matter → Google Home Mini : « Ok Google, lance Roomba »
```

Tout passe en **local** : le Roomba est piloté directement sur le Wi-Fi de la maison, sans le cloud iRobot.

## 1. L'ajouter à Home Assistant (≈ 5 min, à côté du robot)
1. Le Roomba doit être sur sa base, chargé, et déjà configuré dans l'appli **iRobot Home**, sur le
   Wi-Fi de la maison.
2. Home Assistant → **Paramètres → Appareils et services**. HA le détecte souvent tout seul :
   carte « **iRobot Roomba and Braava** · Découvert » → **Configurer**. Sinon, **Ajouter une
   intégration** → *iRobot Roomba and Braava*.
3. Quand HA le demande, **appuyer environ 2 secondes sur le bouton ⌂ (HOME)** du robot, jusqu'au
   son. Sur certains modèles, il faut maintenir **HOME** jusqu'à ce que l'anneau lumineux clignote.
   HA récupère alors le mot de passe du robot tout seul.
4. **Renommer l'entité** de l'aspirateur en `vacuum.roomba` : Paramètres → Entités → l'aspirateur
   → ⚙️ → Identifiant d'entité. C'est le nom attendu par la tablette et par les tests.

> Le Roomba n'accepte souvent qu'**une seule connexion locale** à la fois. Si l'appli iRobot
> affiche « robot hors ligne » pendant que HA est connecté, c'est normal. L'appli repasse par le
> cloud et le robot reste pilotable des deux côtés.

## 2. Sur la tablette
La tuile **Roomba** est déjà déclarée dans `portail/maison.json`, dans le **Salon**. Si sa base
est ailleurs, me le dire, ou déplacer la ligne `vacuum.roomba` dans la bonne pièce. Elle affiche
« Sur sa base », « En nettoyage », « Retour à la base » ou « Bloqué : à vérifier » (en rouge).
Après le branchement : `docker compose restart portail`.

## 3. À la voix (Google Home Mini)
Les aspirateurs (`vacuum.*`) sont inclus dans le pont Matter « Maison ». Sur le serveur :
```bash
cd ~/home-automation && git pull && python3 scripts/matter-pont.py
```
Le Roomba apparaît alors dans l'appli Google Home. Le ranger dans une pièce, et le renommer
« Roomba » si besoin.

Phrases à essayer :
- « Ok Google, lance Roomba » / « démarre l'aspirateur »
- « Ok Google, mets Roomba en pause » / « arrête l'aspirateur »
- « Ok Google, renvoie Roomba à sa base » **[à vérifier]** : Google ne propose pas toujours le
  retour à la base pour un aspirateur Matter. Sinon, le bouton ⌂ de la tablette le fait.

> **Ne pas lier aussi l'appli iRobot à Google Home** (« Fonctionne avec Google »). Sinon le Roomba
> apparaît deux fois et Google ne sait plus lequel piloter. Si un « Roomba » iRobot existe déjà
> dans Google Home, le supprimer et garder celui du pont Matter.

## Idées pour plus tard
- Nettoyage automatique quand toute la famille est sortie : demande la position des téléphones et le VPN.
- Pièce par pièce : selon le modèle, si le Roomba connaît les pièces de la maison.
