# Rapport de scan réseau

- **Date** : 2026-11-04 12:03
- **Réseau** : `192.168.1.0/24`
- **Appareils détectés** : 10

| Catégorie | IP | MAC | Nom | Indices | Intégration HA suggérée | Niveau / pièce |
|---|---|---|---|---|---|---|
| ❓ Autre | 192.168.1.37 |  | pcdomotique | `TCP 8080` Service web alternatif | — | ⚠️ |
| ❓ Autre | 192.168.1.67 | 44:fe:3b:1e:6b:2e | — | `SSDP` Unspecified, UPnP/1.0, Unspecified | — | ⚠️ |
| 🎛️ Broadlink | 192.168.1.64 | e8:70:72:3f:41:3c | Broad | `Broadlink` Broadlink RM4 Pro (IR + RF 433) (MAC e8:70:72:3f:41:3c) | broadlink | ⚠️ |
| 📡 Box / décodeur | 192.168.1.254 | 20:66:cf:5c:5c:c3 | Freebox Server, _gateway | `SSDP` Linux/2.6 UPnP/1.0 fbxigdd/1.1<br>`SSDP` Linux/2.6 UPnP/1.0 fbxupnpav/1.0<br>`UPnP` Freebox SAS Freebox Media Server<br>`UPnP` Freebox Freebox Server | — | ⚠️ |
| 📺 TV | 192.168.1.45 | 04:7a:0b:6d:09:2c | Salon | `SSDP` Linux/4.19.79+, UPnP/1.0, Chromecast/1.6.18<br>`mDNS` Google Cast<br>`mDNS` Android TV / Google TV<br>`UPnP` Xiaomi MiTV-MOOQ0<br>`TCP 6466` Android TV / Google TV (télécommande)<br>`TCP 9000` Service web / Freebox<br>`TCP 8009` Google Cast<br>`TCP 8008` Google Cast (Chromecast, Nest, TV) | androidtv_remote, cast | ⚠️ |
| 📺 TV | 192.168.1.59 | f8:e4:3b:13:5e:18 | Boîtier TV Xiaomi | `mDNS` Google Cast<br>`SSDP` Linux/5.4.233-android12-9-ge1c3601e948a-ab773, UPnP/1.0, Chromecast/1.6.18<br>`UPnP` Xiaomi MiTV-AFKR0<br>`TCP 8009` Google Cast<br>`TCP 8008` Google Cast (Chromecast, Nest, TV)<br>`TCP 6466` Android TV / Google TV (télécommande)<br>`TCP 9000` Service web / Freebox | androidtv_remote, cast | ⚠️ |
| 📺 TV | 192.168.1.106 | 96:c8:21:86:a6:39 | — | `mDNS` AirPlay<br>`mDNS` AirPlay audio<br>`mDNS` Apple TV / appareil Apple | apple_tv | ⚠️ |
| 📺 TV | 192.168.1.136 | 50:32:37:99:08:8d | — | `mDNS` AirPlay<br>`mDNS` AirPlay audio<br>`mDNS` Apple TV / appareil Apple | apple_tv | ⚠️ |
| 🔌 Tuya (volets, garage, prises…) | 192.168.1.155 | fc:3c:d7:84:ce:df | — | `Tuya` Appareil Tuya / Smart Life (annonce UDP 6667) | tuya / localtuya | ⚠️ |
| 🖨️ Imprimante / NAS | 192.168.1.134 | 00:11:32:4e:c5:65 | SynKarim, SynKarim (DS216se) | `SSDP` Synology/DSM/192.168.1.134<br>`SSDP` Linux/3.2.40, UPnP/1.0, Portable SDK for UPnP devices/1.6.21<br>`mDNS` Partage iTunes / Apple<br>`mDNS` Partage fichiers / NAS<br>`UPnP` Synology DS216se<br>`UPnP` Synology Inc DS216se | — | ⚠️ |

> Compléter la colonne *Niveau / pièce*, puis reporter dans `docs/PRD.md` §4.
> Les appareils uniquement infrarouges (vieille TV, clim, ampli) et les volets RF
> n'apparaissent PAS sur le réseau : les ajouter à la main (pilotage via Broadlink).
