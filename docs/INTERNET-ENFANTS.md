# Couper internet d'un enfant depuis la tablette

Le portail utilise le **contrôle parental de la Freebox** : chaque enfant a un **profil** Freebox,
qui regroupe ses appareils (téléphone, console, PC…). Couper le profil coupe internet sur tous
ses appareils, pendant la durée choisie. Le Wi-Fi des parents et de la maison n'est pas touché.

Sur la tablette :
- **profil d'Alia, de Naïm ou d'Amel** : état (« autorisé », « coupé jusqu'à 21:43 »), puis boutons **Couper 30 min / 1 h / 2 h** ou **Rétablir** ;
- **bouton Wi-Fi d'une chambre** : coupe internet de l'enfant de la chambre pendant 1 h, ou le rétablit.

Chaque action demande une confirmation. Seuls les profils déclarés dans `portail/maison.json`
(`"freebox_profil"`) sont pilotables, et seules les durées 15, 30, 60, 120 et 180 min sont acceptées.

## Mise en place (une fois, à la maison, ≈ 15 min)

### 1. Créer les profils dans l'appli Freebox
Appli **Freebox Connect** → **Contrôle parental** → **Ajouter un profil**, pour chacun :
- `Alia`, `Naïm`, `Amel`. Les noms doivent être **identiques** à ceux de `maison.json`, mais les majuscules ne comptent pas.
- Rattacher à chaque profil les appareils de l'enfant (téléphone, tablette, console…).

### 2. Autoriser le portail à piloter la Freebox
Sur le serveur :
```bash
cd ~/home-automation && git pull
python3 scripts/freebox-autoriser.py
```
La Freebox demande de valider l'application **« Portail tablette »**, sur l'écran de la box ou dans
Freebox Connect. Valider. Le script range le jeton dans `.env`.

### 3. Donner la permission
`http://mafreebox.freebox.fr` → **Paramètres de la Freebox** → **Gestion des accès** →
onglet **Applications** → **Portail tablette** → cocher **Contrôle parental**.

### 4. Redémarrer le portail
```bash
docker compose up -d portail
```
Ouvrir le profil d'un enfant sur la tablette : la ligne « Internet autorisé » doit apparaître.

## Si ça ne marche pas

| Message sur la tablette | Solution |
|-------------------------|----------|
| « Freebox non autorisée : lancer scripts/freebox-autoriser.py » | Étapes 2 et 4 |
| « Droits insuffisants : cocher « Contrôle parental »… » | Étape 3, puis `docker compose restart portail` |
| « Profil « Alia » introuvable sur la Freebox » | Étape 1 : vérifier le nom exact du profil |
| « Freebox injoignable » | Le serveur doit être sur le réseau de la Freebox (`mafreebox.freebox.fr`) |

## Bon à savoir
- Le jeton (`FREEBOX_APP_TOKEN`) ne donne accès qu'aux permissions cochées à l'étape 3. On peut le
  révoquer à tout moment dans Gestion des accès → Applications.
- Une coupure se lève toute seule à la fin de la durée choisie, même si le serveur est éteint :
  c'est la Freebox qui s'en charge.
- Les plages horaires régulières (pas d'internet après 21 h en semaine…) se règlent directement dans
  Freebox Connect. La tablette sert aux coupures ponctuelles.
