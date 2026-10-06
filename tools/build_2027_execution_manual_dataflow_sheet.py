#!/usr/bin/env python3
"""Build the review-only execution-manual page-to-source explanation Sheet.

One tab per existing execution-manual page.  Rows retain the four-column
output-first layout agreed for the public audience review.  Red is reserved
only for a source/domain decision that blocks the blank 2027 framework.
"""
from __future__ import annotations

import json
from pathlib import Path

from build_2027_sheet_templates import ROOT, workbook

SOURCE = ROOT / "data" / "2027_execution_manual_dataflow_map.json"
OUT = ROOT / "generated" / "2027_execution_manual_dataflow" / "ISD 2027－工作人員執行手冊頁簽來源對照表（2026證據基礎）.xlsx"
HEADERS = [
    "A．手冊最終頁面內容",
    "B．2027主SHEET／子SHEET更新位置（草案）",
    "C．中央批核（草案）",
    "D．2026已驗證來源／日後2027輸入位置",
]


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    pages = source["pages"]
    rules = [[str(i + 1), rule] for i, rule in enumerate(source["rules"])]
    overview = [
        ["範圍", source["scope"]],
        ["頁簽數", f"{len(pages)} 個現有工作人員執行手冊頁簽。"],
        ["待決狀態", "目前沒有紅色待決：各組工作時間、行政組危機處理手冊及秘書處活動日文件來源均已確認。"],
        ["2026 使用方式", "唯讀證據；這份表不建立同步、表單、GAS 或任何寫入。"],
    ]
    sheets = [
        (
            "00_閱讀指引",
            "每個工作人員手冊頁簽各有一頁。由 A→D 閱讀：手冊最後內容 → 2027受控更新位置 → 中央批核 → 已驗證2026來源。",
            ["項目", "說明"],
            overview,
            [0, 0, 0, 0],
        ),
        (
            "01_頁簽總覽",
            "這是九個工作人員執行手冊頁簽的索引；目前全部來源及責任已確認。",
            ["分頁", "手冊頁簽", "內容項目數", "待決數"],
            [[
                f"{i+2:02d}_{page['page_name']}",
                page["page_name"],
                len(page["flows"]),
                sum(flow.get("status") == "needs_user_decision" for flow in page["flows"]),
            ] for i, page in enumerate(pages)],
            [4 if any(flow.get("status") == "needs_user_decision" for flow in page["flows"]) else 0 for page in pages],
        ),
    ]
    for i, page in enumerate(pages, start=2):
        rows = [[
            flow["final_output"],
            flow["update_location"],
            flow["central_approval"],
            flow["reference_source"],
        ] for flow in page["flows"]]
        styles = [4 if flow.get("status") == "needs_user_decision" else 0 for flow in page["flows"]]
        sheets.append((
            f"{i:02d}_{page['page_name']}",
            f"「{page['page_name']}」內每項工作人員最後看到／使用的內容，及其唯一受控來源。現時所有列均已確認；2026 差異只作來源重構參考。", 
            HEADERS,
            rows,
            styles,
        ))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    workbook(OUT, sheets)
    print(OUT)


if __name__ == "__main__":
    main()
