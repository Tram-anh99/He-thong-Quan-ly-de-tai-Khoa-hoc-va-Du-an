import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("backlog_export", ROOT / "scripts/export_backlog.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class BacklogTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        (self.root / "docs").mkdir()
        self.source = self.root / "docs/research-budget-requirements.md"
        self.source.write_text((ROOT / "docs/research-budget-requirements.md").read_text())
        exporter.ROOT = self.root

    def tearDown(self):
        exporter.ROOT = ROOT
        self.directory.cleanup()

    def state(self, items):
        (self.root / "docs/backlog-state.json").write_text(json.dumps({"workItems": items}))

    def test_mapping_and_progress_survive_regeneration(self):
        self.state({"CORE-001": {"status": "in_progress", "externalMappings": {"github": {"number": 123}}}})
        exporter.export()
        exporter.export()
        data = json.loads((self.root / "docs/backlog.json").read_text())
        item = next(x for x in data["workItems"] if x["id"] == "CORE-001")
        self.assertEqual(item["externalMappings"]["github"]["number"], 123)
        self.assertEqual(item["status"], "in_progress")

    def test_reject_missing_dependency(self):
        self.source.write_text(self.source.read_text().replace("| SEC-001 |", "| MISSING-001 |", 1))
        with self.assertRaises((AssertionError, KeyError)):
            exporter.export()

    def test_reject_dependency_cycle(self):
        self.source.write_text(self.source.read_text().replace("token sai/hết hạn nhận 401 | — |", "token sai/hết hạn nhận 401 | SEC-002 |"))
        with self.assertRaisesRegex(AssertionError, "Dependency cycle"):
            exporter.export()

    def test_reject_parent_cycle(self):
        self.state({"CORE-001": {"parentId": "CORE-002"}, "CORE-002": {"parentId": "CORE-001"}})
        with self.assertRaisesRegex(AssertionError, "Parent cycle"):
            exporter.export()

    def test_reject_unknown_external_mapping_key(self):
        self.state({"UNKNOWN-001": {"status": "done"}})
        with self.assertRaisesRegex(AssertionError, "Unknown work item"):
            exporter.export()


if __name__ == "__main__":
    unittest.main()
