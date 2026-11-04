# Liste d'achats — domotique

> Liste **cumulative** : on ajoute au fil du projet, Karim achète tout quand elle est complète.
> À mettre à jour à chaque session (nouvelle ligne, statut, prix vérifié).
> Prix relevés le 04/11/2026, à revérifier au moment de commander.

**Statuts** : ✅ validé (prêt à commander) · ⚠️ à confirmer avant achat · ❓ besoin pas encore établi

## À acheter

| # | Article | Pour quoi | Qté | Prix unitaire | Où | Statut |
|---|---------|-----------|-----|---------------|----|--------|
| 1 | **Module ESPSomfy-RTS tout fait** (ESP32 + CC1101 433 MHz, boîtier) | Piloter les **12 volets Somfy RTS** depuis HA | 1 | 40 € | [Domotech / Lectronz](https://lectronz.com/products/shutter-remote-rts) (France) · alternative [Switch-is](https://www.switch-is.nl/product/espsomfy-rts) 34,50 € + antenne 12,95 € | ✅ |
| 2 | Câble USB-C + chargeur USB 5 V | Alimenter le module ESPSomfy en permanence | 1 | ~10 € | n'importe où (ou vieux chargeur de téléphone) | ✅ (inutile si déjà à la maison) |
| 3 | **Shelly 1 Mini Gen3** | Lumière de la **salle de bain de l'étage** (pas de relais IPX800) | 1 | 13,99 € | [Shelly](https://www.shelly.com/fr/products/shop/shelly-1-mini-gen3) · [Domadoo](https://www.domadoo.fr/en/access-control-system/6984-shelly-wi-fi-smart-relay-switch-dry-contacts-shelly-1-mini-gen3-3800235261576.html) | ⚠️ vérifier la présence du **neutre** (fil bleu) dans la boîte de l'interrupteur ; sinon version sans neutre |
| 4 | Contact d'ouverture filaire (capteur magnétique NF/NO) | Connaître l'**état réel de la porte de garage** (entrée libre de l'IPX800) + alerte « garage ouvert la nuit » | 1 | ~5 € | à préciser | ❓ optionnel |
| 5 | **Shelly 1 Mini Gen3** (contact sec) dans le coffret du moteur **Nice**, sur l'entrée « pas à pas » | Piloter le **portail** depuis la tablette, sans dépendre de la radio à code tournant | 1 | 13,99 € | [Shelly](https://www.shelly.com/fr/products/shop/shelly-1-mini-gen3) | ✅ l'intégration EZVIZ n'expose pas l'ouverture du portail (HP7 testé le 04/11) — ⚠️ vérifier le modèle de la carte Nice (entrée « pas à pas » / SbS) |

**Total validé à ce jour : ~65-80 €** (lignes 1, 2, 3 et 5).

## Déjà possédé (pas à racheter)

| Matériel | Utilisation |
|----------|-------------|
| IPX800 V3 (24 relais, 21 câblés) | Lumières |
| Broadlink RM4 Pro | Porte de garage (codes Came TOP), infrarouge |
| TV Xiaomi, boîtier Xiaomi, TV Philips, Apple TV | Médias (intégrés) |
| Freebox | Box (intégrée) |
| 16 × Loratap SC500W | ❌ inutilisables avec les moteurs radio actuels — à garder si les moteurs deviennent filaires, ou à revendre |
| Passerelle Zigbee Tuya | En attente (code HomeKit / reconnexion Smart Life) |
| Caméras EZVIZ (C6N ×2, H8c) | Intégrées (cloud) ; flux local à débloquer (codes) |
| Carte microSD de rechange | Pour la caméra garage H8c (carte actuelle en erreur) |
| Visiophone EZVIZ HP7 | Pas d'intégration locale (ni image ni ouverture portail) |
| Télécommandes Nice du portail (code tournant probable) | Non rejouables par le Broadlink |
| 4e bouton de la Came TOP | Libre (non programmé) |
