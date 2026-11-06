#!/usr/bin/env python3
"""
Crée ou met à jour le pont Matter « Maison » à partir de matter/pont-google.json,
puis affiche son état et le code d'appairage à saisir dans l'appli Google Home.

À lancer sur le serveur (pcdomotique), une fois le conteneur matter-hub démarré :

    python3 scripts/matter-pont.py            # applique la config versionnée
    python3 scripts/matter-pont.py --etat     # affiche seulement l'état
    python3 scripts/matter-pont.py --essai    # montre ce qui serait envoyé, sans rien changer

Python standard uniquement. Identifiants lus dans .env (MATTER_ADMIN_USER / MATTER_ADMIN_PASSWORD).
"""
import argparse
import base64
import fnmatch
import json
import os
import sys
import urllib.error
import urllib.request

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(RACINE, "matter", "pont-google.json")

# Entités qui ne doivent JAMAIS être pilotables à la voix (sécurité : ouverture de la maison)
INTERDITES = ["cover.garage"]

# Adresse réseau du serveur et non 127.0.0.1 : la liste blanche du pont (192.168.1.0/24)
# refuserait un appel en boucle locale.
URL_PONT = "http://192.168.1.37:8482"


def lire_env(chemin=os.path.join(RACINE, ".env")):
    valeurs = {}
    try:
        with open(chemin, encoding="utf-8") as f:
            for ligne in f:
                ligne = ligne.strip()
                if ligne and not ligne.startswith("#") and "=" in ligne:
                    cle, val = ligne.split("=", 1)
                    valeurs[cle.strip()] = val.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    valeurs.update({k: v for k, v in os.environ.items() if k.startswith("MATTER_")})
    return valeurs


def _motif_couvre(motif, entite):
    """Joker `*` comme le pont (pattern)."""
    return fnmatch.fnmatchcase(entite, motif)


def verifier_config(config):
    """Renvoie la liste des problèmes (vide si la config est sûre et valide)."""
    problemes = []
    for cle in ("name", "port", "filter"):
        if cle not in config:
            problemes.append(f"clé obligatoire absente : {cle}")
    filtre = config.get("filter", {})
    for cle in ("include", "exclude"):
        if not isinstance(filtre.get(cle), list):
            problemes.append(f"filter.{cle} doit être une liste")
    if problemes:
        return problemes
    for regle in filtre["include"] + filtre["exclude"]:
        if set(regle) != {"type", "value"}:
            problemes.append(f"règle invalide (type/value attendus) : {regle}")
    if not 1024 < int(config["port"]) < 65536:
        problemes.append("port hors limites")
    # Le garage doit être explicitement exclu, et jamais inclus nommément
    for entite in INTERDITES:
        exclu = any(r["type"] == "pattern" and _motif_couvre(r["value"], entite)
                    for r in filtre["exclude"])
        if not exclu:
            problemes.append(f"{entite} doit être exclu (règle pattern dans filter.exclude)")
        for r in filtre["include"]:
            if r["type"] == "pattern" and _motif_couvre(r["value"], entite):
                problemes.append(f"{entite} ne doit pas être inclus ({r['value']})")
    return problemes


class Pont:
    def __init__(self, url, utilisateur, mot_de_passe):
        self.url = url.rstrip("/")
        jeton = base64.b64encode(f"{utilisateur}:{mot_de_passe}".encode()).decode()
        self.entetes = {"Authorization": f"Basic {jeton}", "Content-Type": "application/json"}

    def appel(self, methode, chemin, corps=None):
        donnees = json.dumps(corps).encode() if corps is not None else None
        req = urllib.request.Request(self.url + chemin, data=donnees, method=methode,
                                     headers=self.entetes)
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                brut = r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="ignore")[:300]
            raise SystemExit(f"❌ {methode} {chemin} → HTTP {e.code} {detail}")
        except urllib.error.URLError as e:
            raise SystemExit(f"❌ Pont injoignable sur {self.url} ({e.reason}). "
                             "Le conteneur tourne ? → docker compose up -d matter-hub")
        return json.loads(brut) if brut else None

    def ponts(self):
        return self.appel("GET", "/api/matter/bridges") or []

    def trouver(self, nom):
        return next((p for p in self.ponts() if p.get("name") == nom), None)

    def appliquer(self, config):
        existant = self.trouver(config["name"])
        if existant:
            corps = dict(config, id=existant["id"])
            self.appel("PUT", f"/api/matter/bridges/{existant['id']}", corps)
            return existant["id"], "mis à jour"
        cree = self.appel("POST", "/api/matter/bridges", config)
        return cree["id"], "créé"

    def rafraichir(self, id_pont):
        self.appel("POST", f"/api/matter/bridges/{id_pont}/actions/refresh")


def afficher_etat(pont, nom):
    p = pont.trouver(nom)
    if not p:
        print(f"Aucun pont « {nom} ». Lance : python3 scripts/matter-pont.py")
        return 1
    print(f"Pont « {p['name']} » — état : {p.get('status', '?')} — "
          f"{p.get('deviceCount', '?')} appareils exposés (port Matter {p.get('port')})")
    for echec in p.get("failedEntities") or []:
        print(f"  ⚠️  {echec.get('entityId')} : {echec.get('reason')}")
    comm = p.get("commissioning") or {}
    if comm.get("isCommissioned"):
        print(f"✅ Déjà appairé ({len(comm.get('fabrics') or [])} contrôleur(s)).")
    elif comm.get("manualPairingCode"):
        print("\n📱 Appli Google Home → + → Appareil → Nouvel appareil → Matter → "
              "« Configurer sans QR code », puis saisir (sans tirets) :")
        print(f"\n      {comm['manualPairingCode']}\n")
        print(f"   (QR code : {comm.get('qrPairingCode')} — aussi affiché sur http://<serveur>:8482)")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--etat", action="store_true", help="afficher l'état sans rien modifier")
    ap.add_argument("--essai", action="store_true", help="afficher la config sans l'envoyer")
    ap.add_argument("--url", default=None, help=f"URL du pont (défaut {URL_PONT})")
    ap.add_argument("--config", default=CONFIG)
    args = ap.parse_args(argv)

    with open(args.config, encoding="utf-8") as f:
        config = json.load(f)
    problemes = verifier_config(config)
    if problemes:
        print("❌ Config refusée :\n  - " + "\n  - ".join(problemes))
        return 2
    if args.essai:
        print(json.dumps(config, indent=2, ensure_ascii=False))
        return 0

    env = lire_env()
    if not env.get("MATTER_ADMIN_PASSWORD"):
        print("❌ MATTER_ADMIN_PASSWORD absent de .env (voir docs/MATTER.md)")
        return 2
    pont = Pont(args.url or env.get("MATTER_URL", URL_PONT),
                env.get("MATTER_ADMIN_USER", "admin"), env["MATTER_ADMIN_PASSWORD"])
    if not args.etat:
        id_pont, action = pont.appliquer(config)
        pont.rafraichir(id_pont)
        print(f"✅ Pont {action} ({id_pont}).")
    return afficher_etat(pont, config["name"])


if __name__ == "__main__":
    sys.exit(main())
