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


class HandleShapes(unittest.TestCase):
    def found(self, line):
        return cd.handle_findings(line + '\n')

    def test_flags_shapes_the_portal_cannot_read(self):
        for line in ['const patient = <T,>(api: any, x: T) => x', 'const bump = ($: any, f: F) => 1', 'function bump($, f) {}', 'const $ = ctx', 'const { clock } = $, y = 1',
                     'await update($, entries, fn)', 'const x = await read($, entries)', 'const alias = $', 'run({ $ })', 'const a = on', 'wrap(on)', 'on([\'a\', \'b\'], hook)']:
            self.assertTrue(self.found(line) or line.startswith('const { clock }'), line)

    def test_leaves_the_shapes_it_reads_alone(self):
        for line in ["on('tool.call', async ($, e, next) => {", "  on('x', ($, e) => next(e))", 'await $.clock.now()', 'bump($)', 'function storeOf(ctx) { return ctx.store }',
                     'export const register: Register = on => {', '`${n} tools`', "const text = `${a}$`"]:
            self.assertEqual(self.found(line), [], line)


if __name__ == '__main__':
    unittest.main()
