#!/usr/bin/env python3
"""Build the review-only 2026-evidence → 2027-source explanation Sheet.

This artefact does not connect Google Sheets, Drive, forms, or the app.  It
shows the proposed 2027 locations against immutable 2026 evidence so the user
can resolve missing domains and ownership before a blank live framework exists.
"""
from __future__ import annotations

import json
from pathlib import Path

from build_2027_sheet_templates import ROOT, workbook

SOURCE = ROOT / "data" / "2027_source_explanation_register.json"
OUT = ROOT / "generated" / "2027_source_explanation" / "ISD 2027－完整資料來源解釋覆核表（2026證據基礎）.xlsx"
PRIMARY_HEADERS = [
    "A．最終輸出頁簽／文件／工作視圖",
    "B．2027主SHEET／子SHEET更新位置（草案）",
    "C．中央批核（草案）",
    "D．2026已驗證來源／未來2027輸入草案",
]


def primary_rows(rows: list[dict]) -> list[list[str]]:
    return [[
        row["final_output"],
        row["update_location"],
        row["central_approval"],
        row["reference_source"],
    ] for row in rows]


def primary_row_styles(rows: list[dict]) -> list[int]:
    """Keep A/B/C/D inventory rows neutral.

    A single framework decision may affect several outputs.  Colouring every
    affected output repeats one decision as many apparent red problems.  The
    unique, genuine decisions are therefore shown once only in 07_缺口及待決.
    """
    return [0] * len(rows)


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    outputs = source["outputs"]
    reference = source["boundary"]
    overview = [
        ["2026 封存參考", f"{reference['reference_file']}｜SHA-256: {reference['reference_sha256']}"],
        ["不可跨越的界線", reference["rule"]],
        ["2027 建構原則", "2027 可從零新建。每項資料或文件只建立一個 2027 唯一受控來源；所有輸出只讀取該來源／來源 ID，不複製成平行版本。日後只改該來源一次，即更新所有相關輸出。"],
        ["公眾七類", f"{len(source['public_seven'])} 個對象分頁；已在獨立四欄表覆核。"],
        ["工作人員執行手冊", f"{len(source['execution_manual'])} 個手冊頁簽。"],
        ["完整輸出盤點", f"{len(outputs)} 個 2026 實物根據輸出：公眾 {sum(r['audience']=='public' for r in outputs)}、工作人員 {sum(r['audience']=='staff' for r in outputs)}、部門／中心 {sum(r['audience']=='dept' for r in outputs)}。"],
        ["已知缺口／錯漏", f"{len(source['gaps'])} 項；全部集中在 07_缺口及待決，不混入四欄主表。"],
        ["本階段用途", "只作對話覆核及補漏；尚未建立 live 表單、同步、GAS 或 2027 真實空白框架。"],
        ["逐類覆核狀態", "公眾七類、工作人員執行手冊、公眾文件及入口、工作人員文件及工作視圖、部門中心及內部輸出均已完成 2026 證據逐項覆核，現時沒有紅色待決。下一步只可在確認沒有遺漏後，於下一個對話建立 2027-owned sources 與輸出連通。"],
        ["未標色的 2026 差異", "版本、格式、數字或舊文件差異只作重構參考；統一來源後自然結構化，並非本輪阻塞問題。"]
    ]
    public_rows = [r for r in outputs if r["audience"] == "public"]
    staff_rows = [r for r in outputs if r["audience"] == "staff"]
    dept_rows = [r for r in outputs if r["audience"] == "dept"]
    gap_rows = [["🔴 結構待決", "整體框架", question, "2027 空白框架前必須確認"] for question in source["structural_questions"]]
    gap_styles = [4] * len(gap_rows)
    for gap in source["gaps"]:
        gap_rows.append([
            "參考差異／待後續整理",
            gap["output"],
            gap["detail"],
            gap["source"],
        ])
        gap_styles.append(0)
    sheets = [
        (
            "00_閱讀指引",
            "由 A→D 閱讀：最終輸出 → 2027更新位置（草案）→ 中央批核（草案）→ 2026已驗證來源／未來輸入草案。2026 是唯讀證據，不是 2027 的 live source。",
            ["項目", "說明"],
            overview,
            [0] * len(overview),
        ),
        (
            "01_公眾七類",
            "七類公眾對象已另有逐頁四欄表；本頁只作完整來源解釋的索引，不重複展開。",
            PRIMARY_HEADERS,
            primary_rows(source["public_seven"]),
            primary_row_styles(source["public_seven"]),
        ),
        (
            "02_工作人員手冊",
            "執行手冊的全部頁簽：每頁在 2027 應從哪個主SHEET／子SHEET讀取，以及其 2026 已驗證依據。",
            PRIMARY_HEADERS,
            primary_rows(source["execution_manual"]),
            primary_row_styles(source["execution_manual"]),
        ),
        (
            "03_公眾文件及入口",
            "除七類活動日頁簽以外，2026 有實物根據的公眾通知、入口、地圖、通告及公開輸出。",
            PRIMARY_HEADERS,
            primary_rows(public_rows),
            primary_row_styles(public_rows),
        ),
        (
            "04_工作人員文件及視圖",
            "工作人員公開文件、手冊補充內容及活動日工作視圖；私隱資料仍只在授權視圖顯示。",
            PRIMARY_HEADERS,
            primary_rows(staff_rows),
            primary_row_styles(staff_rows),
        ),
        (
            "05_部門中心及內部輸出",
            "部門及中心的受控輸出、列印件及內部視圖。此頁是後續建立空白 2027 框架前的完整來源解釋。",
            PRIMARY_HEADERS,
            primary_rows(dept_rows),
            primary_row_styles(dept_rows),
        ),
        (
            "06_同源資料流向",
            "用於找出同一份資料會餵給哪些不同出口；這不是另一套資料來源。",
            ["2026已驗證同源資料", "流向的最終輸出", "2027 canonical domain（草案）", "2027處理規則"],
            [[
                row["source"], row["feeds"], row["future_domain"],
                "只建立一份受控2027紀錄；其他頁簽讀取／發布，不另建副本。",
            ] for row in source["source_clusters"]],
        ),
        (
            "07_缺口及待決",
            "只保留 2026 資料品質及重構參考差異；目前沒有需要先由用戶／負責組決定的紅色結構待決。", 
            ["類型", "受影響輸出／範圍", "缺口或待決事項", "2026證據／處理原因"],
            gap_rows,
            gap_styles,
        ),
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    workbook(OUT, sheets)
    print(OUT)


if __name__ == "__main__":
    main()
