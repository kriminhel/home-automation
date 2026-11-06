"""Tests du pont Matter (config versionnée + script contre un faux pont, Python standard).

    python3 -m unittest discover -s tests -v
"""
import base64
import importlib.util
import io
import json
import os
import re
import threading
import unittest
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "matter_pont", os.path.join(RACINE, "scripts", "matter-pont.py"))
mp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mp)

with open(os.path.join(RACINE, "matter", "pont-google.json"), encoding="utf-8") as f:
    CONFIG = json.load(f)

AUTH = "Basic " + base64.b64encode(b"admin:secret").decode()
PONTS = {}
APPELS = []


class FauxPont(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _rep(self, code, obj=None):
        brut = json.dumps(obj).encode() if obj is not None else b""
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(brut)

    def _corps(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n)) if n else None

    def _route(self, methode):
        if self.headers.get("Authorization") != AUTH:
            return self._rep(401, {"error": "auth"})
        corps = self._corps()
        APPELS.append((methode, self.path, corps))
        if self.path == "/api/matter/bridges" and methode == "GET":
            return self._rep(200, list(PONTS.values()))
        if self.path == "/api/matter/bridges" and methode == "POST":
            pont = dict(corps, id="pont1", status="running", deviceCount=22,
                        commissioning={"isCommissioned": False,
                                       "manualPairingCode": "3497-011-2332",
                                       "qrPairingCode": "MT:Y.K90"})
            PONTS["pont1"] = pont
            return self._rep(200, pont)
        m = re.match(r"^/api/matter/bridges/(\w+)(/actions/refresh)?$", self.path)
        if m and m.group(1) in PONTS:
            if m.group(2):
                return self._rep(204)
            if methode == "PUT":
                if corps.get("id") != m.group(1):
                    return self._rep(400, {"error": "id"})
                PONTS[m.group(1)].update(corps)
                return self._rep(200, PONTS[m.group(1)])
        return self._rep(404, {"error": "absent"})

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PUT(self):
        self._route("PUT")


class TestConfig(unittest.TestCase):
    def test_config_versionnee_valide(self):
        self.assertEqual(mp.verifier_config(CONFIG), [])

    def test_lumieres_seules_incluses(self):
        self.assertEqual(CONFIG["filter"]["include"], [{"type": "domain", "value": "light"}])

    def test_nom_du_pont_appaire(self):
        # Le script retrouve le pont par son nom : un autre nom en créerait un second
        self.assertEqual(CONFIG["name"], "Maison")

    def test_ambilight_exclu(self):
        self.assertIn({"type": "pattern", "value": "light.ambilight_naim"},
                      CONFIG["filter"]["exclude"])

    def test_url_compatible_liste_blanche(self):
        self.assertTrue(mp.URL_PONT.startswith("http://192.168.1."))

    def test_garage_toujours_exclu(self):
        exclus = CONFIG["filter"]["exclude"]
        self.assertIn({"type": "pattern", "value": "cover.garage*"}, exclus)
        self.assertIn({"type": "device_class", "value": "garage"}, exclus)

    def test_refuse_config_sans_exclusion_garage(self):
        mauvaise = json.loads(json.dumps(CONFIG))
        mauvaise["filter"]["exclude"] = []
        self.assertTrue(any("cover.garage" in p for p in mp.verifier_config(mauvaise)))

    def test_refuse_garage_inclus_nommement(self):
        mauvaise = json.loads(json.dumps(CONFIG))
        mauvaise["filter"]["include"].append({"type": "pattern", "value": "cover.*"})
        self.assertTrue(any("ne doit pas être inclus" in p for p in mp.verifier_config(mauvaise)))

    def test_refuse_regle_mal_formee(self):
        mauvaise = json.loads(json.dumps(CONFIG))
        mauvaise["filter"]["include"].append({"type": "domain"})
        self.assertTrue(mp.verifier_config(mauvaise))

    def test_port_alexa_google_5540(self):
        self.assertEqual(CONFIG["port"], 5540)

    def test_service_docker_compose(self):
        with open(os.path.join(RACINE, "docker-compose.yml"), encoding="utf-8") as f:
            compose = f.read()
        bloc = compose.split("matter-hub:", 1)[1]
        self.assertIn("network_mode: host", bloc)
        self.assertRegex(bloc, r"home-assistant-matter-hub:\d+\.\d+\.\d+")  # version figée
        self.assertIn("HAMH_HTTP_AUTH_PASSWORD", bloc)
        # Réglages du pont qui fonctionne : ne pas perdre l'appairage ni le démarrage auto
        self.assertIn("matter-hub-data:/data", bloc)
        self.assertIn("${HA_TOKEN}", bloc)
        self.assertIn("HAMH_MDNS_NETWORK_INTERFACE=wlp2s0", bloc)
        self.assertNotIn("profiles:", bloc)
        self.assertNotIn(":?", compose)
        self.assertNotIn("latest", bloc.split("image:", 1)[1].split("\n", 1)[0])


class TestScript(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.serveur = ThreadingHTTPServer(("127.0.0.1", 0), FauxPont)
        threading.Thread(target=cls.serveur.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.serveur.server_address[1]}"
        os.environ["MATTER_ADMIN_USER"] = "admin"
        os.environ["MATTER_ADMIN_PASSWORD"] = "secret"

    @classmethod
    def tearDownClass(cls):
        cls.serveur.shutdown()

    def setUp(self):
        PONTS.clear()
        APPELS.clear()

    def lancer(self, *args):
        sortie = io.StringIO()
        with redirect_stdout(sortie):
            code = mp.main(["--url", self.url, *args])
        return code, sortie.getvalue()

    def test_creation_puis_code_appairage(self):
        code, sortie = self.lancer()
        self.assertEqual(code, 0)
        self.assertIn("créé", sortie)
        self.assertIn("3497-011-2332", sortie)
        post = [c for c in APPELS if c[0] == "POST" and c[1] == "/api/matter/bridges"]
        self.assertEqual(post[0][2]["filter"], CONFIG["filter"])

    def test_relance_met_a_jour_sans_doublon(self):
        self.lancer()
        code, sortie = self.lancer()
        self.assertEqual(code, 0)
        self.assertIn("mis à jour", sortie)
        self.assertEqual(len(PONTS), 1)
        put = [c for c in APPELS if c[0] == "PUT"]
        self.assertEqual(put[0][2]["id"], "pont1")

    def test_etat_ne_modifie_rien(self):
        code, sortie = self.lancer("--etat")
        self.assertEqual(code, 1)
        self.assertFalse([c for c in APPELS if c[0] != "GET"])

    def test_essai_sans_reseau(self):
        code, sortie = self.lancer("--essai")
        self.assertEqual(code, 0)
        self.assertEqual(APPELS, [])
        self.assertIn("cover.garage*", sortie)

    def test_mauvais_mot_de_passe(self):
        os.environ["MATTER_ADMIN_PASSWORD"] = "faux"
        try:
            with self.assertRaises(SystemExit) as e:
                self.lancer()
            self.assertIn("401", str(e.exception))
        finally:
            os.environ["MATTER_ADMIN_PASSWORD"] = "secret"


if __name__ == "__main__":
    unittest.main()
