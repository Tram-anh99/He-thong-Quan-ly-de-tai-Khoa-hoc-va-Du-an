"""Export the reviewed Markdown backlog as validated, platform-neutral JSON."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES = {
    "M01": "Nền tảng và cơ sở dữ liệu", "M02": "Nhân sự và năng lực",
    "M03": "Đề tài, công việc và hợp đồng", "M04": "Quy định và định mức",
    "M05": "Phân bổ ngân sách và thanh toán", "M06": "Thu nhập và thuế",
    "M07": "Mô phỏng kế hoạch", "M08": "Dashboard và phân tích",
    "M09": "Xác thực và phân quyền", "M10": "Hồ sơ, báo cáo và kiểm toán",
    "M11": "Thông báo và nhắc hạn",
}
CYCLES = [
    "Nền tảng và bảo vệ dữ liệu", "Nhân sự và năng lực",
    "Công việc, hợp đồng và cấu hình hồ sơ", "Định mức, phiên bản hồ sơ và lịch nhắc",
    "Phân bổ, thanh toán, nhắc hạn và nghiệm thu MVP", "Thu nhập và thuế",
    "Mô phỏng kế hoạch", "Dashboard theo vai trò", "Kiểm toán và phân quyền mở rộng",
    "Báo cáo, vận hành và phục hồi",
]
TITLES = {
    "SEC-001": "Bảo vệ phiên đăng nhập và từ chối tài khoản đã khóa",
    "SEC-002": "Giới hạn dữ liệu dự án và dashboard theo quyền người dùng",
    "SEC-003": "Làm sạch nội dung HTML thuyết minh đề tài",
    "CORE-001": "Thiết lập migration và kiểm tra phục hồi dữ liệu hiện có",
    "AUD-001": "Ghi nhật ký cùng giao dịch thay đổi dữ liệu",
    "CORE-002": "Lưu trữ đề tài có phát sinh tài chính",
    "CORE-003": "Kiểm tra dữ liệu đầu vào và chuẩn hóa số tiền",
    "QA-001": "Thiết lập kiểm thử tự động và kiểm tra phân quyền",
    "PEOPLE-001": "Quản lý hồ sơ nhân sự độc lập tài khoản đăng nhập",
    "PEOPLE-002": "Quản lý lịch sử lương và người phụ thuộc",
    "PEOPLE-003": "Quản lý kỹ năng và kinh nghiệm nhân sự",
    "PEOPLE-004": "Cấu hình sức chứa ngày công theo người và tháng",
    "WORK-001": "Quản lý nội dung và công việc của đề tài",
    "WORK-002": "Phân công thành viên thực hiện công việc",
    "WORK-003": "Chuyển đổi và đối soát hạng mục ngân sách cũ",
    "RULE-001": "Quản lý bộ định mức và phiên bản văn bản áp dụng",
    "RULE-002": "Cấu hình đơn giá và điều kiện áp dụng định mức",
    "RULE-003": "Tính và giải thích kết quả định mức",
    "RULE-004": "Kiểm soát trần ngày công và kinh phí theo định mức",
    "ALLOC-001": "Phân bổ ngày công và kinh phí theo người, công việc và tháng",
    "ALLOC-002": "Ngăn vượt ngân sách khi nhiều người phân bổ đồng thời",
    "ALLOC-003": "Theo dõi tổng ngày công qua nhiều đề tài",
    "PAY-001": "Ghi nhận thanh toán nhiều đợt theo người nhận",
    "PAY-002": "Ngăn ghi trùng thanh toán và kiểm soát điều chỉnh kỳ đã khóa",
    "VIEW-001": "Hiển thị ma trận phân bổ theo tháng và chi tiết công việc",
    "VIEW-002": "Hiển thị tổng ngân sách và heatmap ngày công",
    "MVP-001": "Nghiệm thu MVP và đối soát dữ liệu chuyển đổi",
    "TAX-001": "Xác minh và quản lý phiên bản chính sách thuế",
    "TAX-002": "Tổng hợp thu nhập từ lương và các nguồn khác",
    "TAX-003": "Tính thuế theo chính sách và kiểm thử các ngưỡng",
    "TAX-004": "Theo dõi sổ thuế tháng và ước tính quyết toán năm",
    "SCEN-001": "Tạo và chỉnh sửa kịch bản phân bổ độc lập",
    "SCEN-002": "So sánh và phê duyệt áp dụng kịch bản phân bổ",
    "VIEW-003": "Hiển thị heatmap thu nhập và dashboard theo vai trò",
    "SEC-004": "Cấp quyền kiểm toán và kiểm tra bảo vệ dữ liệu tại cơ sở dữ liệu",
    "REPORT-001": "Xuất Excel thu nhập và ngân sách theo quyền truy cập",
    "REPORT-002": "Xuất gói hồ sơ chứng từ và mục lục phiên bản",
    "OPS-001": "Triển khai hệ thống và kiểm tra phục hồi trên staging",
}


def export():
    items = []
    source = ROOT / "docs/research-budget-requirements.md"
    for line in source.read_text().splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if not re.fullmatch(r"[A-Z]+-\d{3}", cells[0]):
            continue
        assert len(cells) in (6, 7), f"Invalid backlog row: {line}"
        item_id, module, cycle, priority = cells[:4]
        if len(cells) == 7:
            title, criteria, dependencies = cells[4:]
        else:
            criteria, dependencies = cells[4:]
            title = TITLES[item_id]
        items.append({
            "id": item_id, "title": title, "primaryModuleId": module.split()[0],
            "cycleId": cycle, "priority": priority, "status": "backlog",
            "description": criteria, "acceptanceCriteria": [criteria],
            "dependsOnIds": [] if dependencies == "—" else dependencies.split(", "),
            "parentId": None, "relatedIds": [], "externalMappings": {},
        })
    state_path = ROOT / "docs/backlog-state.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {"workItems": {}}
    known_ids = {item["id"] for item in items}
    assert set(state["workItems"]) <= known_ids, "Unknown work item in state file"
    for item in items:
        saved = state["workItems"].get(item["id"], {})
        assert set(saved) <= {"status", "externalMappings", "parentId", "relatedIds", "progressNotes"}
        item.update(saved)
        assert item["status"] in {"backlog", "in_progress", "done", "blocked", "planned"}
        assert set(item["relatedIds"]) <= known_ids
        assert item["id"] not in item["relatedIds"]
    by_id = {item["id"]: item for item in items}
    assert len(by_id) == len(items), "Duplicate IDs"
    cycle_ids = {f"C{i:02}" for i in range(1, len(CYCLES) + 1)}
    visited, active, order = set(), set(), []

    def visit(item_id):
        assert item_id in by_id, f"Missing dependency {item_id}"
        assert item_id not in active, f"Dependency cycle at {item_id}"
        if item_id in visited:
            return
        active.add(item_id)
        item = by_id[item_id]
        assert item["primaryModuleId"] in MODULES
        assert item["cycleId"] in cycle_ids
        assert item["title"] and not item["title"].startswith(item_id)
        for dependency in item["dependsOnIds"]:
            visit(dependency)
            assert by_id[dependency]["cycleId"] <= item["cycleId"], (
                f"Dependency scheduled after work item: {dependency} -> {item_id}"
            )
        active.remove(item_id)
        visited.add(item_id)
        order.append(item_id)

    for item in items:
        visit(item["id"])
        ancestors = {item["id"]}
        parent = item["parentId"]
        while parent:
            assert parent in by_id, f"Missing parent {parent}"
            assert parent not in ancestors, f"Parent cycle at {parent}"
            ancestors.add(parent)
            parent = by_id[parent]["parentId"]
    data = {
        "schemaVersion": 1, "format": "internal-backlog-not-native-import",
        "source": str(source.relative_to(ROOT)), "syncStatus": state.get("syncStatus", "not_synced"),
        "modules": [{"id": key, "name": name, "externalMappings": state.get("modules", {}).get(key, {})} for key, name in MODULES.items()],
        "cycles": [{"id": f"C{i:02}", "name": name, "sequence": i,
                    "startDate": None, "endDate": None,
                    "externalMappings": state.get("cycles", {}).get(f"C{i:02}", {})}
                   for i, name in enumerate(CYCLES, 1)],
        "workItems": items,
        "relations": [
            {"type": "blocks", "fromId": dependency, "toId": item["id"]}
            for item in items for dependency in item["dependsOnIds"]
        ],
        "implementationOrder": order,
    }
    destination = ROOT / "docs/backlog.json"
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert destination.exists() and destination.read_text() == serialized, "Run npm run backlog:export and include its output"
    else:
        destination.write_text(serialized)
    print(f"Validated {len(items)} work items, {len(MODULES)} modules, "
          f"{len(CYCLES)} cycles, {len(data['relations'])} dependencies.")


if __name__ == "__main__":
    export()
