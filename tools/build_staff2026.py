#!/usr/bin/env python3
# build_staff2026.py — 由 ISD2026 staff list ver2 (FROZEN).xlsx 重建工作人員派章/膳食/點名資料 + 3 份通告
import json, re

DUMP = 'google_drive/stafflist_dump.json'
OUT  = 'data/isd_2026.json'
NOTICE1_TXT = open('google_drive/_notice1.txt').read().strip()

dump = json.load(open(DUMP))
norm = lambda s: re.sub(r'\s+', ' ', str(s or '')).strip()

# JS normalizeGroupName mirror
ORG_MAP = {'籌委會':'主席及執行副主席','管理':'顧問團','行政':'行政組','典禮及會操':'會操及典禮組',
           '主題節目':'主題節目組','品牌推廣':'品牌推廣組','嘉賓接待':'嘉賓接待組','協調':'協調組',
           '服務及發展':'服務及發展組','服務與發展':'服務及發展組','會操典禮':'會操及典禮組'}
def norm_group(g):
    g = norm(g)
    g = ORG_MAP.get(g, g)
    return g

# tab → (group col, name col, meal col, unit col, job col, booth col, remark col)
TAB_LAYOUT = {
    '其他':   dict(group=1, name=2, meal=5, unit=4, job=8, booth=None, remark=7),
    '節目':   dict(group=1, name=2, meal=5, unit=4, job=8, booth=7, remark=None),
    '會操典禮': dict(group=1, name=2, meal=5, unit=4, job=8, booth=None, remark=7),
    '服務':   dict(group=1, name=2, meal=5, unit=4, job=8, booth=None, remark=7),
    '協調':   dict(group=1, name=2, meal=6, unit=5, job=9, booth=None, remark=8),
    '行政':   dict(group=1, name=2, meal=5, unit=4, job=8, booth=None, remark=7),
}
MEAL_CODES = {'A','B','C','D','Random','Buffet','小食','小食餐盒','午餐時間無需當值',
              '嘉賓自助午餐(只限總監級/副主席)','嘉賓自助午餐(只限總監級)'}

staff = []
seen_named = {}
ph_i = 0
for tab, lay in TAB_LAYOUT.items():
    for r in dump[tab][1:]:
        if not any(norm(x) for x in r):
            continue
        def cell(i):
            try: return norm(r[i]) if i is not None and i < len(r) else ''
            except Exception: return ''
        no   = cell(0)
        grp  = cell(lay['group'])
        name = cell(lay['name'])
        meal = cell(lay['meal'])
        unit = cell(lay['unit'])
        job  = cell(lay['job'])
        booth= cell(lay['booth'])
        rem  = cell(lay['remark'])
        # skip pivot/summary rows: no number AND (meal-only pivot or 'Staff count' etc.)
        if not name and not no:
            continue
        if not name and not meal and not booth:
            continue
        if grp in ('Staff count',''):
            # still may be placeholder with booth (節目 tab keeps group col filled though)
            if not booth and not no:
                continue
        g_norm = norm_group(grp)
        if name:
            base = re.sub(r'\s+','',name)
            if base in seen_named:
                # duplicate person across tabs (rare) — merge booth/meal if missing
                idx = seen_named[base]
                if booth and not staff[idx].get('booth'): staff[idx]['booth']=booth
                if meal and not staff[idx].get('meal'): staff[idx]['meal']=meal
                if job and not staff[idx].get('job_title'): staff[idx]['job_title']=job
                if unit and not staff[idx].get('unit'): staff[idx]['unit']=unit
                continue
            entry = {'key':'sm%03d'%len(staff),'name':name,'group':g_norm,'unit':unit,
                     'meal':meal,'booth':booth,'job_title':job,'remark':rem,'placeholder':False}
            seen_named[base]=len(staff); staff.append(entry)
        else:
            ph_i += 1
            staff.append({'key':'smp%03d'%ph_i,'name':'（人選待定）%s'%(job or booth or ''),'group':g_norm,'unit':unit,
                          'meal':meal,'booth':booth,'job_title':job,'remark':rem,'placeholder':True})
print('staff rows:', len(staff), 'placeholders:', ph_i)

# summary tab → meal distribution
dist_lines = [r for r in dump['summary'][1:] if any(norm(x) for x in r)]
dist = {'staff_groups':[], 'booths':[], 'others':[], 'totals':{}}
for r in dist_lines:
    lab = norm(r[0]); hc = r[1] if len(r)>1 else None; rice = r[2] if len(r)>2 else None; snack = r[3] if len(r)>3 else None
    def num(v):
        return v if isinstance(v,(int,float)) else (norm(v) or None)
    item = {'label':lab, 'headcount':num(hc), 'rice':num(rice), 'snack':num(snack)}
    if lab in ('ST','GT') and not dist['totals']:
        pass
    if lab=='GT':
        dist['totals']={'headcount':num(hc),'rice':num(rice),'snack':num(snack)}
    elif lab=='ordered':
        dist['ordered']={'rice':norm(rice),'snack':num(snack)}
    elif re.match(r'^[A-F]\d', lab):
        dist['booths'].append(item)
    elif lab in ('社區廚房','旅團代訂','221st'):
        dist['others'].append(item)
    elif lab=='ST':
        dist.setdefault('subtotals',[]).append(item)
    else:
        dist['staff_groups'].append(item)

# para tab → meal menu（EAT 清單，2026-10-03 凍結版）
menu = ['嘉賓自助午餐(只限總監級/副主席)','嘉賓自助午餐(只限總監級)',
        'A 柱侯蘿蔔牛腩飯 配菜','B 鹹蛋蒸肉餅飯 配菜','C 滷水雞髀拼紅腸飯 配菜','D (素)翠玉瓜雲耳炒野菌',
        'Random','小食餐盒','午餐時間無需當值']

# notices（內建全文＋原檔連結）
FOOD_TEXT = """特別通告（食品捐贈）　2026年8月1日
港島童軍繽紛日2026 — 童心捐贈大行動（食品捐贈）Food Donation

「港島童軍繽紛日2026」將於10月份舉行，大會將呈獻一系列主題節目活動、「積極公民」獎章考驗、青少年參與及社區服務項目。大會將同時舉行「童心捐贈大行動（食品捐贈）」，希望參加者轉贈最少一種食品予有需要人士，以實踐童軍成員「對別人要幫助」及服務社群的承諾，同時響應香港童軍總會周年主題「百載傳承・同行未來」。

本年度受惠的社福機構為循道衛理觀塘社會服務處，他們將收集之食品轉贈社會上有需要人士，詳情如下：

參加資格：參與「港島童軍繽紛日2026」之各支部成員、家長、領袖及會務委員
收集日期：2026年10月4日（星期日）
收集時間：上午11時正至下午3時正
收集方法：由童軍旅負責領袖收集所得食品，並於收集日連同已填妥之「捐贈表格」，交回：香港黃竹坑海洋公園道18號香港警察學院「港島童軍繽紛日」食品收集攤位。

收集類別：非罐頭類別：例如已包裝的食米（1-2公斤）、粉麵類（如：上海麵、米粉、粉絲、公仔麵或通心粉等）、餅乾類、非玻璃容器的食油（如：花生油、粟米油、芥花籽油或橄欖油等）、燕麥片、湯料（中藥材類）等。

捐贈指引：
1. 基於食物質量及安全考慮，已拆封或損毀之食品、已變質或變壞的食品、沒有商標標貼的食品，散裝食米、熟食及奶類製品，均不接受；
2. 餅乾類食品須以盒裝或袋裝為單位；
3. 食品的最佳食用日期必須為2027年6月1日或之後；
4. 每件食品重量須為75克或以上，並須印有獨立食品標籤及最佳食用日期，方作計算。

獎勵：
1. 為鼓勵參加者踴躍捐贈，所有參與食品捐贈的參加者，均可獲贈「港島童軍繽紛日2026－童心捐贈大行動（食品捐贈）」紀念章乙枚以作紀念；
2. 凡捐贈超過200件食物之人士／單位，將獲頒發特別紀念章及感謝狀；
3. 紀念章於收集日當日按捐贈表格之捐贈者名單派發。

備註：當日同場舉行物品回收活動，歡迎參加者捐贈合規格的物品，有關「童心捐贈大行動（物品回收）」之詳情，請參閱相關特別通告。
查詢：如有任何查詢，請致電 2835 7714 與發展幹事鄧倩姸女士聯絡。
地域總監（何家騏　代行）"""

GOODS_TEXT = """特別通告（物品回收）　2026年8月1日
港島童軍繽紛日2026 — 童心捐贈大行動（物品回收）Goods Donating

「港島童軍繽紛日2026」將於10月份舉行，大會將呈獻一系列主題節目活動、「積極公民」獎章考驗、青少年參與及社區服務項目。大會將同時舉行「童心捐贈大行動（物品回收）」，希望參加者轉贈物品予有需要人士，以實踐童軍成員「對別人要幫助」及服務社群的承諾，同時響應香港童軍總會周年主題「百載傳承・同行未來」。

本年度受惠的社福機構為國際十字路會，他們將回收物品轉贈予本地或海外有需要人士，詳情如下：

參加資格：參與「港島童軍繽紛日2026」之各支部成員、家長、領袖及會務委員
收集日期：2026年10月4日（星期日）
收集時間：上午11時正至下午3時正
收集方法：由童軍旅負責領袖收集所得物品，並於收集日連同已填妥之「捐贈表格」，交回：香港黃竹坑海洋公園道18號香港警察學院「港島童軍繽紛日」物品回收攤位。

收集類別：
1. 電腦相關用品：滑鼠、鍵盤、電腦顯示器、手提電腦充電用品（全新或狀態良好）；
2. 具教育意義玩具：如樂高積木「Lego」；
3. 全新的學校文具；
4. 狀態良好的英語兒童讀物書本。

獎勵：
1. 為鼓勵參加者踴躍捐贈，所有參與捐贈物品的參加者，均可獲贈「港島童軍繽紛日2026－童心捐贈大行動（物品回收）」紀念章乙枚以作紀念；
2. 凡捐贈學校文具以10件為1個單位，才獲發紀念章乙枚；
3. 紀念章於收集日當日按捐贈表格之捐贈者名單派發。

備註：當日同場舉行食品收集活動，歡迎參加者捐贈合規格的食物，有關「童心捐贈大行動（食品捐贈）」之詳情，請參閱相關特別通告。
查詢：如有任何查詢，請致電 2835 7714 與發展幹事鄧倩姸女士聯絡。
地域總監（何家騏　代行）"""

notices = [
    {'id':'notice_main_2026','title':'特別通告第12/26號 — 港島童軍繽紛日2026（活動詳情）','no':'12/26','date':'2026-07-01',
     'category':'通告','drive_id':'1rmV3zqrBex803aiyjrf20QddudOBoTFf',
     'drive_url':'https://drive.google.com/file/d/1rmV3zqrBex803aiyjrf20QddudOBoTFf/view',
     'summary':'日期、地點、時間、名額 2,000 人、費用 $10、報名辦法、代訂餐盒、紀念品、交通、服裝、截止 9月11日及惡劣天氣延期安排（10月11日）。',
     'text':NOTICE1_TXT},
    {'id':'notice_food_2026','title':'特別通告 — 童心捐贈大行動（食品捐贈）Food Donation','no':'','date':'2026-08-01',
     'category':'通告','drive_id':'1AXsmbK59MFz-ODLtZ-ysgvW2RcF8mu7j',
     'drive_url':'https://drive.google.com/file/d/1AXsmbK59MFz-ODLtZ-ysgvW2RcF8mu7j/view',
     'summary':'受惠機構：循道衛理觀塘社會服務處。收集非罐頭食品，10月4日 11:00–15:00 香港警察學院食品收集攤位，捐贈者獲紀念章。',
     'text':FOOD_TEXT},
    {'id':'notice_goods_2026','title':'特別通告 — 童心捐贈大行動（物品回收）Goods Donating','no':'','date':'2026-08-01',
     'category':'通告','drive_id':'1WbfGCy90Pkau6TLNg9J_DdohEqPzdknQ',
     'drive_url':'https://drive.google.com/file/d/1WbfGCy90Pkau6TLNg9J_DdohEqPzdknQ/view',
     'summary':'受惠機構：國際十字路會。回收電腦用品、教育玩具（Lego）、全新文具、英語兒童讀物，10月4日 11:00–15:00 香港警察學院物品回收攤位。',
     'text':GOODS_TEXT},
]

# meals（人員級膳食表）— 覆蓋舊 meals[]：直接用 group tab 資料（含 placeholder 佔位）
meals = []
for e in staff:
    if not e['meal'] or e['meal']=='午餐時間無需當值':
        continue
    meals.append({'id':e['key'],'name':e['name'],'group':e['group'],'meal':e['meal'],'booth':e.get('booth') or '',
                  'unit':e.get('unit') or '','placeholder':e['placeholder'],'source':'ISD2026 staff list ver2 (FROZEN)'})

d = json.load(open(OUT))
d['notices'] = notices
d['staff_meals_2026'] = staff          # 工作人員膳食／派章共用名單（所有組別，含佔位）
d['meal_menu_2026'] = menu             # 餐單
d['meal_distribution_2026'] = dist     # 派發統計（組別／攤位／其他）
d['meals'] = meals                     # 人員級膳食紀錄
d['souvenirs'] = {**(d.get('souvenirs') if isinstance(d.get('souvenirs'),dict) else {}),
                  'staff_roster_2026': [ {k:v for k,v in e.items() if k!='meal'} for e in staff ],
                  'source_2026': {'name':'ISD2026 staff list ver2 (FROZEN).xlsx','drive_file_id':'1rCkHJ4fZdNSb_-RkM969BeBZAq7GDq3n','frozen':True,
                                   'note':'派章工作人員名單：全部組別（顧問團、品牌推廣、嘉賓接待、秘書處、救傷、會操及典禮、主題節目、服務及發展、協調、行政），含人數佔位（人選待定）。'}}
d['data_version'] = '2026-10-03T11:00:00Z-v12-staff-meals-notices'
json.dump(d, open(OUT,'w'), ensure_ascii=False, indent=1)
print('staff_groups in roster:', sorted({e['group'] for e in staff}))
print('menu:', menu)
print('dist staff_groups:', len(dist['staff_groups']), 'booths:', len(dist['booths']))
print('notices:', [n['id'] for n in notices])
print('OK — JSON updated')
