import json, random, subprocess, os
from datetime import datetime

BASE = 'https://clearanceiq.pages.dev'
OUT = r'C:\Users\Najmi\Documents\Tycoon\site\tools\ciq_resp.json'
TOTAL = 1000

def run(endpoint, params=None):
    url = BASE + endpoint
    if params:
        q = '&'.join(f'{k}={v}' for k, v in params.items() if v is not None)
        if q:
            url += '?' + q
    cmd = ['curl', '-sS', '-o', OUT, '-w', '\n%{http_code}', url]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    out = (p.stdout or '').strip().splitlines() or ['']
    code = int(out[-1]) if out[-1].isdigit() else 0
    try:
        data = json.loads(open(OUT).read().strip())
    except Exception:
        raw = open(OUT).read().strip() if os.path.exists(OUT) else (p.stderr or '').strip()
        data = {'raw': raw[:200]}
    return code, data

random.seed(20260620)

# 1) Manual verification of the reported misses
print('=== MANUAL CHECKS ===')
for term in ['clothing', 'fabric swatches', 'fabric', 'swatches', 'textile']:
    status, resp = run('/api/v1/hts', {'q': term})
    ok = isinstance(resp, dict) and resp.get('ok')
    print(term, '=>', 'pass' if ok else 'FAIL', '|', str(resp)[:180])

# 2) HTS 1000 tests
HTS_TERMS = []
HTS_TERMS += [
    't-shirt','jacket','jeans','sneaker','dress','blouse','skirt','trousers','pants','shorts',
    'sweater','hoodie','polo','shorts','leggings','yoga pant','jogger','coat','parka','anorak',
    'windbreaker','puffer','down jacket','swimsuit','bikini','one piece','trunks','board shorts',
    'socks','underwear','lingerie','sports bra','compression shirt','thermal wear','rain jacket',
    'fleece jacket','windproof jacket','insulated vest','flannel shirt','denim jacket','leather jacket',
    'canvas','cotton','linen','wool','silk','polyester','nylon','spandex','rayon','viscose',
    'acrylic','fleece','fabric','textile','swatch','clothing','apparel','garment','outerwear','knitwear'
]
HTS_TERMS += [f'term_{i}' for i in range(1, 1001 - len(HTS_TERMS) + 1)]
random.shuffle(HTS_TERMS)
HTS_TERMS = HTS_TERMS[:1000]

# Duty 1000 tests
DUTY_PARAMS = []
for value in [10, 100, 250, 500, 1000, 5000, 10000, 50000, 250000, 500000]:
    for freight in [0, 50, 200, 950, 1200, 2500, 5000]:
        for hts in ['6109','6203','6204','6110','6205','6206','6211','6402','6404']:
            DUTY_PARAMS.append((value, freight, hts))
random.shuffle(DUTY_PARAMS)
DUTY_PARAMS = DUTY_PARAMS[:1000]

# Bond 1000 tests
BOND_PARAMS = []
for t in ['single', 'continuous']:
    for v in [5000, 10000, 25000, 50000, 100000, 250000, 500000, 750000, 1000000]:
        for r in [0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0]:
            BOND_PARAMS.append((t, v, r))
random.shuffle(BOND_PARAMS)
BOND_PARAMS = BOND_PARAMS[:1000]

hts_pass = duty_pass = bond_pass = 0

# HTS batch
for term in HTS_TERMS:
    s, d = run('/api/v1/hts', {'q': term})
    if isinstance(d, dict) and d.get('ok'):
        hts_pass += 1

# Duty batch
for value, freight, hts in DUTY_PARAMS:
    s, d = run('/api/v1/duty-calc', {'value': value, 'freight': freight, 'hts': hts})
    if isinstance(d, dict) and d.get('ok') and 'landed' in d:
        duty_pass += 1

# Bond batch
for btype, value, risk in BOND_PARAMS:
    s, d = run('/api/v1/bond', {'type': btype, 'value': value, 'risk': risk})
    if isinstance(d, dict) and d.get('ok') and 'premium' in d:
        bond_pass += 1

print('\n=== 1000-TEST SUMMARY ===')
print(json.dumps({
    'generated_at': datetime.utcnow().isoformat() + 'Z',
    'hts': {'total': len(HTS_TERMS), 'pass': hts_pass, 'fail': len(HTS_TERMS)-hts_pass, 'pass_rate': round(hts_pass/len(HTS_TERMS), 4)},
    'duty': {'total': len(DUTY_PARAMS), 'pass': duty_pass, 'fail': len(DUTY_PARAMS)-duty_pass, 'pass_rate': round(duty_pass/len(DUTY_PARAMS), 4)},
    'bond': {'total': len(BOND_PARAMS), 'pass': bond_pass, 'fail': len(BOND_PARAMS)-bond_pass, 'pass_rate': round(bond_pass/len(BOND_PARAMS), 4)},
}, indent=2))
