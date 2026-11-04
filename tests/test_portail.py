"""Tests du portail tablette contre un faux Home Assistant (Python standard).

    python3 -m unittest discover -s tests -v
"""
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "portail"))
os.environ["HA_TOKEN"] = "jeton-test"

import server  # noqa: E402

APPELS = []
ETATS = [
    {"entity_id": "light.salon_principale", "state": "on", "attributes": {"friendly_name": "Salon"}},
    {"entity_id": "light.cuisine", "state": "off", "attributes": {}},
    {"entity_id": "light.non_declaree", "state": "on", "attributes": {}},
]


class FauxHA(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _ok(self, obj):
        brut = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(brut)

    def do_GET(self):
        if self.headers.get("Authorization") != "Bearer jeton-test":
            self.send_response(401)
            self.end_headers()
            return
        self._ok(ETATS)

    def do_POST(self):
        corps = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        APPELS.append((self.path, corps))
        self._ok([])


def demarrer(handler):
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


class TestPortail(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ha = demarrer(FauxHA)
        server.HA_URL = "http://127.0.0.1:%d" % cls.ha.server_port
        server.HA_TOKEN = "jeton-test"
        cls.portail = demarrer(server.Handler)
        cls.base = "http://127.0.0.1:%d" % cls.portail.server_port

    @classmethod
    def tearDownClass(cls):
        cls.ha.shutdown()
        cls.portail.shutdown()

    def setUp(self):
        APPELS.clear()
        server.CACHE.invalider()

    def get(self, chemin):
        with urllib.request.urlopen(self.base + chemin, timeout=5) as r:
            return r.status, r.read()

    def post(self, corps):
        req = urllib.request.Request(self.base + "/api/action", data=json.dumps(corps).encode(),
                                     method="POST", headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_page_et_fichiers_statiques(self):
        code, brut = self.get("/")
        self.assertEqual(code, 200)
        self.assertIn(b"/static/app.js", brut)
        self.assertEqual(self.get("/static/app.js")[0], 200)

    def test_pas_de_sortie_du_dossier_static(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.get("/static/../server.py")
        self.assertEqual(ctx.exception.code, 404)

    def test_etats_filtres_sur_maison_json(self):
        etats = json.loads(self.get("/api/etats")[1])
        self.assertEqual(etats["light.salon_principale"]["state"], "on")
        self.assertEqual(etats["light.chambre"]["state"], "absent")
        self.assertNotIn("light.non_declaree", etats)

    def test_basculer_une_lumiere(self):
        code, r = self.post({"entity_id": "light.cuisine", "action": "basculer"})
        self.assertEqual((code, r["ok"]), (200, True))
        self.assertEqual(APPELS, [("/api/services/light/toggle", {"entity_id": "light.cuisine"})])

    def test_scene(self):
        self.post({"entity_id": "scene.mode_nuit", "action": "activer"})
        self.assertEqual(APPELS[0][0], "/api/services/scene/turn_on")

    def test_refuse_entite_non_declaree(self):
        code, _ = self.post({"entity_id": "light.non_declaree", "action": "basculer"})
        self.assertEqual(code, 400)
        self.assertEqual(APPELS, [])

    def test_refuse_action_non_autorisee(self):
        code, _ = self.post({"entity_id": "light.cuisine", "action": "ouvrir"})
        self.assertEqual(code, 400)

    def test_tout_eteindre_un_niveau(self):
        code, r = self.post({"niveau": "rdc", "action": "tout_eteindre"})
        self.assertEqual((code, r["cibles"]), (200, 3))
        self.assertEqual(APPELS[0], ("/api/services/light/turn_off", {
            "entity_id": ["light.salon_principale", "light.salon_spots", "light.cuisine"]}))

    def test_niveau_sans_volet_n_appelle_rien(self):
        code, r = self.post({"niveau": "etage", "action": "tout_fermer"})
        self.assertEqual((code, r["cibles"]), (200, 0))
        self.assertEqual(APPELS, [])

    def test_ha_injoignable(self):
        ancien = server.HA_URL
        server.HA_URL = "http://127.0.0.1:1"
        try:
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                self.get("/api/etats")
            self.assertEqual(ctx.exception.code, 502)
        finally:
            server.HA_URL = ancien


class TestMaisonJson(unittest.TestCase):
    def test_entites_uniques_et_actions_connues(self):
        maison = server.charger_maison()
        ids = server.entites_de(maison)
        self.assertEqual(len(ids), len(set(ids)))
        for eid in ids:
            self.assertIn(eid.split(".")[0], server.ACTIONS, eid)


if __name__ == "__main__":
    unittest.main()
