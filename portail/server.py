#!/usr/bin/env python3
"""Portail tablette : page web légère (compatible Safari iOS 9) + relais vers Home Assistant.

- Sert portail/static/ et la description de la maison (portail/maison.json).
- GET  /api/maison  -> niveaux, pièces, équipements (maison.json)
- GET  /api/etats   -> état des seules entités déclarées dans maison.json
- POST /api/action  -> {"entity_id": ..., "action": ...} ou {"niveau": ..., "action": ...}
- GET  /api/image/<entity_id> -> image JPEG d'une caméra déclarée dans maison.json ("cameras")
- GET  /api/agenda  -> événements des 15 prochains jours (agendas de maison.json)
- POST /api/agenda  -> {"titre", "date": "AAAA-MM-JJ", "heure": "HH:MM" facultative} dans l'agenda « ecriture »

Le jeton Home Assistant reste sur le serveur (variable HA_TOKEN) : l'iPad ne le voit
jamais, et seules les actions de la liste ACTIONS sur les entités déclarées passent.
Python standard uniquement.
"""
import json
import mimetypes
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import ezviz_image

ICI = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ICI, "static")
MAISON_PATH = os.environ.get("MAISON_JSON", os.path.join(ICI, "maison.json"))
HA_URL = os.environ.get("HA_URL", "http://127.0.0.1:8123").rstrip("/")
HA_TOKEN = os.environ.get("HA_TOKEN", "")
PORT = int(os.environ.get("PORTAIL_PORT", "8124"))
# Codes de chiffrement des images EZVIZ, par entity_id (JSON dans .env, jamais dans git)
try:
    EZVIZ_CODES = json.loads(os.environ.get("EZVIZ_CODES") or "{}")
except ValueError:
    print("⚠️  EZVIZ_CODES illisible (JSON attendu) : images chiffrées non affichées.", flush=True)
    EZVIZ_CODES = {}

# Actions autorisées par domaine : action du portail -> service Home Assistant
ACTIONS = {
    "light": {"basculer": "toggle", "allumer": "turn_on", "eteindre": "turn_off"},
    "switch": {"basculer": "toggle", "allumer": "turn_on", "eteindre": "turn_off"},
    "cover": {"ouvrir": "open_cover", "fermer": "close_cover", "stop": "stop_cover"},
    "scene": {"activer": "turn_on"},
    "script": {"activer": "turn_on"},
    "media_player": {
        "basculer": "toggle",
        "volume_plus": "volume_up",
        "volume_moins": "volume_down",
        "lecture_pause": "media_play_pause",
    },
}
# Actions groupées sur un niveau : action -> (domaine, service)
ACTIONS_NIVEAU = {
    "tout_eteindre": ("light", "turn_off"),
    "tout_ouvrir": ("cover", "open_cover"),
    "tout_fermer": ("cover", "close_cover"),
}
ATTRS_UTILES = ("friendly_name", "current_position", "volume_level", "source", "media_title",
                "unit_of_measurement", "next_rising", "next_setting", "temperature", "humidity")


def charger_maison():
    with open(MAISON_PATH, encoding="utf-8") as f:
        return json.load(f)


def entites_de(maison, niveau_id=None):
    """Liste des entity_id déclarés (tous, ou ceux d'un niveau)."""
    ids = [s["entity_id"] for s in maison.get("scenes", [])] if niveau_id is None else []
    for niveau in maison.get("niveaux", []):
        if niveau_id is not None and niveau["id"] != niveau_id:
            continue
        for piece in niveau.get("pieces", []):
            ids.extend(e["entity_id"] for e in piece.get("equipements", []))
    return ids


def cameras_de(maison):
    """entity_id des caméras déclarées (lecture d'image seulement, aucune action)."""
    return [c["entity_id"] for c in maison.get("cameras", [])]


def infos_de(maison):
    """entity_id affichés sur le récapitulatif (Freebox, soleil…) : lecture seule."""
    return list(maison.get("infos", {}).values())


def entites_sensibles(maison):
    """Équipements marqués "confirmer" (garage…) : exclus des actions groupées."""
    return {e["entity_id"] for n in maison.get("niveaux", []) for p in n.get("pieces", [])
            for e in p.get("equipements", []) if e.get("confirmer")}


class ErreurHA(Exception):
    pass


def appel_ha(methode, chemin, corps=None, timeout=6):
    if not HA_TOKEN:
        raise ErreurHA("HA_TOKEN manquant dans .env")
    data = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(
        HA_URL + chemin,
        data=data,
        method=methode,
        headers={"Authorization": "Bearer " + HA_TOKEN, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            brut = r.read()
            return json.loads(brut) if brut else None
    except urllib.error.HTTPError as e:
        raise ErreurHA("Home Assistant a répondu %s" % e.code)
    except (urllib.error.URLError, OSError) as e:
        raise ErreurHA("Home Assistant injoignable (%s)" % getattr(e, "reason", e))


def image_ha(eid, timeout=15):
    """Image d'une entité image.* ou camera.* via le proxy de Home Assistant."""
    if not HA_TOKEN:
        raise ErreurHA("HA_TOKEN manquant dans .env")
    proxy = "image_proxy" if eid.startswith("image.") else "camera_proxy"
    req = urllib.request.Request("%s/api/%s/%s" % (HA_URL, proxy, eid),
                                 headers={"Authorization": "Bearer " + HA_TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.headers.get("Content-Type", "image/jpeg"), r.read()
    except urllib.error.HTTPError as e:
        raise ErreurHA("Home Assistant a répondu %s" % e.code)
    except (urllib.error.URLError, OSError) as e:
        raise ErreurHA("Home Assistant injoignable (%s)" % getattr(e, "reason", e))


def vignette(texte):
    """Petite image SVG affichée à la place d'une image illisible."""
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288">'
           '<rect width="512" height="288" fill="#2A2E38"/>'
           '<text x="256" y="152" font-family="Helvetica,Arial" font-size="26" fill="#C9CDD6" '
           'text-anchor="middle">%s</text></svg>' % texte)
    return "image/svg+xml", svg.encode()


def image_lisible(eid):
    """Image de HA, déchiffrée si EZVIZ l'a chiffrée et que le code est connu."""
    type_mime, brut = image_ha(eid)
    if not ezviz_image.est_chiffree(brut):
        return type_mime, brut
    code = EZVIZ_CODES.get(eid)
    if not code:
        return vignette("🔒 Image chiffrée : code inconnu")
    try:
        return "image/jpeg", ezviz_image.dechiffrer(brut, code)
    except ezviz_image.CodeIncorrect:
        return vignette("🔒 Code de chiffrement incorrect")
    except ValueError:
        return vignette("Image illisible")


class CacheImages:
    """Une image par caméra au plus toutes les 10 s, quel que soit le nombre de tablettes."""

    def __init__(self, ttl=10.0):
        self.ttl, self.verrou, self.images = ttl, threading.Lock(), {}

    def lire(self, eid):
        with self.verrou:
            t, img = self.images.get(eid, (0.0, None))
            if img is None or time.time() - t > self.ttl:
                img = image_lisible(eid)
                self.images[eid] = (time.time(), img)
            return img


IMAGES = CacheImages()


def lire_agenda(maison, jours=15):
    debut = datetime.now(timezone.utc) - timedelta(hours=12)
    fin = debut + timedelta(days=jours)
    res = []
    for a in maison.get("agendas", []):
        chemin = "/api/calendars/%s?start=%s&end=%s" % (
            a["entity_id"], urllib.parse.quote(debut.isoformat()), urllib.parse.quote(fin.isoformat()))
        for e in appel_ha("GET", chemin) or []:
            d, f = e.get("start", {}), e.get("end", {})
            res.append({"titre": e.get("summary", ""), "debut": d.get("dateTime") or d.get("date"),
                        "fin": f.get("dateTime") or f.get("date"), "journee": "date" in d,
                        "agenda": a.get("nom", ""), "couleur": a.get("couleur", "#C9A45C")})
    res.sort(key=lambda e: e["debut"] or "")
    return res


def ajouter_evenement(maison, demande):
    agenda = next((a["entity_id"] for a in maison.get("agendas", []) if a.get("ecriture")), None)
    if not agenda:
        raise ValueError("aucun agenda modifiable dans maison.json")
    titre = str(demande.get("titre") or "").strip()[:120]
    jour = str(demande.get("date") or "")
    heure = str(demande.get("heure") or "")
    if not titre:
        raise ValueError("titre manquant")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", jour):
        raise ValueError("date invalide")
    d = date.fromisoformat(jour)
    corps = {"entity_id": agenda, "summary": titre}
    if heure:
        if not re.match(r"^\d{2}:\d{2}$", heure):
            raise ValueError("heure invalide")
        debut = datetime.fromisoformat("%s %s:00" % (jour, heure))
        corps["start_date_time"] = debut.strftime("%Y-%m-%d %H:%M:%S")
        corps["end_date_time"] = (debut + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
    else:
        corps["start_date"] = d.isoformat()
        corps["end_date"] = (d + timedelta(days=1)).isoformat()
    appel_ha("POST", "/api/services/calendar/create_event", corps)
    return corps


class CacheEtats:
    """Un seul appel /api/states par seconde, quel que soit le nombre de tablettes."""

    def __init__(self, ttl=1.0):
        self.ttl, self.verrou, self.t, self.valeur = ttl, threading.Lock(), 0.0, None

    def lire(self):
        with self.verrou:
            if self.valeur is None or time.time() - self.t > self.ttl:
                self.valeur = {e["entity_id"]: e for e in appel_ha("GET", "/api/states")}
                self.t = time.time()
            return self.valeur

    def invalider(self):
        with self.verrou:
            self.valeur = None


CACHE = CacheEtats()


def etats(maison):
    tous = CACHE.lire()
    res = {}
    for eid in entites_de(maison) + cameras_de(maison) + infos_de(maison):
        e = tous.get(eid)
        if e is None:
            res[eid] = {"state": "absent"}
            continue
        attrs = e.get("attributes", {})
        res[eid] = {"state": e["state"], **{k: attrs[k] for k in ATTRS_UTILES if k in attrs}}
    return res


def executer(maison, demande):
    action = demande.get("action")
    if "niveau" in demande:
        if action not in ACTIONS_NIVEAU:
            raise ValueError("action de niveau inconnue")
        if demande["niveau"] not in [n["id"] for n in maison.get("niveaux", [])]:
            raise ValueError("niveau inconnu")
        domaine, service = ACTIONS_NIVEAU[action]
        sensibles = entites_sensibles(maison)  # ex. garage : jamais dans une action groupée
        cibles = [e for e in entites_de(maison, demande["niveau"])
                  if e.split(".")[0] == domaine and e not in sensibles]
        if cibles:
            appel_ha("POST", "/api/services/%s/%s" % (domaine, service), {"entity_id": cibles})
        CACHE.invalider()
        return len(cibles)
    eid = demande.get("entity_id", "")
    if eid not in entites_de(maison):
        raise ValueError("équipement non déclaré dans maison.json")
    domaine = eid.split(".")[0]
    service = ACTIONS.get(domaine, {}).get(action)
    if not service:
        raise ValueError("action « %s » non autorisée pour %s" % (action, domaine))
    appel_ha("POST", "/api/services/%s/%s" % (domaine, service), {"entity_id": eid})
    CACHE.invalider()
    return 1


class Handler(BaseHTTPRequestHandler):
    server_version = "PortailTablette/1.0"

    def log_message(self, fmt, *args):
        if not self.path.startswith(("/api/etats", "/api/image/")):
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _json(self, code, obj):
        brut = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(brut)))
        self.end_headers()
        self.wfile.write(brut)

    def _fichier(self, nom):
        chemin = os.path.realpath(os.path.join(STATIC, nom))
        if not chemin.startswith(os.path.realpath(STATIC) + os.sep) or not os.path.isfile(chemin):
            return self._json(404, {"erreur": "introuvable"})
        with open(chemin, "rb") as f:
            brut = f.read()
        type_mime = mimetypes.guess_type(chemin)[0] or "application/octet-stream"
        if type_mime.startswith("text/") or type_mime.endswith("javascript"):
            type_mime += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", type_mime)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(brut)))
        self.end_headers()
        self.wfile.write(brut)

    def _image(self, eid):
        if eid not in cameras_de(charger_maison()):
            return self._json(404, {"erreur": "caméra non déclarée dans maison.json"})
        type_mime, brut = IMAGES.lire(eid)
        self.send_response(200)
        self.send_header("Content-Type", type_mime)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(brut)))
        self.end_headers()
        self.wfile.write(brut)

    def do_GET(self):
        chemin = self.path.split("?")[0]
        try:
            if chemin in ("/", "/index.html"):
                return self._fichier("index.html")
            if chemin.startswith("/static/"):
                return self._fichier(chemin[len("/static/"):])
            if chemin == "/api/maison":
                return self._json(200, charger_maison())
            if chemin == "/api/etats":
                return self._json(200, etats(charger_maison()))
            if chemin == "/api/agenda":
                return self._json(200, lire_agenda(charger_maison()))
            if chemin.startswith("/api/image/"):
                return self._image(chemin[len("/api/image/"):])
            return self._json(404, {"erreur": "introuvable"})
        except ErreurHA as e:
            return self._json(502, {"erreur": str(e)})

    def do_POST(self):
        if self.path not in ("/api/action", "/api/agenda"):
            return self._json(404, {"erreur": "introuvable"})
        try:
            longueur = min(int(self.headers.get("Content-Length") or 0), 10000)
            demande = json.loads(self.rfile.read(longueur) or b"{}")
            if self.path == "/api/agenda":
                ajouter_evenement(charger_maison(), demande)
                return self._json(200, {"ok": True})
            n = executer(charger_maison(), demande)
            return self._json(200, {"ok": True, "cibles": n})
        except (ValueError, json.JSONDecodeError) as e:
            return self._json(400, {"erreur": str(e)})
        except ErreurHA as e:
            return self._json(502, {"erreur": str(e)})


def main():
    if not HA_TOKEN:
        print("⚠️  HA_TOKEN absent : le portail s'affichera mais ne pourra rien piloter.", flush=True)
    serveur = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Portail tablette sur http://0.0.0.0:%d (HA : %s)" % (PORT, HA_URL), flush=True)
    serveur.serve_forever()


if __name__ == "__main__":
    main()
