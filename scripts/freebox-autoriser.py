#!/usr/bin/env python3
"""Autorise le portail à piloter la Freebox (contrôle parental), une seule fois.

    python3 scripts/freebox-autoriser.py

1. Envoie une demande d'autorisation « Portail tablette » à la Freebox.
2. Attend (10 min max) qu'elle soit validée sur la Freebox / l'appli Freebox Connect.
3. Enregistre le jeton dans freebox_token.json (à la racine du dépôt, ignoré par git, chmod 600).

Ensuite, dans Freebox OS → Paramètres → Gestion des accès → Applications → « Portail tablette »,
cocher la permission « Contrôle parental » (et « Paramètres de la Freebox » pour lister les appareils).
"""
import json
import os
import sys
import time
import urllib.request

BOX = os.environ.get("FREEBOX_URL", "http://mafreebox.freebox.fr")
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHIER = os.path.join(RACINE, "freebox_token.json")
APP = {"app_id": "fr.maison.portail", "app_name": "Portail tablette", "app_version": "1.0",
       "device_name": "pcdomotique"}


def appel(chemin, corps=None):
    req = urllib.request.Request(BOX + chemin, data=json.dumps(corps).encode() if corps else None,
                                 headers={"Content-Type": "application/json"}, method="POST" if corps else "GET")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def main():
    if os.path.exists(FICHIER):
        sys.exit("Déjà autorisé (%s existe). Supprimez-le pour recommencer." % FICHIER)
    version = appel("/api_version")
    base = "/api/v%s/" % version["api_version"].split(".")[0]
    r = appel(base + "login/authorize/", APP)
    if not r.get("success"):
        sys.exit("Demande refusée : %s" % r)
    jeton, suivi = r["result"]["app_token"], r["result"]["track_id"]
    print("Demande envoyée à la Freebox : validez-la maintenant (10 min max)…", flush=True)
    for _ in range(120):
        statut = appel(base + "login/authorize/%d" % suivi)["result"]["status"]
        if statut == "granted":
            ancien = os.umask(0o077)
            with open(FICHIER, "w") as f:
                json.dump({"app_id": APP["app_id"], "app_token": jeton, "api_base": base}, f)
            os.umask(ancien)
            print("✅ Autorisé. Jeton enregistré dans %s" % FICHIER, flush=True)
            return
        if statut in ("denied", "timeout", "unknown"):
            sys.exit("❌ Autorisation %s." % statut)
        time.sleep(5)
    sys.exit("❌ Pas de validation dans les 10 minutes.")


if __name__ == "__main__":
    main()
