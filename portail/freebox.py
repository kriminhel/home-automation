"""Contrôle parental de la Freebox : couper ou rétablir internet pour un profil (enfant).

API Freebox OS v8 (Python standard uniquement) :
- session : GET login/ (challenge) → POST login/session/ {app_id, password = HMAC-SHA1(app_token, challenge)}
  → en-tête X-Fbx-App-Auth ;
- GET profile/ → profils (id, name) ;
- GET / PUT network_control/{id} → {current_mode, override, override_mode, override_until}.

L'application « Portail tablette » doit avoir la permission « Contrôle parental » dans
Freebox OS (Paramètres → Gestion des accès → Applications). Jeton : FREEBOX_APP_TOKEN (.env).
"""
import hashlib
import hmac
import json
import threading
import time
import urllib.error
import urllib.request

APP_ID = "fr.maison.portail"


class ErreurFreebox(Exception):
    pass


class Freebox:
    def __init__(self, url, app_token, base="/api/v8/", app_id=APP_ID, timeout=6):
        self.url = url.rstrip("/")
        self.base = "/" + base.strip("/") + "/"
        self.app_token, self.app_id, self.timeout = app_token, app_id, timeout
        self.session = None
        self.verrou = threading.Lock()

    # --- bas niveau -------------------------------------------------------------
    def _http(self, methode, chemin, corps=None, session=True):
        entetes = {"Content-Type": "application/json"}
        if session and self.session:
            entetes["X-Fbx-App-Auth"] = self.session
        req = urllib.request.Request(self.url + self.base + chemin, method=methode, headers=entetes,
                                     data=json.dumps(corps).encode() if corps is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                return json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            try:
                return json.loads(e.read() or b"{}")  # la Freebox répond 403 avec un JSON
            except ValueError:
                raise ErreurFreebox("Freebox : HTTP %s" % e.code)
        except (urllib.error.URLError, OSError) as e:
            raise ErreurFreebox("Freebox injoignable (%s)" % getattr(e, "reason", e))

    def _ouvrir_session(self):
        r = self._http("GET", "login/", session=False)
        defi = (r.get("result") or {}).get("challenge")
        if not defi:
            raise ErreurFreebox("Freebox : pas de challenge (%s)" % r.get("msg", r))
        mdp = hmac.new(self.app_token.encode(), defi.encode(), hashlib.sha1).hexdigest()
        r = self._http("POST", "login/session/", {"app_id": self.app_id, "password": mdp}, session=False)
        if not r.get("success"):
            raise ErreurFreebox("Freebox : session refusée (%s)" % r.get("msg", r.get("error_code")))
        self.session = (r.get("result") or {}).get("session_token")

    def appel(self, methode, chemin, corps=None):
        """Appel authentifié ; rouvre la session une fois si elle a expiré."""
        if not self.app_token:
            raise ErreurFreebox("Freebox non autorisée : lancer scripts/freebox-autoriser.py")
        with self.verrou:
            for essai in (1, 2):
                if not self.session:
                    self._ouvrir_session()
                r = self._http(methode, chemin, corps)
                if r.get("success"):
                    return r.get("result")
                if r.get("error_code") in ("auth_required", "invalid_session") and essai == 1:
                    self.session = None
                    continue
                if r.get("error_code") == "insufficient_rights":
                    raise ErreurFreebox("Droits insuffisants : cocher « Contrôle parental » pour "
                                        "« Portail tablette » dans Freebox OS")
                raise ErreurFreebox("Freebox : %s" % (r.get("msg") or r.get("error_code") or r))

    # --- contrôle parental ---------------------------------------------------------
    def profils(self):
        return self.appel("GET", "profile/") or []

    def id_profil(self, nom):
        for p in self.profils():
            if str(p.get("name", "")).strip().lower() == nom.strip().lower():
                return p["id"]
        raise ErreurFreebox("Profil « %s » introuvable sur la Freebox (le créer dans Freebox "
                            "Connect → Contrôle parental, avec ce nom exact)" % nom)

    def etat(self, nom):
        nc = self.appel("GET", "network_control/%d" % self.id_profil(nom)) or {}
        coupe = nc.get("current_mode") == "denied"
        jusqua = nc.get("override_until") if nc.get("override") and coupe else None
        return {"coupe": coupe, "jusqua": jusqua or None, "mode": nc.get("current_mode")}

    def couper(self, nom, minutes):
        pid = self.id_profil(nom)
        return self.appel("PUT", "network_control/%d" % pid, {
            "override": True, "override_mode": "denied",
            "override_until": int(time.time()) + int(minutes) * 60})

    def retablir(self, nom):
        return self.appel("PUT", "network_control/%d" % self.id_profil(nom), {"override": False})
