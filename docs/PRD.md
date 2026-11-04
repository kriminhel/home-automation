# PRD — Portail domotique tablette

> PRD du projet **et** prompt de référence à donner à Claude en début de session.
> Les points `⚠️` attendent une réponse de Karim avant de coder la partie concernée.
> État d'avancement : [`PROJECT_STATE.md`](../PROJECT_STATE.md) · Matériel à acheter : [`docs/ACHATS.md`](ACHATS.md) (à tenir à jour à chaque session).

## 1. Objectif

> « Depuis le vieil iPad du salon, n'importe qui dans la maison (adultes, enfants, invités)
> pilote lumières, volets, TV et garage **en 2 touchers maximum**, sans jamais se perdre. »

Indicateurs de réussite :
- **2 touchers max** pour toute action courante : l'onglet du niveau, puis la tuile.
- **Retour visuel < 1 s** après un toucher ; message clair si l'appareil ne répond pas.
- On sait toujours **à quel niveau on est** (couleur, onglet actif, titre).
- L'iPad tient **7 jours sans intervention** (pas de veille, reconnexion automatique).
- La maison fonctionne **sans l'iPad** : les interrupteurs et télécommandes restent utilisables.

## 2. Architecture (décidée)

```
[Équipements] ⇄ [Serveur pcdomotique : Home Assistant + portail (Docker)] ⇄ Wi-Fi ⇄ [iPad iOS 9 : Safari]
                                    port 8123 (admin, depuis un PC)      port 8124 (tablette)
```

- **L'iPad est sous iOS 9** : le frontend Home Assistant n'y fonctionne pas. On utilise donc
  le **plan B** : un **portail web léger** (`portail/`) hébergé sur le serveur, en JavaScript
  ES5, qui pilote Home Assistant par son API REST.
- **Rien n'est installé sur l'iPad** : un raccourci Safari sur l'écran d'accueil.
- Home Assistant reste le cerveau : intégrations, automatisations, scènes, codes Broadlink.
  Son interface (port 8123) sert à l'administration depuis un PC ou un téléphone récent.
- Le portail garde le jeton Home Assistant côté serveur et n'accepte qu'une **liste blanche
  d'actions** sur les équipements déclarés dans `portail/maison.json`.
- Tout tourne dans `~/home-automation` sur le serveur (`docker compose up -d`).

## 3. Inventaire des équipements

Scan réseau du 04/11/2026 : [`docs/scan-report.md`](scan-report.md).

| Catégorie | Équipement | Adresse | Intégration HA | Statut |
|-----------|-----------|---------|----------------|--------|
| 💡 Lumières | 21 relais nommés dans l'IPX800 (salon, salle à manger, cuisine, entrée, couloir, buanderie, garage, chambres parentale / Alia / Naïm / Amel, dressing, SDB parentale, SdB et WC enfants, salle de jeux, façade jardin ×4, côté rue) | IPX800 V3 (24 relais, 192.168.1.250) | `light.template` → script en file → `preset.htm?setN` | ✅ en service 04/11 · relais libres : 8, 23, 24 |
| 💡 Salle de bain étage | Pas de relais | — | voir §6 bis | 📋 solution à choisir |
| 🎛️ Télécommande universelle | Broadlink **RM4 Pro** (IR + RF 433 MHz) | 192.168.1.64 | `broadlink` → `remote.broadlink` | ✅ intégré 04/11, codes à apprendre |
| 🪟 Volets (×12) | Émetteurs muraux radio **Somfy RTS** (433,42 MHz, code tournant, bouton PROG) | ESPSomfy-RTS (à acheter) | intégration ESPSomfy-RTS | 📋 matériel à commander (§6) |
| 🚪 Garage | Porte Came, télécommande **TOP 4 boutons à code fixe** (433,9 MHz) | via Broadlink | `cover.template` → `remote.send_command` (codes dans secrets.yaml) | ✅ 04/11 : ouvrir / stop / fermer rejoués, confirmation sur la tablette |
| 🔌 Modules Loratap **SC500W** (×16) | Modules volet Wi-Fi **filaires** | — | `tuya` | ❌ inutilisables avec des moteurs radio ; à garder si les moteurs deviennent filaires |
| 📺 TV salon | **Xiaomi** MiTV (Google TV) | 192.168.1.45 | `androidtv_remote` → `media_player.tv_salon` | ✅ intégrée 04/11, sur la tablette |
| 📺 TV chambre de Naïm | **Philips** 43PUS7608/12 (filaire) | 192.168.1.144 | `philips_js` → `media_player.tv_naim` + `light.ambilight_naim` | ✅ intégrée 04/11, sur la tablette |
| 📺 Chambre parentale | **Xiaomi** TV Box (Android TV 12) | 192.168.1.59 | `androidtv_remote` → `media_player.boitier_chambre_parentale` | ✅ intégré 04/11 · ⚠️ en veille il coupe son Wi-Fi : allumage à distance via CEC ou IR Broadlink à prévoir |
| 📺 Chambre d'Amel | **Apple TV 4** (filaire) | 192.168.1.136 ? | `apple_tv` → `media_player.apple_tv_amel` | ✅ intégrée 04/11 |
| 📡 Box | **Freebox** v8 | 192.168.1.254 | `freebox` (débits, appels, Wi-Fi) | ✅ intégrée 04/11 (Wi-Fi et redémarrage volontairement absents de la tablette) |
| 🔌 Tuya / Smart Life | « Passerelle ZigBee » (Tuya + HomeKit « Gateway-type c ») + 1 autre appareil Tuya | 192.168.1.145 / .155 | `homekit_controller` (local) ou `tuya` (cloud) | ⚠️ cloud déconnecté ; appairage HomeKit possible avec le code à 8 chiffres de la passerelle |
| 🔊 Audio | Enceinte Spotify Connect | 192.168.1.157 | `spotify` | hors V1 |
| 🚧 Portail | ⚠️ marque / motorisation / télécommande ? (pilotable aujourd'hui depuis le visiophone EZVIZ) | ⚠️ | Broadlink si télécommande à code fixe, sinon intégration EZVIZ | 📋 à identifier |
| 🔔 Visiophone | **EZVIZ** (ouvre le portail) | ⚠️ | `ezviz` (compte EZVIZ) | 📋 à intégrer |
| 📷 Caméras | **EZVIZ** (intérieur) | ⚠️ | `ezviz` + flux RTSP local | 📋 à intégrer (pas de flux continu sur l'iPad) |
| 🖥️ NAS | Synology DS216se | 192.168.1.134 | `synology_dsm` | hors V1 |

Règle : on n'intègre **que ce qui est confirmé**. Aucune entité inventée.

## 4. Niveaux, navigation, interface

3 onglets fixes en haut de l'écran :

| Onglet | Couleur | Contenu |
|--------|---------|---------|
| 🏠 **Accueil** | `#3949AB` | Heure en grand, scènes, tout ce qui est allumé/ouvert (un toucher l'éteint) |
| 🛋 **RDC** | `#FB8C00` | Salon, cuisine, chambre parentale, chambres d'Alia, de Naïm et d'Amel (+ garage, extérieur) |
| 🛏 **Étage** | `#43A047` | Salle de jeux, salle de bain, chambre d'amis |

Pièces confirmées le 04/11. Une pièce n'apparaît sur la tablette que lorsqu'elle a au moins un équipement.
Noms et pièces des relais relevés dans l'interface de l'IPX800 le 04/11.

- Une **section par pièce**, toujours dans l'ordre lumières → volets → médias → autres.
- En tête de chaque niveau : **Tout éteindre**, **Ouvrir / Fermer les volets du niveau**.
- Tuiles ≥ 64 px, texte ≥ 18 px. Allumé = couleur vive (lumière ambre, volet bleu, TV violet),
  éteint = neutre. Volets : ▲ ■ ▼ directement sur la tuile. TV : marche/arrêt, volume, pause.
- Thème sombre automatique la nuit, retour à l'Accueil après 2 min d'inactivité.
- Règles techniques détaillées : skill `.claude/skills/portail-tablette/SKILL.md`.

## 5. iPad (iOS 9)

- Ouvrir `http://192.168.1.37:8124` dans Safari → Partager → **Sur l'écran d'accueil**
  (plein écran, sans barre Safari).
- Réglages → Luminosité → Verrouillage auto : **Jamais** ; iPad branché en permanence.
- Réglages → Général → Accessibilité → **Accès guidé** pour bloquer l'iPad sur le portail.
- ⚠️ Modèle exact (Réglages → Général → Informations) : utile si l'écran est petit (iPad mini).

## 6. Volets et garage (radio)

**Constat du 04/11** :
- Les volets sont commandés par des **émetteurs muraux Somfy RTS** : fréquence mesurée 433,40 MHz,
  bouton PROG. Le RTS est à **code tournant** : le Broadlink capte la fréquence mais ne peut pas
  rejouer les ordres. Les Loratap SC500W (modules filaires) ne peuvent pas commander des
  moteurs à récepteur radio intégré, d'où les échecs passés.
- Le garage utilise une **Came TOP à code fixe** : codes ouvrir / stop / fermer appris et rejoués
  avec succès par le Broadlink. Les codes sont dans `secrets.yaml` et `docs/codes-rf.json`
  (ignorés par git : **le dépôt est public**).

**Solution retenue pour les volets : ESPSomfy-RTS** (≈ 20 €, local, sans cloud)
1. Matériel : ESP32 DevKit (WROOM-32) + module **CC1101 433 MHz** avec antenne + 8 fils Dupont + alimentation USB.
2. Logiciel ESPSomfy-RTS installé depuis le navigateur, connexion au Wi-Fi, boîtier placé au centre de la maison.
3. Pour chaque volet : créer une télécommande virtuelle, appui 2-3 s sur **PROG** de l'émetteur mural
   (va-et-vient du volet), puis « appairer ». Les émetteurs muraux continuent de fonctionner.
4. Intégration dans HA, puis tuiles ▲ ■ ▼ par pièce, « ouvrir / fermer les volets » par niveau, automatisations soleil.

Alternatives : RFXtrx433E (≈ 110 €, natif HA, USB) · box Somfy TaHoma · émetteur RTS de rechange
câblé sur les relais libres de l'IPX800 (commande globale uniquement).

Le Broadlink reste utile pour le garage et l'infrarouge (TV, clim…).

## 6 bis. Salle de bain de l'étage (pas de relais)

Recommandé : **micromodule Shelly 1 Mini Gen3** (≈ 15 €) dans la boîte de l'interrupteur
existant (neutre nécessaire ; sinon Shelly 1L ou Dimmer sans neutre). Pilotage local en Wi-Fi,
intégration `shelly` native, l'interrupteur mural continue de marcher. Pose par un électricien
ou courant coupé au tableau.
Alternatives : tirer un câble jusqu'à un relais libre de l'IPX800 (8, 23, 24 : le plus robuste,
mais travaux) · module Zigbee (selon la passerelle Tuya ou une clé Zigbee sur le serveur) ·
ampoule connectée (sans travaux, mais l'interrupteur doit rester allumé).

## 7. Périmètre

**V1** : lumières IPX800 · volets (ESPSomfy-RTS) · TV Xiaomi, Philips, boîtier, Apple TV ·
Freebox · garage · portail · visiophone EZVIZ (image fixe à la sonnerie, ouverture du portail
avec confirmation) · portail tablette par niveau · scènes · iPad en kiosque.

**Hors V1** : accès depuis l'extérieur (Cloudflare, Nabu Casa), assistants vocaux, plan 3D,
flux vidéo continus des caméras sur l'iPad (trop lourd pour iOS 9), suivi d'énergie, NAS.

## 8. Critères d'acceptation

- [ ] L'inventaire §3 ne contient plus de ⚠️.
- [ ] Chaque équipement de l'inventaire a une entité HA qui marche **depuis l'iPad**.
- [ ] Accueil + un onglet par niveau, chacun à sa couleur ; toute action courante en 2 touchers.
- [ ] Les volets montent, descendent et s'arrêtent depuis la tablette.
- [ ] Chaque TV s'allume, s'éteint et change de volume depuis la tablette.
- [ ] `check_config` passe sans erreur ; `python3 -m unittest discover -s tests` passe.
- [ ] L'iPad tient 7 jours sans intervention.

## 9. Jalons

| Jalon | Contenu | Statut |
|-------|---------|--------|
| J0 | Inventaire réseau | ✅ 04/11 |
| J1 | iPad identifié (iOS 9) → portail léger | ✅ décidé 04/11 |
| J2 | Socle : dépôt unique, config nettoyée, HA relancé, portail lumières | 🔄 04/11 |
| J3 | Radio : garage ✅ (Broadlink) ; volets via ESPSomfy-RTS | 🔄 matériel à commander |
| J4 | TV Xiaomi / Philips, Freebox, Tuya, garage | 🔄 Broadlink, Freebox, TV salon et Philips faits le 04/11 |
| J5 | Scènes et automatisations réelles (volets au coucher du soleil…), test 7 jours | 📋 |

## 10. Questions ouvertes

- ⚠️ Pièce de chacun des 12 volets (pour la tablette).
- ⚠️ Rôle du 4e bouton de la télécommande garage.
- ⚠️ Portail : marque de la motorisation, type de télécommande (le 4e bouton de la TOP du garage ?).
- ⚠️ Modèles du visiophone et des caméras EZVIZ ; compte EZVIZ disponible pour HA.
- ⚠️ Salle de bain de l'étage : quelle solution (§6 bis) ?
- ⚠️ Commune de la maison (pour les heures de lever et de coucher du soleil ; HA est réglé par défaut sur Amsterdam).
- ⚠️ Faut-il un code PIN pour le garage ?
