# Liste de courses : « Ok Google », Siri et tablette

**Une seule liste**, alimentée de trois façons :

```
« Ok Google, ajoute du lait à ma liste de courses » → Google Keep ─┐
« Dis Siri, ajoute du pain aux courses » → Home Assistant ─────────┼─ todo.courses ⇄ Google Keep (synchronisé)
Tablette : onglet 🧺 Courses (ajouter, cocher, retirer les cochés) ┘
```

Home Assistant garde la liste sous le nom `todo.courses`. La tablette et Siri écrivent dedans.
L'Assistant Google écrit dans Google Keep, et l'intégration **Google Keep Sync** recopie dans les
deux sens. Sur la tablette, l'onglet se rafraîchit toutes les 10 s : un article dicté à la Google
Home Mini y apparaît tout seul.

## 1. Relier Google Keep à Home Assistant (≈ 15 min)

> ⚠️ **Intégration non officielle** ([Google Keep Sync](https://github.com/watkins-matt/home-assistant-google-keep-sync),
> via HACS), non liée à Google. Elle se connecte avec un **jeton de ton compte Google** qui donne
> un accès large au compte. Il ne doit vivre **que dans Home Assistant** : jamais dans un message,
> jamais dans le dépôt. Si tu préfères ne pas le faire, voir « Sans Google Keep » plus bas.

1. **Vérifier où l'Assistant range les courses** : appli Google Home → Paramètres → Assistant
   Google → *Notes et listes* → **Google Keep**. La liste s'appelle « Liste de courses » ou
   « Courses » dans Keep.
2. **Installer HACS** dans Home Assistant si ce n'est pas déjà fait (voir hacs.xyz).
3. HACS → Intégrations → chercher **Google Keep Sync** → Télécharger → **redémarrer HA**.
4. Paramètres → Appareils et services → **Ajouter une intégration** → *Google Keep Sync* :
   e-mail du compte Google, puis le jeton. La procédure pour l'obtenir est dans le README du projet.
5. Cocher la liste **« Liste de courses »** de Keep.
6. **Renommer l'entité** créée, par exemple `todo.google_keep_liste_de_courses`, en
   **`todo.courses`** : Paramètres → Entités → la liste → ⚙️ → Identifiant d'entité.
7. Sur le serveur : `cd ~/home-automation && git pull && docker compose restart portail`.

Essai : « Ok Google, ajoute du café à ma liste de courses », puis regarder l'onglet 🧺 de la
tablette (10 à 30 s selon la synchronisation).

## 2. Raccourci « Dis Siri, ajoute … aux courses » (iPhone, ≈ 3 min)
Il faut l'appli **Home Assistant** sur l'iPhone. Hors de la maison, elle passe par le **VPN
Freebox** (`docs/ACCES-DISTANT.md`).

1. Appli **Raccourcis** → **+**.
2. Action **Demander une entrée** : type *Texte*, question `Quel article ?`.
3. Action **Home Assistant → Effectuer une action** (ou *Call service*, selon la version) :
   - action : `todo.add_item`
   - entité : `todo.courses`
   - données : `item` = la variable *Entrée fournie*
4. Renommer le raccourci **« Ajoute aux courses »**.

Usage : « Dis Siri, ajoute aux courses », Siri demande « Quel article ? », réponse « Du pain ».

## Sans Google Keep (liste locale, sans compte)
Paramètres → Appareils et services → Ajouter une intégration → **Liste de courses** (*Shopping
list*), puis renommer l'entité en `todo.courses`. La tablette et Siri marchent pareil. Seul
« Ok Google, ajoute… » n'arrivera pas dans la liste, puisqu'il écrit dans Keep. On pourra
basculer vers Keep plus tard en renommant l'autre entité.

## Et le drive ?
Les drives (Leclerc, Carrefour, Auchan…) n'ont pas d'API publique pour remplir un panier. Un
robot qui se connecterait à ton compte serait fragile, souvent contraire à leurs conditions, et
demanderait ton mot de passe : je ne le recommande pas, et jamais jusqu'au paiement.
En pratique, la liste est dans Google Keep, donc sur ton téléphone : ouvre-la à côté de l'appli
du drive au moment de commander. Dis-moi quel drive tu utilises, et je regarderai s'il propose un
import de liste officiel.
