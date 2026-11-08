# Accès depuis l'extérieur : VPN WireGuard de la Freebox

Hors de la maison (4G, chez des amis), l'iPhone se connecte à la Freebox par un **tunnel chiffré**
et se comporte comme s'il était sur le Wi-Fi de la maison. Home Assistant, le portail tablette et
le NAS restent **invisibles depuis Internet** : seuls les appareils qui ont une clé VPN entrent.

- **Gratuit** : le serveur VPN est inclus dans la Freebox Pop (protocole WireGuard).
- Rien à changer dans Home Assistant, et aucun port de HA n'est ouvert.
- Sert au raccourci « Dis Siri, ouvre le portail » ([`PORTAIL-SIRI.md`](PORTAIL-SIRI.md)), à l'appli
  Home Assistant et à l'admin à distance.

```
iPhone (4G) ──WireGuard chiffré──▶ Freebox ──▶ réseau maison 192.168.1.x ──▶ Home Assistant 192.168.1.37:8123
```

## Mise en place (≈ 15 min, à faire à la maison)

Les libellés des menus peuvent varier selon la version de Freebox OS.

### 1. Activer le serveur VPN sur la Freebox
1. Ouvrir `http://mafreebox.freebox.fr` et se connecter.
2. **Paramètres de la Freebox** → passer en **mode avancé** → **Serveur VPN**.
3. Onglet **WireGuard** → **Activer** → noter le port proposé → **Appliquer**.

### 2. Créer un accès par téléphone
1. Dans **Serveur VPN** → **Utilisateurs** → **Ajouter** :
   - identifiant `iphone-karim`
   - type **WireGuard**
2. Faire de même plus tard pour Samia (`iphone-samia`). **Un accès par appareil** : on peut en
   révoquer un sans toucher aux autres.
3. Cliquer sur l'icône de téléchargement de l'utilisateur pour afficher son **QR code**.

### 3. Installer le tunnel sur l'iPhone
1. App Store → **WireGuard** (gratuite, éditeur WireGuard Development Team).
2. **+** → **Créer à partir d'un code QR** → scanner le QR code → nommer le tunnel `Maison`.
3. Ouvrir le tunnel `Maison` → **Modifier** → **Activation à la demande** :
   - cocher **Données cellulaires**
   - cocher **Wi-Fi** → **Sauf ces SSID** → ajouter le Wi-Fi de la maison

   Le VPN s'allume alors tout seul dès qu'on quitte le Wi-Fi de la maison, et s'éteint au retour.

### 4. Régler l'appli Home Assistant de l'iPhone
**Réglages de l'appli** → **Serveurs** → le serveur de la maison :
- **URL interne** : `http://192.168.1.37:8123`
- **URL externe** : `http://192.168.1.37:8123`. C'est la même adresse : à l'extérieur, elle passe par le VPN.

## Vérifier que ça marche
1. Couper le Wi-Fi de l'iPhone pour passer en 4G.
2. Dans l'appli WireGuard, le tunnel `Maison` doit passer **actif** tout seul en quelques secondes.
3. Safari → `http://192.168.1.37:8124` : le portail tablette doit s'afficher.
4. L'appli Home Assistant doit afficher les lumières à jour.

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Le tunnel reste « en cours de connexion » | **IPv4 partagée** chez Free : le port du VPN n'est pas joignable | Espace abonné Free → **Ma Freebox** → **Demander une adresse IP fixe V4 full-stack** (gratuit), redémarrer la Freebox, régénérer le QR code |
| Connecté, mais `192.168.1.37` ne répond pas | Le tunnel n'envoie pas le trafic du réseau local | Dans le tunnel, vérifier que **IP autorisées** contient `192.168.1.0/24` (ou `0.0.0.0/0`) |
| Le VPN ne s'allume pas tout seul | Activation à la demande non cochée | Étape 3.3 |
| Batterie qui baisse vite | Rare avec WireGuard | Garder l'activation à la demande, plutôt qu'un VPN allumé en permanence |

## Sécurité
- Le QR code **contient la clé** : ne pas l'envoyer par message ni le photographier. Le scanner directement depuis l'écran de Freebox OS.
- Téléphone perdu : Freebox OS → Serveur VPN → Utilisateurs → **supprimer** l'utilisateur concerné.
- Home Assistant reste en HTTP sans exposition directe : le chiffrement est assuré par le tunnel.
