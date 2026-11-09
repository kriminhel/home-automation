"""Liste de courses du portail contre un faux Home Assistant (services todo.*).

    python3 -m unittest discover -s tests -v
"""
import json
import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RACINE, "portail"))
os.environ.setdefault("HA_TOKEN", "jeton-test")

import server  # noqa: E402

MAISON = {"courses": {"entity_id": "todo.courses", "nom": "Courses"}}


class Liste:
    def reset(self):
        self.items = [{"uid": "u1", "summary": "Lait", "status": "completed"},
                      {"uid": "u2", "summary": "Pain", "status": "needs_action"}]
        self.appels = []


LISTE = Liste()


class FauxHA(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _ok(self, obj):
        brut = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(brut)

    def do_POST(self):
        corps = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        LISTE.appels.append((self.path, corps))
        if self.headers.get("Authorization") != "Bearer " + server.HA_TOKEN:
            self.send_response(401)
            self.end_headers()
            return
        if corps.get("entity_id") != "todo.courses":
            self.send_response(400)
            self.end_headers()
            return
        if self.path == "/api/services/todo/get_items?return_response":
            return self._ok({"changed_states": [],
                             "service_response": {"todo.courses": {"items": LISTE.items}}})
        if self.path == "/api/services/todo/add_item":
            LISTE.items.append({"uid": "u%d" % (len(LISTE.items) + 1), "summary": corps["item"],
                                "status": "needs_action"})
        elif self.path == "/api/services/todo/update_item":
            for i in LISTE.items:
                if corps["item"] in (i["uid"], i["summary"]):
                    i["status"] = corps["status"]
        elif self.path == "/api/services/todo/remove_completed_items":
            LISTE.items = [i for i in LISTE.items if i["status"] != "completed"]
        return self._ok([])


class TestCourses(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), FauxHA)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()

    def setUp(self):
        LISTE.reset()
        self.ancienne_url = server.HA_URL
        server.HA_URL = "http://127.0.0.1:%d" % self.srv.server_address[1]

    def tearDown(self):
        server.HA_URL = self.ancienne_url

    def test_lecture_a_faire_en_premier(self):
        res = server.lire_courses(MAISON)
        self.assertEqual([(a["titre"], a["fait"]) for a in res], [("Pain", False), ("Lait", True)])

    def test_ajouter_nettoie_le_texte(self):
        res = server.commander_courses(MAISON, {"action": "ajouter", "titre": "  Œufs   bio \n"})
        self.assertIn("Œufs bio", [a["titre"] for a in res])
        self.assertEqual(LISTE.appels[0][1], {"entity_id": "todo.courses", "item": "Œufs bio"})

    def test_ajouter_vide_refuse(self):
        with self.assertRaises(ValueError):
            server.commander_courses(MAISON, {"action": "ajouter", "titre": "   "})
        self.assertEqual(LISTE.appels, [])

    def test_titre_tronque(self):
        server.commander_courses(MAISON, {"action": "ajouter", "titre": "x" * 500})
        self.assertEqual(len(LISTE.appels[0][1]["item"]), 100)

    def test_cocher_puis_decocher(self):
        server.commander_courses(MAISON, {"action": "cocher", "uid": "u2"})
        self.assertEqual(LISTE.items[1]["status"], "completed")
        server.commander_courses(MAISON, {"action": "decocher", "uid": "u2"})
        self.assertEqual(LISTE.items[1]["status"], "needs_action")

    def test_vider_coches(self):
        res = server.commander_courses(MAISON, {"action": "vider_coches"})
        self.assertEqual([a["titre"] for a in res], ["Pain"])

    def test_action_inconnue(self):
        for demande in ({"action": "supprimer_tout"}, {"action": "cocher"}, {}):
            with self.assertRaises(ValueError):
                server.commander_courses(MAISON, demande)

    def test_liste_non_declaree_ou_pas_un_todo(self):
        for maison in ({}, {"courses": {"entity_id": "light.salon"}}):
            with self.assertRaises(ValueError):
                server.lire_courses(maison)

    def test_maison_json_declare_la_liste(self):
        self.assertEqual(server.entite_courses(server.charger_maison()), "todo.courses")


if __name__ == "__main__":
    unittest.main()
