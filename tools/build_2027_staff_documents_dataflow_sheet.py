#!/usr/bin/env python3
"""Build the review-only staff-document and working-view source workbook."""
from __future__ import annotations

import json
from pathlib import Path

from build_2027_sheet_templates import ROOT, workbook

SOURCE = ROOT / "data" / "2027_staff_documents_dataflow_map.json"
OUT = ROOT / "generated" / "2027_staff_documents_dataflow" / "ISD 2027－工作人員文件及工作視圖來源對照表（2026證據基礎）.xlsx"
HEADERS = [
    "A．最終工作人員文件／工作視圖",
    "B．2027唯一受控來源／重建位置（草案）",
    "C．中央批核（草案）",
    "D．2026已驗證來源／日後2027輸入位置",
]


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    sections = source["sections"]
    flows = [flow for section in sections for flow in section["flows"]]
    red_count = sum(flow.get("status") == "needs_user_decision" for flow in flows)
    overview = [
        ["範圍", source["scope"]],
        ["分類數", f"{len(sections)} 類工作人員文件及工作視圖，共 {len(flows)} 項 2026 實物根據輸出。"],
        ["2027 建構原則", "2027 可從零重建；每份資料、文件、工作視圖或列印輸出只設一個唯一受控資料／文件來源或 source ID。所有工作人員出口只讀取該來源，改一次即可更新所有相關出口。"],
        ["目前待決", "沒有紅色待決。2026 日期、數量、格式、版本及舊副本差異只作重構參考。" if not red_count else f"有 {red_count} 項紅色待決；只代表真實缺少來源、資料域、擁有人或必要決定。"],
        ["2026 使用方式", "唯讀證據；此表不建立同步、表單、GAS 或任何寫入。"],
    ]
    sheets = [
        (
            "00_閱讀指引",
            "由 A→D 閱讀：最後工作人員文件／視圖 → 2027唯一受控來源 → 中央批核 → 已驗證2026證據。B 欄是日後重建目標，不直接沿用 2026 或現有 MOCK。",
            ["項目", "說明"],
            overview,
            [0] * len(overview),
        ),
        (
            "01_分類總覽",
            "每一類工作人員輸出在後頁按同一四欄契約逐項說明。待決數只在真的無法建立唯一來源時才會標紅。",
            ["分頁", "工作人員文件／工作視圖類別", "輸出項目數", "待決數"],
            [[
                f"{i + 2:02d}_{section['section_name']}",
                section["section_name"],
                len(section["flows"]),
                sum(flow.get("status") == "needs_user_decision" for flow in section["flows"]),
            ] for i, section in enumerate(sections)],
            [4 if any(flow.get("status") == "needs_user_decision" for flow in section["flows"]) else 0 for section in sections],
        ),
    ]
    for i, section in enumerate(sections, start=2):
        rows = [[
            flow["final_output"],
            flow["update_location"],
            flow["central_approval"],
            flow["reference_source"],
        ] for flow in section["flows"]]
        styles = [4 if flow.get("status") == "needs_user_decision" else 0 for flow in section["flows"]]
        sheets.append((
            f"{i:02d}_{section['section_name']}",
            f"「{section['section_name']}」的 2026 實物根據，如何重建成單一 2027 受控來源。所有未標色列均已具有來源、目標來源位置及中央責任。",
            HEADERS,
            rows,
            styles,
        ))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    workbook(OUT, sheets)
    print(OUT)


if __name__ == "__main__":
    main()
