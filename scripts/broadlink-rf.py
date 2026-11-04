#!/usr/bin/env python3
"""Apprentissage et test des codes RF 433 MHz avec le Broadlink RM4 Pro (volets Came…).

À lancer sur le serveur (même réseau que le Broadlink), sans passer par l'appli Broadlink :

    python3 -m venv /tmp/bl && /tmp/bl/bin/pip install broadlink
    /tmp/bl/bin/python scripts/broadlink-rf.py info
    /tmp/bl/bin/python scripts/broadlink-rf.py apprendre salon_monter
    /tmp/bl/bin/python scripts/broadlink-rf.py envoyer salon_monter

Les codes appris sont rangés dans docs/codes-rf.json (base64, format accepté par
remote.send_command de Home Assistant avec le préfixe « b64: »).

Déroulé de l'apprentissage RF (2 temps, c'est là que l'appli Broadlink perd souvent les gens) :
  1. Balayage de fréquence : MAINTENIR le bouton de la télécommande appuyé, à 5-10 cm
     du Broadlink, jusqu'à ce que la fréquence soit trouvée (≈ 10 s).
  2. Relâcher, puis faire un APPUI COURT sur le même bouton : le code est capturé.

Si la fréquence est trouvée mais que l'envoi ne fait rien, la télécommande utilise
probablement un code tournant (rolling code) : elle n'est pas apprenable, voir docs/PRD.md §8.
"""
import base64
import json
import os
import sys
import time

import broadlink  # pip install broadlink

HOTE = os.environ.get("BROADLINK_HOST", "192.168.1.64")
FICHIER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "codes-rf.json")


def appareil():
    d = broadlink.hello(HOTE, timeout=5)
    d.timeout = 3  # chaque échange réseau abandonne au bout de 3 s
    d.auth()
    return d


def lire_codes():
    if os.path.exists(FICHIER):
        with open(FICHIER, encoding="utf-8") as f:
            return json.load(f)
    return {}


def info():
    d = appareil()
    print("Modèle : %s (%s) — verrouillé : %s" % (d.model, hex(d.devtype), d.is_locked))
    print("Codes enregistrés : %s" % (", ".join(lire_codes()) or "aucun"))


def attendre(fonction, duree, pas=1.0):
    """Appelle fonction() jusqu'à un résultat ou la fin du délai ; journalise chaque essai."""
    debut = time.time()
    while time.time() - debut < duree:
        try:
            r = fonction()
        except Exception as e:  # le Broadlink peut ne pas répondre ponctuellement
            print("   … %.0f s : %s" % (time.time() - debut, type(e).__name__), flush=True)
            r = None
        if r:
            return r
        time.sleep(pas)
    return None


def apprendre(nom):
    d = appareil()
    print("1/2 MAINTENEZ le bouton « %s » appuyé près du Broadlink…" % nom)
    d.sweep_frequency()

    def frequence():
        trouve, freq = d.check_frequency()
        print("   … balayage en cours" if not trouve else "", end="\r", flush=True)
        return freq if trouve else None

    freq = attendre(frequence, int(os.environ.get("DUREE_BALAYAGE", "30")))
    if not freq:
        d.cancel_sweep_frequency()
        sys.exit("❌ Aucune fréquence détectée (télécommande trop loin, pile faible, ou pas en 433 MHz).")
    print("   Fréquence trouvée : %.2f MHz. Relâchez le bouton." % freq)
    time.sleep(2)
    print("2/2 Faites maintenant un APPUI COURT sur le même bouton…")
    d.find_rf_packet(freq)

    def paquet():
        try:
            return d.check_data()
        except (broadlink.exceptions.ReadError, broadlink.exceptions.StorageError):
            return None  # rien de capturé pour l'instant

    code = attendre(paquet, 20)
    if not code:
        sys.exit("❌ Fréquence trouvée mais aucun code capturé : recommencez l'étape 2 plus près.")
    codes = lire_codes()
    codes[nom] = {"code": base64.b64encode(code).decode(), "frequence_mhz": round(freq, 2),
                  "appris_le": time.strftime("%Y-%m-%d %H:%M")}
    with open(FICHIER, "w", encoding="utf-8") as f:
        json.dump(codes, f, indent=2, ensure_ascii=False)
    print("✅ Code « %s » enregistré (%d octets). Testez-le : broadlink-rf.py envoyer %s" % (nom, len(code), nom))


def envoyer(nom):
    codes = lire_codes()
    if nom not in codes:
        sys.exit("Code inconnu. Codes disponibles : %s" % ", ".join(codes))
    appareil().send_data(base64.b64decode(codes[nom]["code"]))
    print("📡 Code « %s » envoyé. Le volet a-t-il bougé ?" % nom)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("info", "apprendre", "envoyer"):
        sys.exit(__doc__)
    if sys.argv[1] == "info":
        info()
    elif len(sys.argv) < 3:
        sys.exit("Indiquez un nom, ex. salon_monter")
    elif sys.argv[1] == "apprendre":
        apprendre(sys.argv[2])
    else:
        envoyer(sys.argv[2])
