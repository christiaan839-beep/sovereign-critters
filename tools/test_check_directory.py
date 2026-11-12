"""Tests for tools/check-directory.py: the writing rules the plugin directory's validation applies to a hooks module."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('check_directory', pathlib.Path(__file__).with_name('check-directory.py'))
cd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cd)


class JsxNames(unittest.TestCase):
    def test_flags_a_declaration_of_a_name_the_jsx_may_compile_to(self):
        for line in ['let h = 7', 'const h = holidayOf(now)', 'update($, x, h => !h)', 'const f = (h) => h', 'function g(a, Fragment) {}', 'const { h } = obj', 'for (const h of xs) {}', 'import { h } from "x"']:
            self.assertTrue(cd.jsx_name_findings(line + '\n'), line)

    def test_leaves_other_names_and_comments_alone(self):
        for line in ['const hidden = 1', 'update($, x, hid => !hid)', '// let h = 1', 'const size = { width: 1 }', "const s = 'h => x'"]:
            self.assertEqual(cd.jsx_name_findings(line + '\n'), [], line)


if __name__ == '__main__':
    unittest.main()
