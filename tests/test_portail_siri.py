"""Garde-fous du script « Dis Siri, ouvre le portail » (Python standard, sans PyYAML).

    python3 -m unittest discover -s tests -v
"""
import glob
import json
import os
import re
import unittest

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_HA = os.path.join(RACINE, "homeassistant-config", "configuration.yaml")


def lire(chemin):
    with open(chemin, encoding="utf-8") as f:
        return f.read()


def bloc_script(nom):
    """Texte YAML du script `nom` (de sa ligne jusqu'au script suivant)."""
    texte = lire(CONFIG_HA)
    m = re.search(rf"^  {nom}:\n(.*?)(?=^  [a-z_0-9]+:\n|^\S)", texte, re.S | re.M)
    return m.group(1) if m else None


class TestScriptPortail(unittest.TestCase):
    def setUp(self):
        self.bloc = bloc_script("ouvrir_portail")
        self.assertIsNotNone(self.bloc, "script.ouvrir_portail absent de configuration.yaml")

    def test_une_seule_execution_a_la_fois(self):
        self.assertRegex(self.bloc, r"\n    mode: single\n")

    def test_ne_fait_rien_sans_shelly(self):
        # Garde : l'entité doit exister, sinon notification + arrêt en erreur
        self.assertIn("states('switch.portail_nice') not in ['unknown', 'unavailable']", self.bloc)
        sinon = self.bloc.split("else:", 1)[1]
        self.assertIn("persistent_notification.create", sinon)
        self.assertIn("error: true", sinon)
        self.assertNotIn("switch.turn_on", sinon)

    def test_impulsion_puis_relache(self):
        alors = self.bloc.split("then:", 1)[1].split("else:", 1)[0]
        on, off = alors.find("switch.turn_on"), alors.find("switch.turn_off")
        self.assertTrue(0 <= on < off, "le contact doit être relâché après l'impulsion")
        self.assertIn("delay: { seconds: 1 }", alors)

    def test_anti_rebond(self):
        alors = self.bloc.split("then:", 1)[1].split("else:", 1)[0]
        self.assertIn("delay: { seconds: 20 }", alors)

    def test_journalise(self):
        self.assertIn("logbook.log", self.bloc)


class TestJamaisAutomatique(unittest.TestCase):
    def test_aucune_automatisation_n_ouvre_le_portail(self):
        texte = lire(os.path.join(RACINE, "homeassistant-config", "automations.yaml"))
        self.assertNotIn("ouvrir_portail", texte)
        self.assertNotIn("switch.portail_nice", texte)

    def test_pas_d_autre_appel_dans_la_config(self):
        # Seul le script lui-même touche au contact du portail
        texte = lire(CONFIG_HA).replace("  ouvrir_portail:\n" + bloc_script("ouvrir_portail"), "")
        code = "\n".join(l for l in texte.splitlines() if not l.lstrip().startswith("#"))
        for motif in ("switch.portail_nice", "script.ouvrir_portail"):
            self.assertFalse(motif in code, f"{motif} utilisé hors du script")

    def test_jamais_expose_a_la_voix_google(self):
        for chemin in glob.glob(os.path.join(RACINE, "matter", "*.json")):
            texte = lire(chemin)
            for motif in ("script", "switch.portail", "ouvrir_portail"):
                self.assertNotIn(motif, texte, f"{chemin} exposerait le portail à Google")

    def test_pas_encore_sur_la_tablette(self):
        # À ajouter seulement quand le Shelly sera posé (avec confirmation)
        maison = json.dumps(json.load(open(os.path.join(RACINE, "portail", "maison.json"),
                                           encoding="utf-8")))
        self.assertNotIn("ouvrir_portail", maison)


class TestDocs(unittest.TestCase):
    def test_guides_presents(self):
        siri = lire(os.path.join(RACINE, "docs", "PORTAIL-SIRI.md"))
        vpn = lire(os.path.join(RACINE, "docs", "ACCES-DISTANT.md"))
        self.assertIn("switch.portail_nice", siri)
        self.assertIn("Ouvre le portail", siri)
        self.assertIn("WireGuard", vpn)
        self.assertIn("full-stack", vpn)


if __name__ == "__main__":
    unittest.main()
