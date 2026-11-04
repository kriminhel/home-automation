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
IMAGES_HA = {}  # entity_id -> octets renvoyés par le faux HA (défaut : petit JPEG)
ETATS = [
    {"entity_id": "light.salon", "state": "on", "attributes": {"friendly_name": "Salon"}},
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
        if self.path.startswith("/api/image_proxy/"):
            APPELS.append((self.path, None))
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.end_headers()
            self.wfile.write(IMAGES_HA.get(self.path.rsplit("/", 1)[1], b"\xff\xd8JPEG"))
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
        self.assertEqual(etats["light.salon"]["state"], "on")
        self.assertEqual(etats["light.chambre_alia"]["state"], "absent")
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
        lumieres = [e for e in server.entites_de(server.charger_maison(), "rdc") if e.startswith("light.")]
        self.assertIn("light.cuisine", lumieres)
        self.assertNotIn("light.salle_de_jeux", lumieres)  # autre niveau
        code, r = self.post({"niveau": "rdc", "action": "tout_eteindre"})
        self.assertEqual((code, r["cibles"]), (200, len(lumieres)))
        self.assertEqual(APPELS[0], ("/api/services/light/turn_off", {"entity_id": lumieres}))

    def test_niveau_sans_volet_n_appelle_rien(self):
        code, r = self.post({"niveau": "etage", "action": "tout_fermer"})
        self.assertEqual((code, r["cibles"]), (200, 0))
        self.assertEqual(APPELS, [])

    def test_garage_jamais_dans_une_action_groupee(self):
        maison = server.charger_maison()
        self.assertIn("cover.garage", server.entites_sensibles(maison))
        code, r = self.post({"niveau": "rdc", "action": "tout_ouvrir"})
        self.assertEqual((code, r["cibles"]), (200, 0))
        self.assertEqual(APPELS, [])

    def test_garage_pilotable_individuellement(self):
        code, _ = self.post({"entity_id": "cover.garage", "action": "ouvrir"})
        self.assertEqual(code, 200)
        self.assertEqual(APPELS[0], ("/api/services/cover/open_cover", {"entity_id": "cover.garage"}))

    def test_image_camera_declaree(self):
        eid = server.cameras_de(server.charger_maison())[0]
        server.IMAGES.images.clear()
        code, brut = self.get("/api/image/" + eid + "?t=1")
        self.assertEqual((code, brut), (200, b"\xff\xd8JPEG"))
        self.get("/api/image/" + eid)  # deuxième appel servi par le cache
        self.assertEqual(APPELS, [("/api/image_proxy/" + eid, None)])

    def _image_chiffree(self, code, clair=b"\xff\xd8" + b"photo" * 30):
        """Chiffre comme EZVIZ (AES-128-CBC) avec l'outil openssl, pour tester le portail."""
        import subprocess
        from hashlib import md5
        cle = code.encode().ljust(16, b"\0").hex()
        iv = (b"01234567" + b"\0" * 8).hex()
        ct = subprocess.run(["openssl", "enc", "-aes-128-cbc", "-K", cle, "-iv", iv],
                            input=clair, capture_output=True, check=True).stdout
        h = md5(md5(code.encode()).hexdigest().encode()).hexdigest().encode()
        return b"hikencodepicture" + h + ct, clair

    def test_image_chiffree_dechiffree_avec_le_code(self):
        eid = server.cameras_de(server.charger_maison())[0]
        IMAGES_HA[eid], clair = self._image_chiffree("ABCDEF")
        server.EZVIZ_CODES[eid] = "ABCDEF"
        server.IMAGES.images.clear()
        try:
            self.assertEqual(self.get("/api/image/" + eid)[1], clair)
            server.EZVIZ_CODES[eid] = "ZZZZZZ"  # mauvais code -> vignette, pas d'erreur
            server.IMAGES.images.clear()
            code, brut = self.get("/api/image/" + eid)
            self.assertEqual(code, 200)
            self.assertIn(b"incorrect", brut)
            del server.EZVIZ_CODES[eid]  # code inconnu
            server.IMAGES.images.clear()
            self.assertIn("inconnu".encode(), self.get("/api/image/" + eid)[1])
        finally:
            IMAGES_HA.clear()
            server.EZVIZ_CODES.pop(eid, None)
            server.IMAGES.images.clear()

    def test_image_refusee_si_non_declaree(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.get("/api/image/camera.non_declaree")
        self.assertEqual(ctx.exception.code, 404)
        self.assertEqual(APPELS, [])

    def test_camera_sans_action_possible(self):
        eid = server.cameras_de(server.charger_maison())[0]
        code, _ = self.post({"entity_id": eid, "action": "basculer"})
        self.assertEqual(code, 400)

    def test_etats_incluent_les_cameras(self):
        etats = json.loads(self.get("/api/etats")[1])
        for eid in server.cameras_de(server.charger_maison()):
            self.assertIn(eid, etats)

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
