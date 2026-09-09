"""Dump/restore only the isolated Module 1 Docker fixture; never reads .env."""
import json
import subprocess
import tempfile
import time
from pathlib import Path

CONTAINER = "research-m01-db"
USER = "research_test"
SOURCE = "research_m01_test"
TABLES = ["users", "projects", "project_documents", "project_members", "budget_items",
          "contracts", "products", "payment_records", "document_templates", "audit_logs"]


def command(*args, **kwargs):
    return subprocess.run(list(args), check=True, **kwargs)


def snapshot(database):
    result = {}
    for table in TABLES:
        # Identifiers are from the fixed list above, never from an HTTP payload.
        sql = (f"SELECT json_build_object('count', count(*), 'digest', "
               f"md5(coalesce(string_agg(row_to_json(t)::text, E'\\n' ORDER BY id), ''))) "
               f"FROM public.{table} t")
        output = command("docker", "exec", CONTAINER, "psql", "-U", USER, "-d", database,
                         "-At", "-v", "ON_ERROR_STOP=1", "-c", sql, capture_output=True, text=True)
        result[table] = json.loads(output.stdout)
    for table, field in [("projects", "totalBudget"), ("budget_items", "amount"),
                         ("contracts", "amount"), ("payment_records", "amount")]:
        sql = f'SELECT coalesce(sum("{field}"),0)::text FROM public.{table}'
        result[table]["sum"] = command("docker", "exec", CONTAINER, "psql", "-U", USER,
                                      "-d", database, "-At", "-c", sql,
                                      capture_output=True, text=True).stdout.strip()
    return result


def main():
    target = f"research_m01_test_restore_{int(time.time())}"
    before = snapshot(SOURCE)
    with tempfile.TemporaryDirectory(prefix="research-m01-") as directory:
        dump = Path(directory) / "fixture.dump"
        with dump.open("wb") as out:
            command("docker", "exec", CONTAINER, "pg_dump", "-U", USER, "-d", SOURCE,
                    "--format=custom", "--no-owner", "--no-acl", stdout=out)
        command("docker", "exec", CONTAINER, "createdb", "-U", USER, target)
        with dump.open("rb") as data:
            command("docker", "exec", "-i", CONTAINER, "pg_restore", "-U", USER, "-d", target,
                    "--no-owner", "--no-acl", "--exit-on-error", stdin=data)
    after = snapshot(target)
    assert before == after, "Restored rows, identities, content or financial totals differ"
    report = {"source": SOURCE, "restoredDatabase": target, "matched": True,
              "dataKind": "synthetic-test-fixtures-not-production", "tables": after}
    destination = Path(__file__).resolve().parents[1] / "docs/module-01-restore-evidence.json"
    destination.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Restore verified: {len(TABLES)} tables; row contents, IDs, counts and Decimal totals match.")
    print(f"Evidence: {destination.name}. Isolated restore database retained: {target}")


if __name__ == "__main__":
    main()
