"""Contrôle parental Freebox contre une fausse Freebox (Python standard).

    python3 -m unittest discover -s tests -v
"""
import hashlib
import hmac
import importlib.util
import json
import os
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "portail"))
os.environ.setdefault("HA_TOKEN", "jeton-test")

import freebox  # noqa: E402
import server  # noqa: E402

JETON_APP = "jeton-app-secret"
DEFI = "defi-123"
PROFILS = [{"id": 3, "name": "Alia"}, {"id": 4, "name": "Naïm"}, {"id": 5, "name": "Amel"}]


class EtatBox:
    def reset(self):
        self.session = None
        self.appels = []
        self.nc = {p["id"]: {"current_mode": "allowed", "override": False} for p in PROFILS}
        self.droits = True


BOX = EtatBox()


class FausseFreebox(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _rep(self, code, obj):
        brut = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(brut)

    def _corps(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n)) if n else None

    def _route(self, methode):
        chemin = self.path.replace("/api/v8/", "", 1)
        corps = self._corps()
        BOX.appels.append((methode, chemin, corps))
        if chemin == "login/" and methode == "GET":
            return self._rep(200, {"success": True, "result": {"challenge": DEFI}})
        if chemin == "login/session/" and methode == "POST":
            attendu = hmac.new(JETON_APP.encode(), DEFI.encode(), hashlib.sha1).hexdigest()
            if corps.get("password") != attendu or corps.get("app_id") != freebox.APP_ID:
                return self._rep(403, {"success": False, "error_code": "invalid_token"})
            BOX.session = "session-%d" % len(BOX.appels)
            return self._rep(200, {"success": True, "result": {"session_token": BOX.session}})
        if self.headers.get("X-Fbx-App-Auth") != BOX.session or BOX.session is None:
            return self._rep(403, {"success": False, "error_code": "auth_required"})
        if not BOX.droits:
            return self._rep(403, {"success": False, "error_code": "insufficient_rights"})
        if chemin == "profile/":
            return self._rep(200, {"success": True, "result": PROFILS})
        if chemin.startswith("network_control/"):
            pid = int(chemin.split("/")[1])
            nc = BOX.nc[pid]
            if methode == "PUT":
                nc.update(corps)
                if corps.get("override"):
                    nc["current_mode"] = corps["override_mode"]
                else:
                    nc["current_mode"], nc["override_until"] = "allowed", 0
            return self._rep(200, {"success": True, "result": nc})
        return self._rep(404, {"success": False, "error_code": "not_found"})

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PUT(self):
        self._route("PUT")


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), FausseFreebox)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.url = "http://127.0.0.1:%d" % cls.srv.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()

    def setUp(self):
        BOX.reset()
        self.fbx = freebox.Freebox(self.url, JETON_APP)


class TestFreebox(Base):
    def test_session_hmac_et_profils(self):
        self.assertEqual([p["name"] for p in self.fbx.profils()], ["Alia", "Naïm", "Amel"])
        self.assertTrue(any(c[1] == "login/session/" for c in BOX.appels))

    def test_couper_puis_retablir(self):
        avant = time.time()
        self.fbx.couper("Alia", 60)
        e = self.fbx.etat("Alia")
        self.assertTrue(e["coupe"])
        self.assertAlmostEqual(e["jusqua"], avant + 3600, delta=5)
        put = [c for c in BOX.appels if c[0] == "PUT"][0]
        self.assertEqual(put[1], "network_control/3")
        self.assertEqual(put[2]["override_mode"], "denied")
        self.fbx.retablir("Alia")
        self.assertFalse(self.fbx.etat("Alia")["coupe"])

    def test_nom_insensible_a_la_casse(self):
        self.fbx.couper("naïm", 30)
        self.assertEqual(BOX.nc[4]["current_mode"], "denied")
        self.assertEqual(BOX.nc[3]["current_mode"], "allowed")

    def test_session_expiree_rouverte_une_fois(self):
        self.fbx.profils()
        BOX.session = "autre"  # la Freebox a invalidé la session
        self.assertEqual(len(self.fbx.profils()), 3)

    def test_profil_inconnu(self):
        with self.assertRaises(freebox.ErreurFreebox) as e:
            self.fbx.couper("Inconnu", 30)
        self.assertIn("introuvable", str(e.exception))

    def test_droits_insuffisants_message_clair(self):
        BOX.droits = False
        with self.assertRaises(freebox.ErreurFreebox) as e:
            self.fbx.profils()
        self.assertIn("Contrôle parental", str(e.exception))

    def test_sans_jeton(self):
        with self.assertRaises(freebox.ErreurFreebox) as e:
            freebox.Freebox(self.url, "").profils()
        self.assertIn("freebox-autoriser", str(e.exception))

    def test_mauvais_jeton(self):
        with self.assertRaises(freebox.ErreurFreebox):
            freebox.Freebox(self.url, "faux").profils()


class TestPortail(Base):
    MAISON = {"habitants": [{"nom": "Karim"}, {"nom": "Alia", "freebox_profil": "Alia"}]}

    def test_seuls_les_profils_declares(self):
        self.assertEqual(server.profils_internet(self.MAISON), {"Alia": "Alia"})
        with self.assertRaises(ValueError):
            server.commander_internet(self.MAISON, {"habitant": "Karim", "action": "couper",
                                                    "minutes": 60}, self.fbx)
        self.assertFalse([c for c in BOX.appels if c[0] == "PUT"])

    def test_duree_bornee(self):
        for mauvaise in (0, 5, 9999, "60", None):
            with self.assertRaises(ValueError):
                server.commander_internet(self.MAISON, {"habitant": "Alia", "action": "couper",
                                                        "minutes": mauvaise}, self.fbx)
        e = server.commander_internet(self.MAISON, {"habitant": "Alia", "action": "couper",
                                                    "minutes": 60}, self.fbx)
        self.assertTrue(e["coupe"])

    def test_action_inconnue(self):
        with self.assertRaises(ValueError):
            server.commander_internet(self.MAISON, {"habitant": "Alia", "action": "supprimer"},
                                      self.fbx)

    def test_lecture_degradee_si_freebox_non_autorisee(self):
        res = server.lire_internet(self.MAISON, freebox.Freebox(self.url, ""))
        self.assertEqual(res[0]["habitant"], "Alia")
        self.assertFalse(res[0]["disponible"])

    def test_maison_json_enfants_seulement(self):
        maison = server.charger_maison()
        self.assertEqual(sorted(server.profils_internet(maison)), ["Alia", "Amel", "Naïm"])


class TestScriptAutorisation(unittest.TestCase):
    def test_jeton_ajoute_au_env_sans_ecraser(self):
        spec = importlib.util.spec_from_file_location(
            "autoriser", os.path.join(RACINE, "scripts", "freebox-autoriser.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory() as d:
            mod.ENV = os.path.join(d, ".env")
            with open(mod.ENV, "w") as f:
                f.write("HA_TOKEN=abc\nFREEBOX_APP_TOKEN=ancien\n")
            mod.ajouter_au_env("nouveau", "/api/v8/")
            with open(mod.ENV) as f:
                contenu = f.read()
            self.assertIn("HA_TOKEN=abc", contenu)
            self.assertIn("FREEBOX_APP_TOKEN=nouveau", contenu)
            self.assertNotIn("ancien", contenu)
            self.assertEqual(os.stat(mod.ENV).st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
