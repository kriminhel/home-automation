# « Dis Siri, ouvre le portail »

L'iPhone appelle le script Home Assistant `script.ouvrir_portail`, qui envoie une impulsion au
moteur Nice par un **Shelly 1 Mini Gen3**. Siri demande toujours une **confirmation**.

```
« Dis Siri, ouvre le portail » → raccourci iPhone → (VPN Freebox si hors Wi-Fi) → Home Assistant
   → script.ouvrir_portail → Shelly (contact sec) → carte du moteur Nice
```

## Où on en est

| Élément | Statut |
|---------|--------|
| Script `script.ouvrir_portail` dans HA (`homeassistant-config/configuration.yaml`) | ✅ prêt. **Sans Shelly, il ne fait rien** : il affiche juste une notification dans HA |
| Accès depuis la 4G (VPN Freebox) | 📋 à installer : [`ACCES-DISTANT.md`](ACCES-DISTANT.md) |
| Raccourci Siri | 📋 à créer : voir ci-dessous. On peut le créer tout de suite pour tester la chaîne |
| Shelly sur la carte Nice | 📋 à acheter et poser : `docs/ACHATS.md` n°5 |

## Règles de sécurité retenues
- **Jamais automatique** : pas d'ouverture à l'approche de la maison, pas de routine. Toujours une demande explicite, confirmée.
- **Jamais sur la Google Home Mini** : n'importe qui à portée de voix pourrait ouvrir.
- **Anti-rebond** : une deuxième demande dans les 20 secondes est ignorée.
- Chaque ouverture est inscrite dans le **journal de Home Assistant** (Journal → « Portail »).

## Créer le raccourci Siri (iPhone, ≈ 3 min)

Il faut l'appli **Home Assistant** installée et connectée au serveur de la maison.

1. Ouvrir l'appli **Raccourcis** → **+** (nouveau raccourci).
2. **Ajouter une action** → chercher **Afficher l'alerte** :
   - Titre : `Portail`
   - Message : `Ouvrir le portail ?`
   - Laisser **Afficher le bouton Annuler** activé.

   Avec Siri, c'est la confirmation vocale : « Ouvrir le portail ? », puis « Oui » ou « Annuler ».
3. **Ajouter une action** → chercher **Home Assistant** → **Exécuter le script** (selon la version de l'appli : *Run Script* ou *Effectuer une action* → `script.turn_on`) :
   - Serveur : la maison
   - Script : **Portail - ouvrir**
4. (Facultatif) **Ajouter une action** → **Afficher le résultat** : `Portail : commande envoyée`.
5. Renommer le raccourci **`Ouvre le portail`**. Le nom du raccourci est la phrase à dire à Siri.

### Essayer
- « Dis Siri, ouvre le portail » → Siri : « Ouvrir le portail ? » → « Oui ».
- **Tant que le Shelly n'est pas posé**, rien ne bouge. Dans Home Assistant, une notification « Commande reçue, mais le Shelly du portail n'est pas encore installé » doit apparaître. Si elle apparaît, toute la chaîne fonctionne.
- Le même essai en 4G vérifie le VPN.

### Écran verrouillé
Vérifier ce que fait Siri iPhone verrouillé. S'il exécute le raccourci **sans demander de déverrouiller**, il y a deux choix :
- accepter : la confirmation suffit, et il faut de toute façon avoir le téléphone en main ;
- ou **Réglages** → **Siri** → désactiver **Autoriser Siri en mode verrouillé**.

## Le jour où le Shelly arrive

1. **Brancher le Shelly** dans le coffret du moteur Nice, de préférence par un électricien :
   - de préférence sur l'entrée **OPEN** (ouverture seule) si la carte en a une ;
   - sinon sur l'entrée **« pas à pas »** (SbS). ⚠️ Celle-ci **ouvre ou ferme selon l'état** : si le portail est déjà ouvert, « ouvre le portail » le refermera. Il faudra alors renommer le script « Portail - ouvrir/fermer », et envisager un capteur d'ouverture.
2. **L'intégrer à Home Assistant** :
   - Paramètres → Appareils → l'intégration **Shelly** le détecte tout seul → Configurer ;
   - **renommer son interrupteur** en `switch.portail_nice`. C'est ce nom que le script attend.
3. Dans l'appli Shelly, régler **Auto-off : 1 s**. C'est une sécurité en plus de l'impulsion du script.
4. Retester « Dis Siri, ouvre le portail ». La notification « pas installé » ne doit plus apparaître, et le portail doit bouger.
5. Ensuite, si on le veut : ajouter un bouton **Portail** (avec confirmation) sur la tablette.
