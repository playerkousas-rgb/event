#!/usr/bin/env python3
"""Build the review-only public-documents source explanation workbook.

The workbook is output-first: each verified 2026 public file or intake output
is mapped to one proposed 2027 canonical source.  It makes no live connection
and does not alter the locked 2026 archive.
"""
from __future__ import annotations

import json
from pathlib import Path

from build_2027_sheet_templates import ROOT, workbook

SOURCE = ROOT / "data" / "2027_public_documents_dataflow_map.json"
OUT = ROOT / "generated" / "2027_public_documents_dataflow" / "ISD 2027－公眾文件及入口來源對照表（2026證據基礎）.xlsx"
HEADERS = [
    "A．最終公眾輸出文件／入口",
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
        ["分類數", f"{len(sections)} 類公眾文件及入口，共 {len(flows)} 項 2026 實物根據輸出。"],
        ["2027 建構原則", "2027 可從零重建；每份文件、地圖、通告或入口只設一個唯一受控來源／source ID。所有公眾出口只讀取該來源，改一次即可更新所有相關出口。"],
        ["目前待決", "沒有紅色待決。2026 日期、名額、收費、格式、版本或舊副本差異只作重構參考。" if not red_count else f"有 {red_count} 項紅色待決；只代表真實缺少來源、資料域、擁有人或必要決定。"],
        ["2026 使用方式", "唯讀證據；此表不建立同步、表單、GAS 或任何寫入。"],
    ]
    sheets = [
        (
            "00_閱讀指引",
            "由 A→D 閱讀：最後對外文件／入口 → 2027唯一受控來源 → 中央批核 → 已驗證2026證據。B 欄是日後重建目標，不直接沿用 2026 或現有 MOCK。",
            ["項目", "說明"],
            overview,
            [0] * len(overview),
        ),
        (
            "01_分類總覽",
            "每一類公眾輸出在後頁按同一四欄契約逐項說明。待決數只在真的無法建立唯一來源時才會標紅。",
            ["分頁", "公眾文件／入口類別", "輸出項目數", "待決數"],
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
