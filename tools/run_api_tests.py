import json, random, subprocess, sys, os
from datetime import datetime

BASE = 'https://clearanceiq.pages.dev'
SEED = 20260620
random.seed(SEED)
RESP = os.path.join(os.path.dirname(__file__), 'ciq_resp.json')

def run(method, endpoint, params=None, headers=None, json_body=None):
    url = BASE + endpoint
    if params:
        q = '&'.join(f'{k}={v}' for k, v in params.items() if v is not None)
        if q:
            url += '?' + q
    cmd = ['curl', '-sS', '-o', RESP, '-w', '\n%{http_code}', '-X', method, url]
    if headers:
        for k, v in headers.items():
            cmd += ['-H', f'{k}: {v}']
    if json_body:
        cmd += ['-H', 'content-type: application/json', '-d', json.dumps(json_body)]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    out = (p.stdout or '').strip().splitlines() or ['']
    code = int(out[-1]) if out[-1].isdigit() else 0
    try:
        data = json.loads(open(RESP).read().strip())
    except Exception:
        raw = open(RESP).read().strip() if os.path.exists(RESP) else (p.stderr or '').strip()
        data = {'raw': raw[:200]}
    return code, data

# 1) Diagnostics: GET then POST auth
print('=== DIAGNOSTICS ===')
s, d = run('GET', '/api/auth')
print('GET /api/auth status', s)
print(str(d)[:300])

s, d = run('POST', '/api/auth', json_body={'email': 'qa+' + str(SEED) + '@example.com'})
print('POST /api/auth status', s)
print(str(d)[:500])

# 2) Obtain a key if possible
KEY = None
if isinstance(d, dict) and d.get('key'):
    KEY = d['key']
elif isinstance(d, dict) and d.get('ok') and d.get('message') and 'Key already issued' in d['message']:
    # some flows return existing key
    KEY = d.get('key')

# 3) Build deterministic test set
HTS = [
    ("loudspeaker", "8518"), ("speaker", "8518"), ("headphones", "8518"), ("earphones", "8518"),
    ("smartphone", "8517"), ("phone", "8517"), ("shoe", "6402"), ("shoes", "6402"),
    ("footwear", "6402"), ("plastic", "3926"), ("bolt", "7318"), ("screw", "7318"),
    ("toy", "9503"), ("furniture", "9403"), ("hair dryer", "8516"), ("bicycle", "9506"),
    ("led", "9013"), ("glassware", "7013"), ("swimwear", "6211"), ("contact lens", "9001"),
    ("filter", "8421"), ("tire", "4011"), ("golf cart", "8703"), ("cosmetic", "3304"),
    ("makeup", "3304"), ("display", "9013"), ("cabinet", "9403"), ("desk", "9403"),
    ("fastener", "7318"), ("wheel", "4011"), ("tyre", "4011"), ("optical", "9001"),
    ("bikini", "6211"), ("cycle", "9506"), ("blower", "8516"), ("polymer", "3924"),
    ("light", "9013"), ("mobile", "8517"), ("glass", "7013"),
]
MORE = [("q{i}".format(i=i), "") for i in range(len(HTS), 108)]
HTS = HTS + MORE
random.shuffle(HTS)
HTS = HTS[:100]

DUTY = []
for v in [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000]:
    for f in [0, 50, 200, 1200, 5000]:
        for h in ["3926", "6402", "8518", "8517", "7318"]:
            DUTY.append((v, f, h))
random.shuffle(DUTY)
DUTY = DUTY[:100]

BOND = []
for t in ["single", "continuous"]:
    for v in [10000, 25000, 50000, 100000, 250000, 500000]:
        for r in [1.0, 1.2, 1.5, 2.0, 2.5]:
            BOND.append((t, v, r))
random.shuffle(BOND)
BOND = BOND[:100]

results = {"hts": [], "duty": [], "bond": []}
headers = {'X-API-Key': KEY} if KEY else {}

for q, expected_prefix in HTS:
    s, d = run('GET', '/api/v1/hts', params={'q': q}, headers=headers)
    ok = False
    if isinstance(d, dict):
        if d.get('ok') and (not expected_prefix or str(d.get('code', '')).startswith(expected_prefix)):
            ok = True
        elif not d.get('ok') and d.get('error') in ('no_match', 'q required'):
            ok = True
    results['hts'].append({'q': q, 'status': s, 'ok': ok, 'resp': d, 'expected': expected_prefix})

for value, freight, hts in DUTY:
    s, d = run('GET', '/api/v1/duty-calc', params={'value': value, 'freight': freight, 'hts': hts}, headers=headers)
    ok = isinstance(d, dict) and d.get('ok') and 'landed' in d
    results['duty'].append({'params': f'value={value}&freight={freight}&hts={hts}', 'status': s, 'ok': ok, 'resp': d})

for btype, value, risk in BOND:
    s, d = run('GET', '/api/v1/bond', params={'type': btype, 'value': value, 'risk': risk}, headers=headers)
    ok = isinstance(d, dict) and d.get('ok') and 'premium' in d
    results['bond'].append({'params': f'type={btype}&value={value}&risk={risk}', 'status': s, 'ok': ok, 'resp': d})

summary = {}
for key, rows in results.items():
    total = len(rows)
    passes = sum(1 for r in rows if r['ok'])
    summary[key] = {'total': total, 'pass': passes, 'fail': total - passes, 'pass_rate': round(passes / max(total, 1), 4)}

print('\n=== TEST SUMMARY ===')
print(json.dumps({"generated_at": datetime.utcnow().isoformat() + "Z", **summary}, indent=2))

for key in ['hts', 'duty', 'bond']:
    fails = [r for r in results[key] if not r['ok']][:20]
    if fails:
        print(f'\n=== {key.upper()} FAILURES (first 20) ===')
        for r in fails:
            print(json.dumps(r, default=str)[:500])
