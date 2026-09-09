"""Idempotent GitHub issue/milestone sync. Dry-run by default; --apply writes."""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "Tram-anh99/He-thong-Quan-ly-de-tai-Khoa-hoc-va-Du-an"
STATE = ROOT / "docs/backlog-state.json"
START, END = "<!-- research-budget:start -->", "<!-- research-budget:end -->"


def api(path, payload=None, pages=False):
    args = ["gh", "api", f"repos/{REPO}/{path}"]
    if pages:
        args += ["--paginate", "--slurp"]
    if payload is not None:
        args += ["--method", "PATCH" if re.fullmatch(r"issues/\d+", path) else "POST", "--input", "-"]
    result = subprocess.run(args, input=None if payload is None else json.dumps(payload),
                            text=True, capture_output=True, check=True)
    data = json.loads(result.stdout)
    return [entry for page in data for entry in page] if pages else data


def managed(existing, text):
    block = f"{START}\n{text}\n{END}"
    if START in existing:
        assert existing.count(START) == 1 and existing.count(END) == 1
        start, end = existing.index(START), existing.index(END) + len(END)
        return existing[:start] + block + existing[end:]
    return (existing.rstrip() + "\n\n" + block).strip()


def main():
    backlog = json.loads((ROOT / "docs/backlog.json").read_text())
    state = json.loads(STATE.read_text())
    # The first run covered Module 1.  Keep the same idempotent mapping and
    # extend it to every imported Plane Work Idea so neither tracker is a
    # partial source of truth.
    selected = backlog["workItems"]
    if "--apply" not in sys.argv:
        for item in selected:
            print(item["id"], item["primaryModuleId"], item["cycleId"], item["title"])
        print("Dry-run. --apply writes only the selected issues, module summaries and cycle milestones.")
        return
    existing = [item for item in api("issues?state=all&per_page=100", pages=True) if "pull_request" not in item]
    milestones = api("milestones?state=all&per_page=100", pages=True)
    labels = {label["name"] for label in api("labels?per_page=100", pages=True)}

    def save():
        STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")

    def ensure_label(name):
        if name not in labels:
            api("labels", {"name": name, "color": "1d76db"})
            labels.add(name)

    def upsert(key, title, body, extra=None):
        marker = f"<!-- backlog-id:{key} -->"
        matches = [item for item in existing if marker in (item.get("body") or "")]
        assert len(matches) <= 1, f"Duplicate remote marker {key}; resolve before writing"
        if matches:
            item = matches[0]
            payload = {"title": title, "body": managed(item.get("body") or "", marker + "\n" + body), **(extra or {})}
            if "labels" in payload:
                payload["labels"] = sorted(set(payload["labels"]) | {x["name"] for x in item.get("labels", [])})
            updated = api(f"issues/{item['number']}", payload)
            item.update(updated)
        else:
            item = api("issues", {"title": title, "body": managed("", marker + "\n" + body), **(extra or {})})
            existing.append(item)
        return {"number": item["number"], "id": item["id"], "url": item["html_url"]}

    for cycle in backlog["cycles"]:
        if not any(item["cycleId"] == cycle["id"] for item in selected):
            continue
        title = f"{cycle['id']} — {cycle['name']}"
        matches = [m for m in milestones if m["title"] == title]
        assert len(matches) <= 1
        milestone = matches[0] if matches else api("milestones", {"title": title, "description": "Cycle triển khai; chưa gán deadline. Quan hệ work item được lưu bằng milestone."})
        state.setdefault("cycles", {}).setdefault(cycle["id"], {})["github"] = {"number": milestone["number"], "url": milestone["html_url"]}
        save()

    for module in backlog["modules"]:
        if not any(item["primaryModuleId"] == module["id"] for item in selected):
            continue
        ensure_label(module["id"])
        mapping = upsert(module["id"], module["name"], f"Module: {module['id']}.\n\nTheo dõi các công việc của module trong đợt nền tảng. Chi tiết: docs/module-01.md.", {"labels": [module["id"]]})
        state.setdefault("modules", {}).setdefault(module["id"], {})["github"] = mapping
        save()

    for item in selected:
        ensure_label(item["priority"])
        body = (
            f"Mã công việc: **{item['id']}** · Mã thực hiện: **{item['executionCode']}** "
            f"(thứ tự {item['executionOrder']}/51)\n\n"
            f"Module: {item['primaryModuleId']} · Cycle: {item['cycleId']} · Ưu tiên: {item['priority']}"
        )
        body += "\n\n### Đầu vào\n\n" + "\n".join(f"- {value}" for value in item["executionInputs"])
        body += "\n\n### Đầu ra và tiêu chí nghiệm thu\n\n" + "\n".join(f"- {value}" for value in item["executionOutputs"])
        body += "\n\n### Các bước thực hiện\n\n" + "\n".join(f"{index}. {step}" for index, step in enumerate(item["executionSteps"], 1))
        notes = item.get("progressNotes", [])
        body += "\n\n### Thay đổi, lỗi và cách xử lý\n\n" + ("\n".join(f"- {note}" for note in notes) if notes else "- Chưa bắt đầu; chưa có thay đổi hoặc lỗi để ghi nhận.")
        display_title = f"{item['executionCode']} — {item['title']}"
        mapping = upsert(item["id"], display_title, body, {"labels": [item["primaryModuleId"], item["priority"]],
                         "milestone": state["cycles"][item["cycleId"]]["github"]["number"]})
        state["workItems"].setdefault(item["id"], {}).setdefault("externalMappings", {})["github"] = mapping
        save()
        print(item["id"], mapping["url"], flush=True)

    # Relations only after every selected issue has a persisted remote ID.
    for item in selected:
        remote = state["workItems"][item["id"]]["externalMappings"]["github"]
        issue = next(x for x in existing if x["number"] == remote["number"])
        text = issue["body"][issue["body"].index(START) + len(START):issue["body"].index(END)].strip()
        text = text.split("\n\n### Quan hệ và trang tài liệu")[0]
        module_url = state["modules"][item["primaryModuleId"]]["github"]["url"]
        text += f"\n\n### Quan hệ và trang tài liệu\n\nModule: {module_url}\n\n"
        for dep in item["dependsOnIds"]:
            dep_url = state["workItems"].get(dep, {}).get("externalMappings", {}).get("github", {}).get("url")
            text += f"- Bị chặn bởi: {dep_url or dep + ' (backlog giai đoạn sau; chưa đồng bộ issue)'}\n"
        plane = state["workItems"][item["id"]]["externalMappings"].get("plane", {})
        text += f"\nPlane: {plane.get('url', 'đang hoàn thiện mapping')}\n\nTrang triển khai: docs/module-01.md (trong nhánh/PR Module 1).\n\nTrạng thái: {item['status']}; chưa triển khai production."
        api(f"issues/{remote['number']}", {"body": managed(issue["body"], text)})

    for module_id, mappings in state["modules"].items():
        if "github" not in mappings:
            continue
        issue = next(x for x in existing if x["number"] == mappings["github"]["number"])
        children = [item for item in selected if item["primaryModuleId"] == module_id]
        text = f"<!-- backlog-id:{module_id} -->\nModule {module_id}. Trang thực hiện: docs/module-01.md.\n\n"
        text += "\n".join(f"- [{'x' if item['status'] == 'done' else ' '}] {state['workItems'][item['id']]['externalMappings']['github']['url']} — {item['title']} ({item['cycleId']})" for item in children)
        if module_id == "M01":
            text += "\n\nC01 đã có kiểm thử local. LINK-002 còn nghiệm thu đồng bộ Plane; OPS-001 chờ C10/MVP. Không đóng toàn bộ module trước khi đạt các điều kiện này."
        api(f"issues/{issue['number']}", {"body": managed(issue["body"], text)})
    state["syncStatus"] = "partial"
    save()


if __name__ == "__main__":
    main()
