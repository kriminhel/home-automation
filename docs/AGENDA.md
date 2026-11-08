# Agenda sur la tablette : Google Agenda ou iCloud

L'accueil de la tablette affiche les événements des 15 prochains jours de **tous les agendas**
listés dans `portail/maison.json` → `"agendas"`. Chacun a sa couleur. Le bouton **Ajouter** écrit
dans l'agenda marqué `"ecriture": true` : aujourd'hui l'agenda local **Famille** de Home Assistant.

Le portail ne parle jamais directement à Google ou à Apple. C'est Home Assistant qui synchronise
l'agenda, et le portail lit l'entité `calendar.*` qu'il crée. Si un agenda tombe en panne, les
autres continuent de s'afficher.

## Option A — iCloud (Calendrier de l'iPhone) : la plus simple
1. Sur `https://account.apple.com` (identifiant Apple) → **Connexion et sécurité** →
   **Mots de passe pour app** → en créer un nommé `Home Assistant`. Le noter.
2. Home Assistant → **Paramètres → Appareils et services → Ajouter une intégration** →
   **CalDAV** :
   - URL : `https://caldav.icloud.com`
   - Nom d'utilisateur : l'adresse e-mail de l'identifiant Apple
   - Mot de passe : le **mot de passe pour app** de l'étape 1, **pas** celui du compte
3. HA crée une entité par calendrier iCloud (`calendar.famille_2`, `calendar.travail`…). Les
   retrouver dans **Paramètres → Entités**, en filtrant sur `calendar.`.

## Option B — Google Agenda
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

Ou dis-moi simplement le nom des entités créées : je fais la modification.
