#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_2026_freeze.py — ISD2026 活動前資料凍結整備（2026-10-03）
由三份權威 Google Drive 來源重新整出 APP 內建資料：
  ① ISD2026 Org Chart and Contact List（持續更新）.xlsx → staff.contacts / org_chart
  ② ISD2026 攤位資料.xlsx「2026」→ activities.booths + js/00-config.js BOOTH_ZONES_2026
  ③ 旅團報名人數_2026 as 26.9.2026.xls「參加旅團確認書」+「name list」 → participants / troop_checkin / roster_seed
另寫入：典禮（司儀稿內嵌全文、出席變動移除、其他制服團體移入典禮、檢閱路線標題清理）、
危機手冊連結、場地圖／遊戲卡連結、Drive Sheet 來源 ID 更新。
只改 data/isd_2026.json 同 js/00-config.js（BOOTH_ZONES_2026 塊）；唔郁任何其他程式碼。
"""
import json, re, openpyxl, xlrd
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GD = ROOT / 'google_drive'

def S(v):
    if v is None: return ''
    return str(v).strip()

def eq_clean(v):
    """物資欄：數字→int；'／','/' 或空→''；其他字串保留（如 13A x 2）"""
    s = S(v).replace('\n', ' ')
    if s in ('', '／', '/'): return ''
    try:
        f = float(s); return int(f) if f == int(f) else f
    except ValueError:
        return s

def short_unit(v):
    """負責單位：截走換行後的時間註記（例 '…(ICTU)\n11:00前完成setup'→'…(ICTU)'）"""
    return S(v).split('\n')[0].strip()

# ══ ① staff.contacts + org_chart（行政組權威來源）═══════════════════════════
wb = openpyxl.load_workbook(GD / 'ISD2026 Org Chart and Contact List（持續更新）.xlsx', data_only=True)
ws = wb['聯絡表 2026']
contacts = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None and row[3] is None: continue
    contacts.append({
        'group_name': S(row[0]), 'level': S(row[1]), 'role_title': S(row[2]),
        'name': S(row[3]), 'contact': S(row[4]), 'email': S(row[5]),
    })
print('contacts:', len(contacts))

ws = wb['組織架構圖']
# 由 6 個分組逐格讀（職位行在名稱行之上）
def block(rows, cols, group, level):
    out = []
    for r0, r1 in rows:          # (職位行, 名稱行)
        for c in cols:
            title = S(ws.cell(r0, c).value)
            name = S(ws.cell(r1, c).value).replace('\n', ' ')
            if not title: continue
            if title in ('?', '？'): continue
            title = title.replace('\n', '')
            out.append({'level': f'{group} (Level {level})', 'title': title, 'names': name})
    return out
B = (1, 3); D = (2, 5); F = (3, 13)  # 顧問團 cols 2-3
oc = []
oc += block([(3, 4)], range(2, 4), '顧問團', 1)
oc += block([(6, 7)], range(2, 3), '主席及執行副主席', 1)
oc += block([(9, 10)], range(2, 3), '主席及執行副主席', 1)
oc += block([(3, 4), (6, 7)], [4, 6, 8, 9, 10, 11], '會操及典禮組', '3-5')
oc += block([(9, 10)], [4, 6, 8, 9, 10, 11, 12], '主題節目組', '3-5')
oc += block([(12, 13)], [4, 6, 8, 9, 10, 11], '品牌推廣組', '3-5')
oc += block([(15, 16)], [4, 6, 8, 9, 10], '嘉賓接待組', '3-5')
oc += block([(18, 19), (21, 22)], [4, 6, 8, 9, 10, 11], '協調組', '3-5')
oc += block([(24, 25)], [4, 6, 8, 9, 10, 12], '服務及發展組', '3-5')
oc += block([(27, 28), (30, 31)], [4, 6, 8, 9, 10], '行政組', '3-5')
# 修正 level 標記（照既有 JSON level 字串）
LV = {'會操及典禮組': (('總主任', 4),), '主題節目組': (('總主任', 4),), '品牌推廣組': (('總主任', 4),),
      '嘉賓接待組': (('總主任', 4),), '協調組': (('總主任', 4),), '服務及發展組': (('總主任', 4),),
      '行政組': (('總主任', 4),)}
for o in oc:
    g, _ = o['level'].split(' (Level ')
    if g in LV:
        o['level'] = f"{g} (Level 4)" if o['title'].startswith('總主任') else f"{g} (Level 5)"
    if '副主席' in o['title']:
        o['level'] = f"{g} (Level 3)"
# 司儀統籌合併名字已在格內（范紫晴,林卓衡）；規一化逗號
for o in oc:
    o['names'] = o['names'].replace(',', '、')
print('org_chart rows:', len(oc))

# ══ ② booths + BOOTH_ZONES_2026 ════════════════════════════════════════════
wb2 = openpyxl.load_workbook(GD / 'ISD2026 攤位資料.xlsx', data_only=True)
ws2 = wb2['2026']
booth_rows = []
cur = {'zone': '', 'theme': ''}
for r in range(2, 75):
    zone = S(ws2.cell(r, 2).value)
    no = S(ws2.cell(r, 3).value)
    unit = S(ws2.cell(r, 11).value)
    if not no and not unit: continue
    # 行 43-47 係落選／退出備註（冇編號或 '已回覆未能幫忙'）→ skip 非數字編號
    try:
        no_int = int(float(no))
    except (ValueError, TypeError):
        continue
    if zone: cur['zone'] = zone
    theme = S(ws2.cell(r, 4).value)
    if theme: cur['theme'] = theme
    booth_rows.append({
        'zone': cur['zone'], 'no': no_int, 'theme': cur['theme'],
        'unit_raw': unit, 'unit': short_unit(unit),
        'lunch': S(ws2.cell(r, 12).value), 'staff': S(ws2.cell(r, 13).value),
        'contact_main': S(ws2.cell(r, 15).value),          # 聯絡人
        'contact_person': S(ws2.cell(r, 16).value).replace('\n', ' '),  # 攤位負責人及電話
        'booth_name': S(ws2.cell(r, 17).value).replace('\n', ' '),
        'content': S(ws2.cell(r, 18).value).replace('\n', ' '),
        'fif15': S(ws2.cell(r, 19).value).replace('\n', ' '),
        'eq_tent': eq_clean(ws2.cell(r, 21).value), 'eq_table': eq_clean(ws2.cell(r, 22).value),
        'eq_chair': eq_clean(ws2.cell(r, 23).value), 'eq_skirt': eq_clean(ws2.cell(r, 24).value),
        'eq_power': eq_clean(ws2.cell(r, 25).value).replace('⏎', ' ') if isinstance(eq_clean(ws2.cell(r, 25).value), str) else eq_clean(ws2.cell(r, 25).value),
        'other_req': S(ws2.cell(r, 26).value).replace('\n', '⏎'),
        'delivery': S(ws2.cell(r, 27).value).replace('\n', ' '),
        'extra': S(ws2.cell(r, 28).value).replace('\n', ' '),
    })
print('booth rows:', len(booth_rows), '| zones:', {z['zone'] for z in booth_rows})

# 2026 Staff List：每攤位工作人員名單（攤位名→人名）
ws3 = wb2['2026 Staff List']
staff_by_booth = {}
def norm_unit(s):
    return re.sub(r'[\s\-／]+', '', S(s))
for r in range(2, 60):
    key = norm_unit(ws3.cell(r, 4).value)
    if not key: continue
    names = []
    for c in range(10, ws3.max_column + 1):
        n = S(ws3.cell(r, c).value)
        if n and n not in ('/', '／'): names.append(n)
    staff_by_booth[key] = names

# ══ ③ troops（旅團報名人數_2026）═══════════════════════════════════════════
rb = xlrd.open_workbook(str(GD / '旅團報名人數_2026 as 26.9.2026.xls'))
cf = rb.sheet_by_name('參加旅團確認書')
nl = rb.sheet_by_name('name list')
area_map = {'CHW': 'CHW 柴灣區', 'HKN': 'HKN 港島北區', 'HKS': 'HKS 港島南區', 'HKW': 'HKW 港島西區',
            'SKW': 'SKW 筲箕灣區', 'VIC': 'VIC 維多利亞城區', 'WCH': 'WCH 灣仔區', 'HKIR': 'HKIR 港島地域'}
troop_checkin, participants, meal_seed = [], [], []
meal_by_no = {}
for r in range(1, nl.nrows):
    no = nl.cell_value(r, 1)
    if not no: continue
    meal_by_no[int(no)] = int(nl.cell_value(r, 13) or 0)
for r in range(1, cf.nrows):
    no = cf.cell_value(r, 0)
    if not no: continue
    no = int(no)
    unit, area = S(cf.cell_value(r, 1)), S(cf.cell_value(r, 2))
    head = int(cf.cell_value(r, 3) or 0)
    meal = meal_by_no.get(no, int(cf.cell_value(r, 4) or 0))
    leader = S(cf.cell_value(r, 5)); phone = S(cf.cell_value(r, 6)); email = S(cf.cell_value(r, 7))
    resp = S(cf.cell_value(r, 8)); resp_phone = S(cf.cell_value(r, 9))
    troop_checkin.append({'no': no, 'unit': unit, 'area': area, 'area_full': area_map.get(area, area),
                          'headcount': head, 'meal_boxes': meal, 'leader': leader})
    participants.append({'id': f'troop_{no:03d}', 'no': no, 'unit_name': unit, 'area': area_map.get(area, area),
                         'headcount': head, 'meal_boxes': meal, 'leader': leader,
                         'leader_phone': phone, 'leader_email': email,
                         'resp_leader': resp, 'resp_phone': resp_phone, 'notes': ''})
    if meal > 0:
        meal_seed.append({'area': area_map.get(area, area), 'unit': unit, 'section': '',
                          'qty_a': '', 'qty_b': '', 'qty_c': '', 'qty_total': meal,
                          'pickup': '', 'notes': f'旅團報名代訂 {meal} 盒'})
print('troops:', len(troop_checkin), '| total head:', sum(t['headcount'] for t in troop_checkin),
      '| meal boxes:', sum(t['meal_boxes'] for t in troop_checkin), '| meal troops:', len(meal_seed))

# ══ 更新 data/isd_2026.json ════════════════════════════════════════════════
jp = ROOT / 'data' / 'isd_2026.json'
d = json.load(open(jp))

# 1) staff
d['staff']['contacts'] = contacts
d['staff']['org_chart'] = oc
d['staff']['contact_source'] = {
    'mode': 'drive_sheet', 'name': 'ISD2026 聯絡表（行政組持續更新）',
    'drive_file_id': '1__vfReg_Hal8qXBDXaidDVvN_lRgRKcp',
    'sheet_id': '1__vfReg_Hal8qXBDXaidDVvN_lRgRKcp', 'gid': 1330364782,
    'kind': 'contact_list', 'folder': '行政組/工作人員',
    'note': '2026 凍結資料：最新組織架構圖＋聯絡表（2026-10-02 版，62 人）。'}

# 2) booths
zones = {}
for b in booth_rows: zones.setdefault(b['zone'], []).append(b)
new_booths = []
for b in booth_rows:
    z, no = b['zone'], b['no']
    phone = ''
    m = re.search(r'(\d{4}\s?\d{4}|\d\.\d{7,})', b['contact_person'])
    new_booths.append({
        'id': f'booth_{z}{no:02}', 'zone': z, 'booth_no': f'{z}{no:02}',
        'theme': b['theme'], 'group_name': b['unit'], 'booth_name': b['booth_name'] or b['unit'],
        'content': b['content'], 'contact': b['contact_main'].replace('\n', ' '),
        'contact_person': b['contact_person'],
        'lunch': b['lunch'] if b['lunch'] not in ('Nil', '／', '/') else '0',
        'staff_count': b['staff'] if b['staff'] not in ('', '／', '/') else '',
        'confirmed': 'Y',
    })
d['activities']['booths'] = new_booths
d['activities']['booth_source'] = {
    'mode': 'drive_sheet', 'name': 'ISD2026 攤位資料 — 「2026」攤位總表',
    'sheet_id': '1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle', 'gid': 1089284650,
    'drive_file_id': '1Po1UGjl1E3Q6HWlYlFqnE_tcXjblmFle', 'folder': '主題節目組',
    'updated_at': '2026-10-02', 'note': '2026 凍結資料：33 攤位，A-F 分區；午餐 173 盒、工作人員 193 人。'}
d['activities']['maps'] = [{
    'id': 'map_2026', 'title': '附件2_參加旅團場地指示圖2026 v2',
    'description': '香港警察學院 2026 場地指示圖（官方最新版 v2）。', 'file_name': '附件2_參加旅團場地指示圖2026 v2.pdf',
    'file_url': 'https://drive.google.com/file/d/1cDfA0sP0efL4KslEENXSXkUs5N8hTQb4/view', 'file_data': '',
    'created_by': '行政組', 'created_at': '2026-10-02'}]
d['activities']['gameCards'] = [{
    'id': 'gc_2026', 'title': '港島童軍繽紛日 2026 遊戲卡',
    'description': 'Game card-P：參加者攞 ACTIVE／HEALTHY 遊戲卡到各攤位集印花。', 'file_name': 'Game card-P.pdf',
    'file_url': 'https://drive.google.com/file/d/1mpkBkjpusBjQNOl-wafKRrhn-1KuB-di/view', 'file_data': '',
    'created_by': '主題節目組', 'created_at': '2026-10-02'}]

# 3) participants / troop_checkin / roster_seed
#    舊 participants（4 UG 制服團體）搬入 ceremony.ug_units（第 16 項），此處換成 31 參加旅團
ug_units = []
for p in d.get('participants', []):
    if not str(p.get('id', '')).startswith('ug_'): continue
    if not p.get('attending', True): continue
    ug_units.append({'unit': p.get('unit_name', ''), 'headcount': p.get('headcount', 0),
                     'leader': p.get('leader', ''), 'role': p.get('notes', '')})
d['participants'] = participants
d['participants_source'] = {
    'mode': 'drive_sheet', 'name': '旅團報名人數_2026 as 26.9.2026（行政組）',
    'sheet_id': '1m4GUAiZb1yKZ3Wy2OoPf-Yb6RU7V9Dqw', 'gid': 1038454147,
    'drive_file_id': '1m4GUAiZb1yKZ3Wy2OoPf-Yb6RU7V9Dqw', 'folder': '行政組',
    'updated_at': '2026-09-26', 'note': '2026 凍結資料：31 參加旅團，共 1016 人；代訂餐盒 137 盒（取自 name list N 欄）。'}
d['troop_checkin'] = troop_checkin
d['roster_seed'] = {'meal_box': meal_seed}

# 4) ceremony
c = d['ceremony']
# 司儀稿內嵌全文
mc_text = json.load(open(ROOT / 'tools' / '_mc_text.json'))
ORDER = {'mc_part1': 'mc_1', 'mc_part2': 'mc_2', 'mc_part3': 'mc_3'}
for s in c['mc_scripts']:
    s['content'] = mc_text[ORDER[s['id']]]
    s['hint'] = '內文已內建，可直接在手機向下拉讀稿；「開啟 PDF」為原版檔案。'
# 檢閱路線標題清走版本註記
r = c['inspection_route']
r['title'] = '會操檢閱路線'
r['change_summary'] = ''
r['image_note'] = ''
# 出席變動 block 全刪
c.pop('attendance_changes', None)
# 其他制服團體（搬自舊 participants）
c['ug_units'] = ug_units
c['ug_source'] = {
    'mode': 'drive_sheet', 'name': '出席UG及派隊清單_2026_as at 20260929.pdf（行政組）',
    'drive_file_id': '1lv26LuB8s044j5fAYJ5qR-nN62_CO8Kv',
    'file_url': 'https://drive.google.com/file/d/1lv26LuB8s044j5fAYJ5qR-nN62_CO8Kv/view',
    'updated_at': '2026-09-29'}

# 5) crisis manual 連結（新：Risk Management Manual V1）
for m in d['crisis'].get('manuals', []):
    m['title'] = 'ISD2026 Risk Management Manual（V1, Clean）'
    m['summary'] = '更新版：活動風險管理手冊——涵蓋天氣、集體安全、急救安排、緊急撤離及危機通報程序。'
    m['file_name'] = 'ISD2026-RiskMangementManual_V1(Clean).pdf'
    m['file_url'] = 'https://drive.google.com/file/d/1BNM0C-mOXEIRel-qJCZgb0RGOXWxw0N6/preview'
    m['open_url'] = 'https://drive.google.com/file/d/1BNM0C-mOXEIRel-qJCZgb0RGOXWxw0N6/view'
    m['date'] = '2026-09-26'

jp.write_text(json.dumps(d, ensure_ascii=False, indent=2))
print('isd_2026.json rewritten, size:', jp.stat().st_size)

# ══ 6) js/00-config.js：替換 BOOTH_ZONES_2026 塊 ════════════════════════════
def jstr(s):
    return json.dumps(s, ensure_ascii=False)

lines = ['const BOOTH_ZONES_2026=[']
themes = {b['zone']: b['theme'] for b in booth_rows}
seen_theme = {}
for z in ['A', 'B', 'C', 'D', 'E', 'F']:
    units = zones.get(z, [])
    unit_js = []
    for b in units:
        devs = staff_by_booth.get(norm_unit(b['unit']), [])[-2:] if norm_unit(b['unit']) in staff_by_booth else []
        o = {'no': f"{b['no']:02}", 'name': b['unit'], 'c': 'Y', 'r': 'Y', 'cf': 'Y',
             'bn': b['booth_name'], 'ct': b['content'], 'fif15': b['fif15'], 'cp': b['contact_person'],
             'lq': b['lunch'], 'sc': b['staff']}
        eq = {'t': b['eq_tent'], 'f': b['eq_table'], 'c': b['eq_chair'], 's': b['eq_skirt'], 'e': b['eq_power']}
        eq = {k: v for k, v in eq.items() if v not in ('', '／', '/')}
        if eq: o['eq'] = eq
        if b['other_req']: o['oth'] = b['other_req']
        if b['delivery']: o['del'] = b['delivery']
        if devs: o['dev'] = '、'.join(devs)
        unit_js.append(jstr(o))
    lines.append(f"  {{zone:'{z}',theme:{jstr(themes.get(z, ''))},units:[{','.join(unit_js)}]}},")
lines.append('];')
new_block = '\n'.join(lines)

cfg = ROOT / 'js' / '00-config.js'
text = cfg.read_text()
start = text.index('const BOOTH_ZONES_2026=[')
end = text.index('];', start) + 2
cfg.write_text(text[:start] + new_block + text[end:])
print('00-config.js BOOTH_ZONES_2026 replaced; new length:', len(new_block))
print('\nALL DONE.')
