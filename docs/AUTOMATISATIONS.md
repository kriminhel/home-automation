# Automatisations (J5)

Définies dans `homeassistant-config/automations.yaml`. Les réglages se trouvent dans Home
Assistant, sous **Paramètres → Appareils et services → Entrées**.

**Règle de la maison : rien ne s'ouvre automatiquement.** Les automatisations allument, éteignent
et préviennent. Ouvrir le garage ou le portail reste une action humaine, et les tests le vérifient.

| Automatisation | Ce qu'elle fait | Pour la mettre en pause |
|----------------|-----------------|------------------|
| Extérieur au coucher du soleil | Allume **Extérieur côté rue** et **Façade jardin** 10 min après le coucher du soleil, sauf après 23 h 30 | `Pause de l'éclairage extérieur automatique` |
| Extinction à 23 h 30 | Éteint ces mêmes lumières | même interrupteur |
| Garage resté ouvert | Prévient si le garage est ouvert depuis 30 min, et à 22 h s'il est encore ouvert. **Il ne le ferme pas.** | `Pause de l'alerte garage` |

Les interrupteurs « pause » sont **éteints par défaut**, ce qui veut dire que l'automatisme tourne.
Pour l'arrêter, on les allume.

## Annonces sur la Google Home Mini
Les alertes passent par `script.annonce_maison` :
- elles arrivent **toujours** en notification dans Home Assistant (la cloche) ;
- elles sont **aussi annoncées à voix haute** sur l'enceinte « Alia », une fois la synthèse vocale installée.

Pour installer la synthèse vocale, une fois :
1. Home Assistant → **Paramètres → Appareils et services → Ajouter une intégration** → **Google Translate text-to-speech** (gratuit, sans compte).
2. Langue **fr**, domaine **fr**. L'entité doit s'appeler `tts.google_translate_fr_fr` : la renommer si besoin.
3. Tester : **Outils de développement → Actions** → `script.annonce_maison`, message `Test de la maison`.

## Limites à connaître
- **Garage** : son état est **déduit** des ordres envoyés par Home Assistant. S'il a été ouvert à la
  télécommande, HA ne le sait pas. Le contact d’ouverture (ACHATS n°4, ≈ 5 €) rendra
  l'alerte fiable.
- **Heure d'extinction** : elle est fixée dans `automations.yaml` (`23:30:00`, à deux endroits).
  Me demander pour la changer.

## Idées pour la suite
- Volets : descente au coucher du soleil, une fois l'ESPSomfy-RTS installé.
- Lumières de l'entrée et de la terrasse à l'arrivée la nuit, déclenchées par le raccourci Siri ou la position de l'iPhone avec le VPN.
- Boutons « pause » sur la tablette.
