#!/usr/bin/env python3
"""Create review-only 2027 master/child Sheet templates as XLSX workbooks.

The workbooks are deliberately schema-first: fields/tabs are stable, data is empty,
and no Google Drive/Sheet integration is performed by this builder.  They are uploaded
for review before a later GS connection is enabled.
"""
from __future__ import annotations
import datetime as dt
import os
import shutil
import sys
import zipfile
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "generated" / "2027_sheet_templates"

# ── minimal OOXML writer (no third-party package) ────────────────────────────
def col_name(n: int) -> str:
    result = ""
    while n:
        n, rem = divmod(n - 1, 26)
        result = chr(65 + rem) + result
    return result


def x(v: object) -> str:
    return escape(str(v if v is not None else ""), quote=True)


def cell(col: int, row: int, value: object, style: int = 0) -> str:
    if value is None or value == "":
        return ""
    ref = f"{col_name(col)}{row}"
    return f'<c r="{ref}" t="inlineStr" s="{style}"><is><t>{x(value)}</t></is></c>'


def sheet_xml(title: str, instruction: str, headers: list[str], rows: list[list[object]], row_styles: list[int] | None = None) -> str:
    """Render a sheet, optionally applying a fill style to each data row.

    Existing template builders use the four-argument form.  Review artefacts
    may pass a fifth ``row_styles`` list to make unresolved source issues
    immediately visible without changing the data itself.
    """
    all_rows = []
    all_rows.append('<row r="1" ht="28">' + cell(1, 1, title, 1) + '</row>')
    all_rows.append('<row r="2" ht="38">' + cell(1, 2, instruction, 2) + '</row>')
    all_rows.append('<row r="3">' + ''.join(cell(i + 1, 3, h, 3) for i, h in enumerate(headers)) + '</row>')
    for index, (ridx, row) in enumerate(zip(range(4, 4 + len(rows)), rows)):
        style = row_styles[index] if row_styles and index < len(row_styles) else 0
        all_rows.append(f'<row r="{ridx}">' + ''.join(cell(i + 1, ridx, value, style) for i, value in enumerate(row)) + '</row>')
    width_count = max(1, len(headers))
    cols = ''.join(f'<col min="{i}" max="{i}" width="{min(max(15, len(str(headers[i-1])) * 1.3), 42):.1f}" customWidth="1"/>' for i in range(1, width_count + 1))
    last_col = col_name(width_count)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>{cols}</cols>
  <sheetData>{''.join(all_rows)}</sheetData>
  <autoFilter ref="A3:{last_col}3"/>
</worksheet>'''


def workbook(path: Path, sheets: list[tuple[str, str, list[str], list[list[object]]]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet_nodes = ''.join(f'<sheet name="{x(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, (name, *_rest) in enumerate(sheets, 1))
    rels = ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1))
    content_sheets = ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1, len(sheets) + 1))
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
 <fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><i/><sz val="10"/><color rgb="FF475569"/><name val="Arial"/></font></fonts>
 <fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>
 <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
 <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
 <cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/></cellXfs>
</styleSheet>'''
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>{content_sheets}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>''')
        z.writestr('_rels/.rels', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>''')
        z.writestr('xl/workbook.xml', f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{sheet_nodes}</sheets></workbook>''')
        z.writestr('xl/_rels/workbook.xml.rels', f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}<Relationship Id="rId{len(sheets)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>''')
        z.writestr('xl/styles.xml', styles)
        z.writestr('docProps/core.xml', f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>ISD 2027 system architect</dc:creator><dc:title>{x(path.stem)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>''')
        z.writestr('docProps/app.xml', f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ISD 2027 Template Builder</Application><TitlesOfParts><vt:vector size="{len(sheets)}" baseType="lpstr">{''.join(f'<vt:lpstr>{x(name)}</vt:lpstr>' for name, *_ in sheets)}</vt:vector></TitlesOfParts></Properties>''')
        for i, sheet in enumerate(sheets, 1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', sheet_xml(*sheet))

# ── canonical tables ─────────────────────────────────────────────────────────
RULE = "2027 模擬模板｜欄位鍵名、分頁、ID、版本不可更改；目前只供覆核，未接通 Google Sheet 同步。"
TABLES: dict[str, list[str]] = {
    "10_組織": ["organisation_id", "organisation_type", "organisation_name", "unit_number", "area_code", "primary_contact_person_id", "status", "source_record_id", "updated_at"],
    "11_人員": ["person_id", "display_name", "english_name", "person_type", "organisation_id", "role_title", "phone", "email", "privacy_consent", "status", "source_record_id", "updated_at"],
    "12_邀請": ["invitation_id", "entry_route_id", "recipient_person_id", "recipient_organisation_id", "invitation_status", "sent_at", "response_due_at", "secure_link_ref", "source_record_id", "updated_at"],
    "13_報名": ["registration_id", "entry_route_id", "organisation_id", "primary_person_id", "response_status", "submitted_at", "admin_status", "source_record_id", "updated_at"],
    "14_出席": ["attendance_id", "registration_id", "person_id", "organisation_id", "activity_code", "attendance_role", "youth_count", "adult_count", "companion_count", "arrival_window", "departure_window", "status", "updated_at"],
    "15_工作人員": ["staff_id", "person_id", "home_group_code", "employment_type", "availability", "meal_required", "dietary_need", "badge_status", "source_record_id", "updated_at"],
    "16_當值安排": ["assignment_id", "staff_id", "department_code", "role_code", "booth_id", "location_code", "shift_start", "shift_end", "assignment_status", "updated_at"],
    "17_攤位": ["booth_id", "zone_code", "booth_number", "theme", "booth_name", "owner_organisation_id", "lead_person_id", "status", "updated_at"],
    "18_攤位人手": ["booth_staffing_id", "booth_id", "staff_id", "person_id", "role_code", "shift_start", "shift_end", "meal_required", "status", "updated_at"],
    "19_膳食": ["meal_id", "person_id", "organisation_id", "registration_id", "meal_type", "meal_qty", "dietary_need", "distribution_location", "ticket_status", "updated_at"],
    "20_交通泊車": ["transport_id", "registration_id", "organisation_id", "transport_mode", "vehicle_type", "vehicle_plate", "vehicle_qty", "coach_qty", "parking_status", "arrival_window", "updated_at"],
    "21_典禮": ["ceremony_id", "person_id", "organisation_id", "ceremony_item_code", "award_code", "stage_order", "seat_code", "rehearsal_required", "attendance_status", "updated_at"],
    "22_報到": ["checkin_id", "person_id", "organisation_id", "registration_id", "checkin_location", "checkin_status", "checked_in_at", "badge_issued", "meal_issued", "updated_at"],
    "23_物資": ["supply_request_id", "department_code", "booth_id", "item_code", "item_name", "requested_qty", "approved_qty", "issued_qty", "delivery_location", "status", "updated_at"],
    "24_修正紀錄": ["change_id", "entity_type", "entity_id", "field_key", "old_value", "new_value", "change_reason", "changed_by", "changed_at", "source_channel"],
    "25_基本資訊": ["info_id", "audience_scope", "info_title", "info_content", "visibility", "status", "source_record_id", "updated_at"],
    "26_日程及地圖": ["schedule_map_id", "record_type", "audience_scope", "title", "start_at", "end_at", "location_code", "map_asset_id", "content", "status", "source_record_id", "updated_at"],
    "27_公告及求助": ["notice_support_id", "record_type", "audience_scope", "title", "content", "contact_role", "contact_method", "urgency", "status", "source_record_id", "updated_at"],
    "90_代碼表": ["code_set", "code", "label_zh", "label_en", "active", "sort_order", "updated_at"],
}

ROUTES = [
    ["IN01", "一般參加旅團／單位", "地域通知書內連結", "組織、報名、出席、膳食、交通", "報到／膳食／交通／場地"],
    ["IN02", "優異旅團／典禮旅團", "地域通知書內連結", "組織、報名、出席、典禮、膳食", "典禮／報到／膳食／場地"],
    ["IN03", "步操／表演隊伍", "地域通知書內連結", "組織、出席、典禮、交通", "典禮／場地／交通／報到"],
    ["IN04", "受邀嘉賓", "邀請信內專屬連結", "人員、邀請、報名、出席、膳食、交通", "嘉賓接待／典禮／膳食／交通"],
    ["IN05", "支部最高獎勵得主", "邀請信內專屬連結", "人員、邀請、典禮、出席、膳食", "典禮／嘉賓接待／報到"],
    ["IN06", "成人獎勵得主", "邀請信內專屬連結", "人員、邀請、典禮、出席、膳食", "典禮／嘉賓接待／報到"],
    ["IN07", "其他制服團體／受邀隊伍", "地域通知書內連結", "組織、報名、出席、膳食、交通", "報到／膳食／交通／場地"],
    ["IN08", "NGO／合作／攤位夥伴", "合作邀請信內連結", "組織、人員、攤位、出席、物資", "攤位／物資／場地／工作人員"],
    ["IN09", "一般工作人員／義工", "組別招募信內連結", "人員、工作人員、當值、膳食", "各組主管／膳食／派章／點名"],
    ["IN10", "攤位工作人員及人手", "攤位組指派連結", "人員、工作人員、攤位人手、物資、膳食", "攤位／物資／膳食／點名"],
]

CHILD_TEMPLATES = [
    ("01_參加單位及旅團", "參加旅團、優異旅團、步操及其他制服團體的受控來源。", [
        ("01_單位", ["source_record_id", "organisation_id", "organisation_type", "organisation_name", "unit_number", "area_code", "contact_name", "phone", "email", "template_version", "updated_at"]),
        ("02_出席", ["source_record_id", "registration_id", "organisation_id", "activity_code", "youth_count", "adult_count", "companion_count", "arrival_window", "departure_window", "status", "template_version", "updated_at"]),
        ("03_膳食", ["source_record_id", "registration_id", "organisation_id", "meal_type", "meal_qty", "dietary_need", "template_version", "updated_at"]),
        ("04_交通", ["source_record_id", "registration_id", "organisation_id", "transport_mode", "vehicle_type", "vehicle_plate", "coach_qty", "arrival_window", "template_version", "updated_at"]),
    ]),
    ("02_嘉賓獎勵及典禮對象", "嘉賓、支部最高獎勵及成人獎勵的受控來源。", [
        ("01_受邀對象", ["source_record_id", "person_id", "invitation_id", "entry_route_id", "display_name", "role_title", "organisation_name", "phone", "email", "invitation_status", "template_version", "updated_at"]),
        ("02_回覆出席", ["source_record_id", "registration_id", "person_id", "attendance_status", "companion_count", "meal_qty", "dietary_need", "transport_mode", "vehicle_plate", "template_version", "updated_at"]),
        ("03_典禮安排", ["source_record_id", "person_id", "ceremony_item_code", "award_code", "stage_order", "seat_code", "rehearsal_required", "template_version", "updated_at"]),
    ]),
    ("03_工作人員及攤位人手", "一般工作人員、義工及攤位工作人手的受控來源。", [
        ("01_工作人員", ["source_record_id", "staff_id", "person_id", "display_name", "phone", "email", "home_group_code", "employment_type", "availability", "meal_required", "dietary_need", "template_version", "updated_at"]),
        ("02_當值安排", ["source_record_id", "assignment_id", "staff_id", "department_code", "role_code", "location_code", "shift_start", "shift_end", "assignment_status", "template_version", "updated_at"]),
        ("03_攤位人手", ["source_record_id", "booth_staffing_id", "booth_id", "staff_id", "person_id", "role_code", "shift_start", "shift_end", "meal_required", "template_version", "updated_at"]),
    ]),
    ("04_攤位及主題活動", "攤位、主題活動、負責單位、流程及需求的受控來源。", [
        ("01_攤位", ["source_record_id", "booth_id", "zone_code", "booth_number", "theme", "booth_name", "owner_organisation_id", "lead_person_id", "status", "template_version", "updated_at"]),
        ("02_活動安排", ["source_record_id", "activity_code", "booth_id", "activity_name", "start_at", "end_at", "location_code", "capacity_note", "status", "template_version", "updated_at"]),
        ("03_物資需求", ["source_record_id", "supply_request_id", "booth_id", "item_code", "item_name", "requested_qty", "delivery_location", "status", "template_version", "updated_at"]),
    ]),
    ("05_典禮及會操", "典禮程序、唱名、座位、步操及綵排安排的受控來源。", [
        ("01_典禮項目", ["source_record_id", "ceremony_item_code", "ceremony_item_name", "start_at", "end_at", "location_code", "lead_person_id", "status", "template_version", "updated_at"]),
        ("02_唱名及上台", ["source_record_id", "ceremony_id", "person_id", "organisation_id", "award_code", "stage_order", "attendance_status", "template_version", "updated_at"]),
        ("03_座位及步操", ["source_record_id", "person_id", "organisation_id", "seat_code", "formation_code", "rehearsal_required", "status", "template_version", "updated_at"]),
    ]),
    ("06_場地交通及泊車", "場地、車輛、旅遊巴、泊車及動線安排的受控來源。", [
        ("01_場地", ["source_record_id", "location_code", "location_name", "zone_code", "capacity_note", "owner_department_code", "status", "template_version", "updated_at"]),
        ("02_車輛泊車", ["source_record_id", "transport_id", "registration_id", "organisation_id", "vehicle_type", "vehicle_plate", "vehicle_qty", "parking_status", "arrival_window", "template_version", "updated_at"]),
        ("03_旅遊巴", ["source_record_id", "transport_id", "organisation_id", "coach_qty", "dropoff_location", "arrival_window", "departure_window", "status", "template_version", "updated_at"]),
    ]),
    ("07_膳食物資及後勤", "餐飲、物資、配送及派發安排的受控來源。", [
        ("01_膳食", ["source_record_id", "meal_id", "person_id", "organisation_id", "registration_id", "meal_type", "meal_qty", "dietary_need", "distribution_location", "template_version", "updated_at"]),
        ("02_物資", ["source_record_id", "supply_request_id", "department_code", "booth_id", "item_code", "item_name", "requested_qty", "approved_qty", "delivery_location", "status", "template_version", "updated_at"]),
        ("03_派發", ["source_record_id", "distribution_id", "entity_type", "entity_id", "item_code", "issued_qty", "issued_at", "issued_by", "status", "template_version", "updated_at"]),
    ]),
    ("08_安全醫療及服務", "安全、醫療、服務人員及危機處理準備資料的受控來源。", [
        ("01_服務人員", ["source_record_id", "staff_id", "person_id", "service_type", "qualification", "location_code", "shift_start", "shift_end", "status", "template_version", "updated_at"]),
        ("02_安全安排", ["source_record_id", "safety_record_id", "location_code", "risk_code", "control_measure", "owner_department_code", "status", "template_version", "updated_at"]),
        ("03_緊急資源", ["source_record_id", "resource_id", "resource_type", "location_code", "contact_role", "availability", "status", "template_version", "updated_at"]),
    ]),
]


def build_master() -> None:
    overview = [
        ["狀態", "覆核模板；尚未接通 Google Sheet／Drive 同步"],
        ["唯一主資料", "此檔為所有子 Sheet 與十個受邀填寫入口的後端欄位模型。"],
        ["固定規則", "不得更改分頁、欄位鍵名、欄位次序、系統 ID 或版本欄。"],
        ["可修改", "日後受權限的資料列內容；中央更正需寫入 24_修正紀錄。"],
        ["資料來源", "受邀填寫入口直接建立記錄；各組子 Sheet 按固定映射同步；秘書處／行政組核對。"],
        ["2026 使用方式", "僅用作欄位與來源辨識；不會寫回、同步或更改 2026。"],
    ]
    dictionary_rows = []
    owner = {"10_組織":"行政／地域", "11_人員":"秘書／行政", "12_邀請":"秘書", "13_報名":"秘書／行政", "14_出席":"秘書／各相關組", "15_工作人員":"行政／各組", "16_當值安排":"各組", "17_攤位":"主題節目組", "18_攤位人手":"主題節目組／各組", "19_膳食":"後勤／膳食", "20_交通泊車":"協調／場地", "21_典禮":"會操及典禮", "22_報到":"行政／接待", "23_物資":"後勤／各組", "24_修正紀錄":"秘書／行政", "25_基本資訊":"秘書處／行政組", "26_日程及地圖":"協調組／會操及典禮組", "27_公告及求助":"秘書處／協調組／服務及發展組", "90_代碼表":"行政／系統"}
    for tab, fields in TABLES.items():
        for f in fields:
            dictionary_rows.append([tab, f, owner.get(tab, "待確認"), "必填：由入口／同步規則定義", "固定欄位，禁止改名／移位"])
    map_rows = []
    for name, _desc, tabs in CHILD_TEMPLATES:
        for tab, headers in tabs:
            map_rows.append([name, tab, ", ".join(headers), "按 source_record_id + 對應業務 ID 上傳／更新", "尚未接通"])
    sheets = [
        ("00_閱讀指引", "先覆核此工作簿的欄位與分頁；這是 2027 唯一主資料模型，尚未開啟同步。", ["項目", "說明"], overview),
        ("01_十個入口", "地域可將對應連結放入自己的邀請信；入口並非活動日公眾頻道。", ["入口ID", "入口名稱", "使用位置", "直接建立／更新", "供應結果給"], ROUTES),
        ("02_資料字典", "欄位鍵名是同步合約；只可新增經系統版本批准的欄位，不可自行更改。", ["主表", "欄位鍵名", "資料擁有人", "必填規則", "格式規則"], dictionary_rows),
        ("03_子SHEET映射", "各組子 Sheet 的可同步分頁及對應規則；空白範本放於 99_模板。", ["子SHEET", "分頁", "固定欄位", "匯入鍵", "同步狀態"], map_rows),
        ("04_同步狀態", "日後系統自動寫入同步成功、失敗、欄位版本及來源檔案；目前為空白模板。", ["sync_id", "source_sheet", "source_tab", "source_record_id", "template_version", "result", "message", "synced_at"], []),
        ("05_欄位錯誤", "日後系統拒絕格式被改或資料不完整的列；原組別依此修正。", ["error_id", "source_sheet", "source_tab", "source_record_id", "field_key", "error_code", "message", "detected_at", "resolved_at"], []),
    ]
    for tab, headers in TABLES.items():
        sheets.append((tab, RULE, headers, []))
    workbook(OUT / "ISD 2027－系統主SHEET（模擬模板）.xlsx", sheets)


def build_child(name: str, desc: str, tabs: list[tuple[str, list[str]]]) -> None:
    rules = [
        ["用途", desc],
        ["目前狀態", "2027 覆核模板；尚未接通 Google Drive／Google Sheet 同步。"],
        ["可填寫", "資料列內容。日後 APP 或 Drive 直接更新時均使用此固定格式。"],
        ["不得修改", "分頁名稱、欄位鍵名、欄位次序、source_record_id、template_version。"],
        ["同步鍵", "source_record_id 及該表的業務 ID；格式錯誤會拒絕匯入並回報來源組別。"],
        ["中央更正", "秘書處／行政組在主 Sheet 進行核對修正，保留修正紀錄。"],
    ]
    sheets = [("00_使用規則", "此範本供指定組別複製使用；固定格式是可被主 Sheet 可靠讀取的前提。", ["項目", "說明"], rules)]
    for tab, headers in tabs:
        sheets.append((tab, RULE, headers, []))
    workbook(OUT / f"ISD 2027－子SHEET範本－{name}.xlsx", sheets)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    build_master()
    for child in CHILD_TEMPLATES:
        build_child(*child)
    manifest = OUT / "README.txt"
    manifest.write_text("ISD 2027 review-only master/child Sheet templates. Generated by tools/build_2027_sheet_templates.py. No live Drive/GS sync is configured.\n", encoding="utf-8")
    print(f"Built {1 + len(CHILD_TEMPLATES)} XLSX templates in {OUT}")

if __name__ == "__main__":
    main()
