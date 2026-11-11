"""Tests for tools/quality.py. Run: python3 -m unittest tools.test_quality  (preflight does)."""
import json, os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quality  # noqa: E402


def fake(name, passing=7, validated=True):
    return {'version': '1.2.3', 'passing': passing, 'validated': validated}


MEASURED = {**{n: fake(n) for n in quality.FACTS['order']}, '_hooks_fail_open': True}


class Render(unittest.TestCase):
    def test_every_mod_has_a_section_in_the_stated_order_and_the_lead_three_come_first(self):
        text = quality.render(MEASURED)
        heads = [l[4:].split(' ')[0] for l in text.splitlines() if l.startswith('### ')]
        self.assertEqual(heads, quality.FACTS['order'])
        self.assertLess(text.index('## The lead mods'), text.index('### critter-buddy'))
        self.assertLess(text.index('### guard'), text.index('## The others'))
        self.assertLess(text.index('## The others'), text.index('### session-diary'))

    def test_measured_numbers_come_from_the_measurement_not_from_the_facts_file(self):
        text = quality.render({**MEASURED, 'forge': fake('forge', passing=4242)})
        self.assertIn('| Tests passing | 4242 |', text)

    def test_a_failed_validation_and_a_hook_without_a_catch_are_said_loudly(self):
        text = quality.render({**MEASURED, 'crab': fake('crab', validated=False), '_hooks_fail_open': False})
        self.assertIn('| Strict validation | FAILS |', text)
        self.assertIn('NO: see tools/check-hooks.py', text)

    def test_an_empty_sighting_says_not_yet_and_never_a_blank(self):
        text = quality.render(MEASURED)
        forge = text[text.index('### forge'):]
        self.assertIn('**Seen working in the real app**\n\n- not yet', forge)

    def test_guard_is_described_as_failing_closed_on_purpose(self):
        text = quality.render(MEASURED)
        guard = text[text.index('### guard'):text.index('### session-diary')]
        self.assertIn('fails closed on purpose', guard)
        self.assertNotIn('Tool-path hooks fail open', guard)

    def test_the_output_is_stable_so_a_check_can_compare_it(self):
        self.assertEqual(quality.render(MEASURED), quality.render(MEASURED))

    def test_every_plugin_in_the_repo_has_a_row_and_every_row_a_plugin(self):
        folders = sorted(d for d in os.listdir(os.path.join(quality.ROOT, 'plugins')) if os.path.isdir(os.path.join(quality.ROOT, 'plugins', d)))
        self.assertEqual(sorted(quality.FACTS['order']), folders)
        self.assertEqual(sorted(quality.FACTS['plugins']), folders)


if __name__ == '__main__':
    unittest.main()
