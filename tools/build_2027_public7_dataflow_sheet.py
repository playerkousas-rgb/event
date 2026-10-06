#!/usr/bin/env python3
"""Build the 2027 public-audience output-page review Sheet.

Each audience has one tab.  The four columns are intentionally compact:
final activity-day output page, the matching master/child update location,
central approval (if any), and the simplest input location.
"""
from __future__ import annotations

import json
from pathlib import Path

from build_2027_sheet_templates import ROOT, workbook

SOURCE = ROOT / "data" / "2027_public7_dataflow_map.json"
OUT = ROOT / "generated" / "2027_dataflow" / "ISD 2027－活動日輸出頁簽及輸入對照表（第一階段：公眾七類）.xlsx"


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    rules = [[str(i + 1), rule] for i, rule in enumerate(source["rules"])]
    audiences = source["audiences"]
    headers = [
        "A．最終輸出頁簽",
        "B．主SHEET／子SHEET更新位置",
        "C．中央批核",
        "D．輸入地方",
    ]
    sheets = [(
        "00_閱讀指引",
        "每一類公眾對象一個分頁。每列只回答四件事：對象在活動日最後看到哪個頁簽、資料在哪個主SHEET／子SHEET更新、是否要中央批核，以及資料從哪裡輸入。",
        ["規則", "說明"],
        rules + [["狀態", source["status"]], ["範圍", source["scope"]]],
    ), (
        "01_七類總覽",
        "這是索引；每個對象的最終輸出頁簽與最短輸入路徑在自己的分頁。",
        ["分頁／對象", "大組", "最終輸出頁簽數"],
        [[f"{i+2:02d}_{item['audience_name']}", item["audience_group"], len(item["flows"])] for i, item in enumerate(audiences)],
    )]
    for i, item in enumerate(audiences, start=2):
        tab_name = f"{i:02d}_{item['audience_name']}"
        rows = [[
            flow["final_output_tab"],
            flow["master_child_update_location"],
            flow["central_approval"],
            flow["input_location"],
        ] for flow in item["flows"]]
        sheets.append((
            tab_name,
            f"{item['audience_name']}在活動日的最終頁簽；只列更新位置、中央批核及最簡單的輸入地方。",
            headers,
            rows,
        ))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    workbook(OUT, sheets)
    print(OUT)


if __name__ == "__main__":
    main()
