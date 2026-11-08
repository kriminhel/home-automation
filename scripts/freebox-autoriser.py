#!/usr/bin/env python3
"""Autorise le portail à piloter la Freebox (contrôle parental), une seule fois.

    python3 scripts/freebox-autoriser.py

1. Envoie une demande d'autorisation « Portail tablette » à la Freebox.
2. Attend (10 min max) qu'elle soit validée sur la Freebox / l'appli Freebox Connect.
3. Enregistre le jeton dans freebox_token.json (ignoré par git, chmod 600) et l'ajoute à .env
   (FREEBOX_APP_TOKEN, lu par le portail tablette).

Ensuite :
- dans Freebox OS → Paramètres → Gestion des accès → Applications → « Portail tablette »,
  cocher la permission « Contrôle parental » ;
- redémarrer le portail : docker compose up -d portail
Mode d'emploi complet : docs/INTERNET-ENFANTS.md
"""
import json
import os
import sys
import time
import urllib.request

BOX = os.environ.get("FREEBOX_URL", "http://mafreebox.freebox.fr")
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHIER = os.path.join(RACINE, "freebox_token.json")
ENV = os.path.join(RACINE, ".env")
APP = {"app_id": "fr.maison.portail", "app_name": "Portail tablette", "app_version": "1.0",
       "device_name": "pcdomotique"}


def appel(chemin, corps=None):
    req = urllib.request.Request(BOX + chemin, data=json.dumps(corps).encode() if corps else None,
                                 headers={"Content-Type": "application/json"}, method="POST" if corps else "GET")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def ajouter_au_env(jeton, base):
    """Ajoute (ou remplace) FREEBOX_APP_TOKEN / FREEBOX_API_BASE dans .env, sans toucher au reste."""
    lignes = []
    if os.path.exists(ENV):
        with open(ENV, encoding="utf-8") as f:
            lignes = [l for l in f.read().splitlines()
                      if not l.startswith(("FREEBOX_APP_TOKEN=", "FREEBOX_API_BASE="))]
    lignes += ["FREEBOX_APP_TOKEN=%s" % jeton, "FREEBOX_API_BASE=%s" % base]
    ancien = os.umask(0o077)
    with open(ENV, "w", encoding="utf-8") as f:
        f.write("\n".join(lignes) + "\n")
    os.umask(ancien)
    os.chmod(ENV, 0o600)


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
            ajouter_au_env(jeton, base)
            print("✅ Autorisé. Jeton enregistré dans %s et dans .env" % FICHIER, flush=True)
            print("➡️  Cocher « Contrôle parental » pour « Portail tablette » dans Freebox OS, puis :"
                  " docker compose up -d portail", flush=True)
            return
        if statut in ("denied", "timeout", "unknown"):
            sys.exit("❌ Autorisation %s." % statut)
        time.sleep(5)
    sys.exit("❌ Pas de validation dans les 10 minutes.")


if __name__ == "__main__":
    main()
