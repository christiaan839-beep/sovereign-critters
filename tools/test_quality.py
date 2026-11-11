"""Tests for tools/quality.py. Run: python3 -m unittest tools.test_quality  (preflight does)."""
import copy, os, sys, unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quality  # noqa: E402


def fake(passing=7, validated=True):
    return {'version': '1.2.3', 'passing': passing, 'validated': validated}


MEASURED = {**{n: fake() for n in quality.FACTS['order']}, '_hooks_fail_open': True}
UNCHANGED = lambda sha, name, paths=None: 0  # noqa: E731  no commit touched the plugin since the fact
CHANGED = lambda sha, name, paths=None: 3  # noqa: E731
UNKNOWN = lambda sha, name, paths=None: None  # noqa: E731  the commit a fact names is not in this history

FULL = {
    'reviews': [
        {'date': 'd', 'at': 'abc', 'kind': 'code', 'openHigh': 0, 'what': 'w', 'found': 'f'},
        {'date': 'd', 'at': 'abc', 'kind': 'docs', 'openHigh': 0, 'what': 'w', 'found': 'f'},
    ],
    'seen': [{'date': 'd', 'at': 'abc', 'surface': 'Claude desktop app', 'what': 'w'}],
    'failFirst': {'date': 'd', 'at': 'abc', 'what': 'w'},
    'coldInstall': [{'date': 'd', 'at': 'abc', 'by': 'a tester', 'what': 'w'}],
}


class Gates(unittest.TestCase):
    def test_a_mod_with_every_fact_fresh_meets_all_eight_and_is_ready_to_release(self):
        g = quality.gates('critter-measure', MEASURED, FULL, UNCHANGED)
        self.assertEqual(sorted(g), sorted(k for k, _ in quality.GATES))
        self.assertEqual(set(g.values()), {'met'})
        self.assertEqual(quality.verdict('critter-measure', g), 'Ready to release')

    def test_every_witnessed_fact_goes_stale_when_the_plugin_changed_after_it(self):
        g = quality.gates('critter-measure', MEASURED, FULL, CHANGED)
        for k in ('failfirst', 'review', 'seen', 'docs', 'cold'):
            self.assertEqual(g[k], 'stale', k)
        for k in ('tests', 'valid', 'failopen'):
            self.assertEqual(g[k], 'met', k)  # the measured gates are never stale

    def test_a_fact_about_a_commit_that_cannot_be_found_is_stale_never_met(self):
        self.assertEqual(quality.gates('critter-measure', MEASURED, FULL, UNKNOWN)['review'], 'stale')

    def test_no_facts_means_open_not_stale(self):
        g = quality.gates('critter-measure', MEASURED, {'reviews': [], 'seen': [], 'failFirst': None, 'coldInstall': []}, UNCHANGED)
        for k in ('failfirst', 'review', 'seen', 'docs', 'cold'):
            self.assertEqual(g[k], 'open', k)

    def test_a_review_with_an_open_high_finding_does_not_meet_the_review_gate(self):
        f = copy.deepcopy(FULL)
        f['reviews'][0]['openHigh'] = 1
        self.assertNotEqual(quality.gates('critter-measure', MEASURED, f, UNCHANGED)['review'], 'met')

    def test_only_a_sighting_on_the_desktop_app_meets_the_desktop_gate(self):
        f = copy.deepcopy(FULL)
        f['seen'][0]['surface'] = 'a terminal'
        self.assertEqual(quality.gates('critter-measure', MEASURED, f, UNCHANGED)['seen'], 'open')  # a terminal sighting is real, but it is not the desktop gate

    def test_failing_tests_or_validation_or_hooks_open_their_gates(self):
        g = quality.gates('critter-crab', {**MEASURED, 'critter-crab': fake(passing=0, validated=False), '_hooks_fail_open': False}, FULL, UNCHANGED)
        self.assertEqual((g['tests'], g['valid'], g['failopen']), ('open', 'open', 'open'))

    def test_guard_needs_no_fail_open_because_it_fails_closed_on_purpose(self):
        g = quality.gates('critter-ward', {**MEASURED, '_hooks_fail_open': False}, FULL, UNCHANGED)
        self.assertEqual(g['failopen'], 'met')


class Scope(unittest.TestCase):
    def test_a_change_to_the_hooks_makes_the_review_the_sighting_and_the_docs_audit_stale(self):
        touched = lambda sha, name, paths=None: 1 if 'hooks' in (paths or ()) else 0  # noqa: E731
        g = quality.gates('critter-measure', MEASURED, FULL, touched)
        self.assertEqual(g['review'], 'stale')
        self.assertEqual(g['seen'], 'stale')
        self.assertEqual(g['docs'], 'stale')  # the docs audit is also about the code the docs describe

    def test_a_readme_edit_leaves_the_code_review_and_the_sighting_fresh_but_not_the_docs_audit(self):
        readme_only = lambda sha, name, paths=None: 1 if paths and 'README.md' in paths else 0  # noqa: E731
        g = quality.gates('critter-measure', MEASURED, FULL, readme_only)
        self.assertEqual((g['review'], g['seen'], g['failfirst']), ('met', 'met', 'met'))
        self.assertEqual(g['docs'], 'stale')


class Verdict(unittest.TestCase):
    def six_met(self):
        return {k: ('met' if k in quality.EXTRAS_BAR else 'open') for k, _ in quality.GATES}

    def test_an_extra_with_the_first_six_is_on_the_shelf_but_not_released(self):
        self.assertEqual(quality.verdict('critter-measure', self.six_met()), 'Ready for the shelf of extras')

    def test_a_lead_mod_with_only_the_first_six_is_not_ready(self):
        self.assertEqual(quality.verdict('critter-buddy', self.six_met()), 'Not ready: 2 of 8 open')

    def test_the_count_of_open_gates_is_exact(self):
        g = {k: 'met' for k, _ in quality.GATES}
        g['review'] = 'stale'
        g['cold'] = 'open'
        self.assertEqual(quality.verdict('critter-ward', g), 'Not ready: 2 of 8 open')


class Render(unittest.TestCase):
    def test_every_mod_has_a_section_in_the_stated_order_and_the_lead_three_come_first(self):
        text = quality.render(MEASURED, UNCHANGED)
        heads = [l[4:].split(' ')[0] for l in text.splitlines() if l.startswith('### ')]
        self.assertEqual(heads, quality.FACTS['order'])
        self.assertLess(text.index('## The lead mods'), text.index('### critter-buddy'))
        self.assertLess(text.index('### critter-ward'), text.index('## The others'))
        self.assertLess(text.index('## The others'), text.index('### critter-diary'))

    def test_the_release_bar_table_has_a_row_per_mod_and_a_column_per_gate(self):
        text = quality.render(MEASURED, UNCHANGED)
        table = text[text.index('## The release bar'):text.index('## The lead mods')]
        rows = [l for l in table.splitlines() if l.startswith('| ') and not l.startswith('| ---') and not l.startswith('| Mod')]
        self.assertEqual(len(rows), len(quality.FACTS['order']))
        for r in rows:
            self.assertEqual(r.count('|'), len(quality.GATES) + 3)

    def test_measured_numbers_come_from_the_measurement_not_from_the_facts_file(self):
        text = quality.render({**MEASURED, 'critter-measure': {**fake(), 'passing': 4242}}, UNCHANGED)
        self.assertIn('| Tests passing | 4242 |', text)

    def test_a_failed_validation_and_a_hook_without_a_catch_are_said_loudly(self):
        text = quality.render({**MEASURED, 'critter-crab': fake(validated=False), '_hooks_fail_open': False}, UNCHANGED)
        self.assertIn('| Strict validation | FAILS |', text)
        self.assertIn('NO: see tools/check-hooks.py', text)

    def test_an_empty_sighting_says_not_yet_and_never_a_blank(self):
        forge = quality.render(MEASURED, UNCHANGED)
        forge = forge[forge.index('### critter-measure'):]
        self.assertIn('**Seen working in the real app**\n\n- not yet', forge)
        self.assertIn('**Cold install by someone who is not the founder**\n\n- not yet', forge)

    def test_guard_is_described_as_failing_closed_on_purpose(self):
        text = quality.render(MEASURED, UNCHANGED)
        guard = text[text.index('### critter-ward'):text.index('### critter-diary')]
        self.assertIn('fails closed on purpose', guard)
        self.assertNotIn('Tool-path hooks fail open', guard)

    def test_the_output_is_stable_so_a_check_can_compare_it(self):
        self.assertEqual(quality.render(MEASURED, UNCHANGED), quality.render(MEASURED, UNCHANGED))

    def test_every_plugin_in_the_repo_has_a_row_and_every_row_a_plugin(self):
        folders = sorted(d for d in os.listdir(os.path.join(quality.ROOT, 'plugins')) if not d.startswith('.') and os.path.isdir(os.path.join(quality.ROOT, 'plugins', d)))
        self.assertEqual(sorted(quality.FACTS['order']), folders)
        self.assertEqual(sorted(quality.FACTS['plugins']), folders)

    def test_the_whole_repository_facts_are_listed_before_the_mods(self):
        text = quality.render(MEASURED, UNCHANGED)
        self.assertLess(text.index('## The whole repository'), text.index('## The lead mods'))
        self.assertIn('gitleaks over the full git history', text)

    def test_every_witnessed_fact_names_the_commit_it_was_about(self):
        for r in quality.FACTS.get('repo', []):
            self.assertTrue(r.get('at') and r.get('date'), r)
        for name, f in quality.FACTS['plugins'].items():
            entries = f['reviews'] + f['seen'] + f.get('coldInstall', []) + ([f['failFirst']] if f.get('failFirst') else [])
            for e in entries:
                self.assertTrue(e.get('at'), f'{name}: {e}')
                self.assertTrue(e.get('date'), f'{name}: {e}')


if __name__ == '__main__':
    unittest.main()
