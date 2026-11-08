"""Garde-fous des automatisations J5 (Python standard, sans PyYAML).

    python3 -m unittest discover -s tests -v
"""
import os
import re
import unittest

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HA = os.path.join(RACINE, "homeassistant-config")


def lire(nom):
    with open(os.path.join(HA, nom), encoding="utf-8") as f:
        return f.read()


AUTOS = lire("automations.yaml")
CONFIG = lire("configuration.yaml")
CODE_AUTOS = "\n".join(l for l in AUTOS.splitlines() if not l.lstrip().startswith("#"))


class TestRegleMaison(unittest.TestCase):
    def test_rien_n_ouvre_automatiquement(self):
        for interdit in ("open_cover", "cover.garage", "ouvrir_portail", "portail_nice",
                         "remote.send_command"):
            self.assertNotIn(interdit, CODE_AUTOS, f"une automatisation utilise {interdit}")

    def test_identifiants_uniques(self):
        ids = re.findall(r"^- id: (\S+)", AUTOS, re.M)
        self.assertTrue(ids)
        self.assertEqual(len(ids), len(set(ids)))

    def test_chaque_automatisation_a_un_mode_et_un_alias(self):
        blocs = re.split(r"^- id: ", AUTOS, flags=re.M)[1:]
        for b in blocs:
            self.assertIn("\n  alias: ", b)
            self.assertIn("\n  mode: ", b)


class TestEntitesExistent(unittest.TestCase):
    """Chaque entité citée par une automatisation est définie dans configuration.yaml."""

    def entites_definies(self):
        defs = set()
        for lum in re.findall(r"^      ([a-z_0-9]+):\n        friendly_name", CONFIG, re.M):
            defs.add("light." + lum)
        defs.add("light.facade_jardin")  # groupe « Façade jardin »
        for dom in ("input_boolean", "input_select"):
            bloc = CONFIG.split(dom + ":\n", 1)[1].split("\n\n", 1)[0]
            defs |= {f"{dom}.{n}" for n in re.findall(r"^  ([a-z_0-9]+):", bloc, re.M)}
        bloc = CONFIG.split("\nscript:\n", 1)[1]
        defs |= {"script." + n for n in re.findall(r"^  ([a-z_0-9]+):\n    alias", bloc, re.M)}
        return defs

    def test_references(self):
        definies = self.entites_definies()
        citees = set(re.findall(r"\b((?:light|input_boolean|input_select|script)\.[a-z_0-9]+)",
                                CODE_AUTOS))
        citees -= {"light.turn_on", "light.turn_off"}  # services, pas des entités
        self.assertTrue(citees)
        self.assertEqual(citees - definies, set())

    def test_pauses_eteintes_par_defaut_donc_actives(self):
        # Un input_boolean neuf démarre à off : les conditions doivent attendre "off"
        for m in re.finditer(r"entity_id: input_boolean\.pause_[a-z_]+\n\s+state: \"(\w+)\"",
                             CODE_AUTOS):
            self.assertEqual(m.group(1), "off")


class TestAnnonce(unittest.TestCase):
    def test_annonce_toujours_notifiee_voix_si_disponible(self):
        bloc = CONFIG.split("  annonce_maison:\n", 1)[1].split("\n\n  ", 1)[0]
        self.assertIn("persistent_notification.create", bloc)
        self.assertIn("states('tts.google_translate_fr_fr') not in ['unknown', 'unavailable']",
                      bloc)
        self.assertIn("media_player.alia", bloc)

    def test_garage_previent_sans_fermer(self):
        bloc = AUTOS.split("- id: garage_reste_ouvert", 1)[1]
        self.assertIn("script.annonce_maison", bloc)
        self.assertNotIn("close_cover", bloc)


if __name__ == "__main__":
    unittest.main()
