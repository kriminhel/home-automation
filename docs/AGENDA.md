# Agenda sur la tablette : Google Agenda ou iCloud

L'accueil de la tablette affiche les événements des 15 prochains jours de **tous les agendas**
listés dans `portail/maison.json` → `"agendas"`. Chacun a sa couleur. Le bouton **Ajouter** écrit
dans l'agenda marqué `"ecriture": true` : aujourd'hui l'agenda local **Famille** de Home Assistant.

Le portail ne parle jamais directement à Google ou à Apple. C'est Home Assistant qui synchronise
l'agenda, et le portail lit l'entité `calendar.*` qu'il crée. Si un agenda tombe en panne, les
autres continuent de s'afficher.

## Lequel choisir ?
**Google Agenda si tu veux ajouter des rendez-vous à la voix avec la Google Home Mini** (décision
du 08/11). L'Assistant Google n'écrit que dans Google Agenda. iCloud reste plus simple à brancher,
mais sans ajout à la voix.

## Ajouter un rendez-vous à la voix (Google Home Mini)
Ça passe par l'Assistant Google lui-même, sans Home Assistant ni Matter. Réglages, une fois, dans
l'appli **Google Home** :
1. **Voice Match** : l'enceinte reconnaît ta voix (et celle de Samia si elle l'active).
   Appli Google Home → Paramètres → Assistant Google → **Voice Match**.
2. **Résultats personnels** activés pour l'enceinte « Alia » : sans eux, l'Assistant refuse de
   toucher à l'agenda. Appli Google Home → l'enceinte → ⚙️ → Reconnaissance et partage.
3. Essayer : « Ok Google, ajoute un rendez-vous chez le dentiste demain à 10 heures » ou
   « Ok Google, qu'est-ce que j'ai demain ? ».

L'Assistant écrit dans l'**agenda principal** de la personne qui parle : celui de son compte
Google. Pour que la tablette affiche tout, ajouter dans `maison.json` l'agenda principal de chaque
personne qui utilise la voix (option B ci-dessous). Un agenda « Famille » partagé reste visible
sur la tablette, mais la voix n'y écrit pas directement : on ne peut pas choisir l'agenda à l'oral.

## Option A — iCloud (Calendrier de l'iPhone) : la plus simple, sans voix
1. Sur `https://account.apple.com` (identifiant Apple) → **Connexion et sécurité** →
   **Mots de passe pour app** → en créer un nommé `Home Assistant`. Le noter.
2. Home Assistant → **Paramètres → Appareils et services → Ajouter une intégration** →
   **CalDAV** :
   - URL : `https://caldav.icloud.com`
   - Nom d'utilisateur : l'adresse e-mail de l'identifiant Apple
   - Mot de passe : le **mot de passe pour app** de l'étape 1, **pas** celui du compte
3. HA crée une entité par calendrier iCloud (`calendar.famille_2`, `calendar.travail`…). Les
   retrouver dans **Paramètres → Entités**, en filtrant sur `calendar.`.

## Option B — Google Agenda (nécessaire pour la voix)
Google exige une « application » déclarée dans Google Cloud. C'est gratuit, mais il y a plus d'étapes :
1. `https://console.cloud.google.com` → créer un projet `Maison` → **API et services** →
   activer **Google Calendar API**.
2. **Écran de consentement OAuth** : type *Externe*, s'ajouter comme *utilisateur test*.
3. **Identifiants → Créer → ID client OAuth** → type **Appareils TV et périphériques à entrée
   limitée**. Noter l'ID client et le secret.
4. Home Assistant → **Ajouter une intégration** → **Google Calendar** → saisir l'ID et le secret,
   puis valider le code sur `google.com/device` avec ton compte.
5. Une entité par agenda Google : `calendar.<nom>`.

Guide officiel : documentation Home Assistant, intégration « Google Calendar ».

## Afficher le nouvel agenda sur la tablette
Ajouter une ligne dans `portail/maison.json` → `"agendas"`, puis `docker compose restart portail` :
```json
"agendas": [
  { "entity_id": "calendar.famille", "nom": "Famille", "couleur": "#C9A45C", "ecriture": true },
  { "entity_id": "calendar.karim",   "nom": "Karim",   "couleur": "#5C9AC9" }
]
```
- `entity_id` : le nom exact de l'entité dans HA.
- **Un seul** agenda peut avoir `"ecriture": true`. Pour que « Ajouter » écrive dans Google ou
  iCloud plutôt que dans l'agenda local, déplacer `"ecriture": true` sur cet agenda. Google accepte
  l'ajout d'événements depuis Home Assistant ; pour iCloud (CalDAV), c'est **[à vérifier]** à l'essai.

Avec la voix, le plus cohérent est de mettre `"ecriture": true` sur **ton agenda Google**. Le bouton
« Ajouter » de la tablette et la Google Home Mini écrivent alors au même endroit, et l'agenda local
« Famille » peut être retiré.

Ou dis-moi simplement le nom des entités créées : je fais la modification.
