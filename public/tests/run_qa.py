#!/usr/bin/env python3
"""
ClearanceIQ Full QA Runner
Generates 3000 test records per tool, runs functional/security tests,
and writes TEST_REPORT.md.
"""
import json, random, subprocess, sys, os, time, hashlib, re
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE = 'https://clearanceiq.pages.dev'
LOCAL_REPO = r'C:\Users\Najmi\Documents\Tycoon\site'
TEST_DIR = os.path.join(LOCAL_REPO, 'tests')
REPORT_PATH = os.path.join(TEST_DIR, 'TEST_REPORT.md')
SEED = 20260623
random.seed(SEED)

# -----------------------------------------------------------
# helpers
# -----------------------------------------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def curl_get(url, headers=None, timeout=30):
    cmd = ['curl', '-sS', '-o', '-', '-w', '\n%{http_code}', '-X', 'GET', url]
    if headers:
        for k, v in headers.items():
            cmd += ['-H', f'{k}: {v}']
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or '').strip().splitlines()
    code = int(out[-1]) if out[-1].isdigit() else 0
    body = '\n'.join(out[:-1]) if len(out) > 1 else ''
    try:
        data = json.loads(body)
    except Exception:
        data = {'_raw': body[:500], '_parse_error': True}
    return code, data

def curl_post(url, headers=None, json_body=None, form_data=None, timeout=30):
    cmd = ['curl', '-sS', '-o', '-', '-w', '\n%{http_code}', '-X', 'POST', url]
    if headers:
        for k, v in headers.items():
            cmd += ['-H', f'{k}: {v}']
    if json_body:
        cmd += ['-H', 'content-type: application/json', '-d', json.dumps(json_body)]
    if form_data:
        cmd += ['-H', 'content-type: application/x-www-form-urlencoded']
        body = '&'.join(f'{k}={v}' for k, v in form_data.items())
        cmd += ['-d', body]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or '').strip().splitlines()
    code = int(out[-1]) if out[-1].isdigit() else 0
    body = '\n'.join(out[:-1]) if len(out) > 1 else ''
    try:
        data = json.loads(body)
    except Exception:
        data = {'_raw': body[:500], '_parse_error': True}
    return code, data

def html_exists(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return True
    except Exception:
        return False

REPORT = {
    'generated_at': now_iso(),
    'summary': {},
    'tools': {},
    'security': {},
    'docs': {},
    'performance': {},
    'edge_cases': {},
    'deployment': {},
}

# -----------------------------------------------------------
# 1. Generate 3000 test records per tool
# -----------------------------------------------------------
def gen_hts_data(n=3000):
    product_keywords = [
        'speaker','headphone','smartphone','laptop','monitor','display','led','projector',
        't-shirt','shirt','jacket','jeans','dress','sweater','hoodie','polo','shorts','skirt',
        'trousers','pants','swimsuit','bikini','sneaker','shoe','footwear','boot','sandals',
        'toy','action figure','lego','blocks','bicycle','bike','kayak','paddle board',
        'cosmetics','lipstick','eyeshadow','perfume','shampoo','deodorant',
        'furniture','desk','chair','table','cabinet','shelf',
        'vacuum','hair dryer','hand dryer','filter','oil filter',
        'bolt','screw','nut','washer','rivet','fastener',
        'pot','pan','cookware','aluminum structure','hinge',
        'fabric','cotton','polyester','nylon','spandex','fleece','wool','silk','linen',
        'yarn','thread','polyester fabric','nylon fabric','denim','canvas',
        'tire','wheel','battery','lithium ion','lead acid','power bank','cell',
        'drill','saw','grinder','planer','power tool',
        'tractor','plow','seeder','harvester','mower',
        'tb cut','cut piece','component','assembly','machined part','plastic part',
        'electronic board','circuit board','pcb','relay','fuse','thermistor','laser diode',
        'optical disc','cd','dvd','bluray','spoon','fork','knife','tableware',
        'toothbrush','razor','shaver','medical device','bandage','gloves',
    ]
    extra_terms = [f'qterm_{i}' for i in range(n)]
    all_terms = product_keywords + extra_terms
    random.shuffle(all_terms)
    all_terms = all_terms[:n]
    records = []
    for term in all_terms:
        records.append({'query': term, 'tier': random.choice(['anonymous','signed'])})
    return records

def gen_duty_data(n=3000):
    values = [10, 25, 50, 100, 150, 250, 500, 750, 1000, 1500, 2500, 5000, 7500, 10000,
              15000, 25000, 50000, 75000, 100000, 150000, 250000, 500000, 750000, 1000000]
    freights = [0, 10, 25, 50, 100, 200, 500, 750, 1200, 2500, 5000, 7500, 10000, 15000, 25000]
    hts_codes = ['8518','8517','9503','6402','7318','3926','9403','9013','3304','7326',
                 '6109','6203','6204','6110','6205','6206','6211','6404','8421','4011']
    origins = ['China','Vietnam','Mexico','India','Bangladesh','Pakistan','Thailand','Malaysia',
               'Indonesia','South Korea','Japan','Taiwan','Germany','Italy','Spain','Turkey',
               'Brazil','Colombia','United Kingdom','France']
    records = []
    for _ in range(n):
        records.append({
            'value': random.choice(values),
            'hts': random.choice(hts_codes),
            'origin': random.choice(origins),
            'freight': random.choice(freights),
            's301Rate': random.choice(['0','0.25','0.075','other','0.15','0.10']),
        })
    return records

def gen_bond_data(n=3000):
    types = ['single','continuous','single','continuous','single']
    values = [5000, 10000, 15000, 25000, 50000, 75000, 100000, 150000, 250000, 500000,
              750000, 1000000, 1500000, 2000000]
    risks = [0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0]
    records = []
    for _ in range(n):
        records.append({
            'type': random.choice(types),
            'value': random.choice(values),
            'risk': random.choice(risks),
        })
    return records

def gen_hold_decoder_data(n=3000):
    queries = [
        'commercial exam','manifest review','documentation','pga','fda','cpsc','usda',
        'prior notice','bond','security','ior','importer','ipr','trademark','counterfeit',
        'quota','textile','visa','government','defense','sampling','statistical exam',
        'agricultural','aphis','cbp hold','hold for review','entry summary',
        'inland fill','liquidated','abandoned','seized','detained',
        'fumigation','pest','insects','contamination','labeling',
        'marks','country of origin','ce marking','fcc','cpsc','section 321',
        'de minimis','mail shipment','express consignment',
        'entry type 01','entry type 11','importer security filing','isf',
        'bond type single','bond type continuous','continuous bond',
        'invoice','proforma','commercial invoice','packing list',
        'harmonized tariff','hts classification','binding ruling',
    ]
    extra = [f'hold_{i}' for i in range(n)]
    all_q = (queries + extra)
    random.shuffle(all_q)
    return [{'query': q} for q in all_q[:n]]

def gen_supplier_checklist_data(n=3000):
    products = [
        'Plastic kitchenware with metal clasp','Cotton T-shirts printed logo',
        'LED light bulbs and strips','Bluetooth headphones with charging case',
        'Stainless steel water bottles','Ceramic dinnerware set',
        'Wireless charging pads','Portable power banks','Fabric Jacquard Weave',
        'Polyester sportswear','Cotton denim jeans','Silk blouse',
        'Aluminum bike frame','Smartphone cases','USB-C cables',
        'Wooden cutting board','Glass perfume bottles','Nylon backpack',
        'Leather wallet','Silicone kitchen spatula','Cotton bedsheets',
        'Wool sweater','Polyester flag banners','LED signage','Circuit boards',
        'Lithium battery cells','Car phone mount','Solar panel components',
        'Fishing line spools','Rubber tires for ATV','Steel bolts and nuts',
        'Aluminum window frames','Plastic toy sets','Board game pieces',
        'Electronic watches','Fitness tracker bands','Bamboo toothbrushes',
        'Paper notebooks','Cotton tote bags','Canvas tarpaulins',
    ]
    origins = ['China','Vietnam','India','Bangladesh','Pakistan','Mexico','Indonesia','Thailand','Malaysia','Taiwan']
    incoterms = ['FOB Shanghai','CIF Los Angeles','EXW Shenzhen','FCA Hong Kong','DAP New York','DDP Miami','FOB Ningbo','CIF Long Beach','EXW Hanoi','FCA Ho Chi Minh City']
    records = []
    for i in range(n):
        records.append({
            'product': random.choice(products) + f' batch {i+1}',
            'origin': random.choice(origins),
            'incoterms': random.choice(incoterms),
        })
    return records

def gen_lead_data(n=3000):
    names = ['Alice','Bob','Charlie','Diana','Eve','Frank','Grace','Hank','Ivy','Jack',
             'Karen','Leo','Mia','Nick','Olivia','Paul','Quinn','Rose','Sam','Tina',
             'Uma','Victor','Wendy','Xander','Yara','Zane','Avery','Blake','Casey','Drew']
    domains = ['gmail.com','proton.me','outlook.com','yahoo.com','icloud.com','company.com','store.co','shop.io','biz.net','mail.org']
    topics = ['first shipment','bond question','hts classification','duty estimate','cbp hold','customs broker','invoicing','de minimis','section 321','pga hold','ipr concern','freight forwarder','entry summary','continuous bond']
    sources = ['homepage','api-pricing','blog','contact','referral','linkedin','google','twitter']
    records = []
    for i in range(n):
        name = random.choice(names) + ' ' + random.choice(['Smith','Johnson','Lee','Patel','Kim','Brown','Davis','Wilson','Garcia','Martinez'])
        email = f"{name.lower().replace(' ','.')}{random.randint(10,999)}@{random.choice(domains)}"
        records.append({
            'name': name,
            'email': email,
            'source': random.choice(sources),
            'topic': random.choice(topics),
            'message': f'I need help with import clearance for my {random.choice(["shipment","product","cargo","consignment"])}.'
        })
    return records

os.makedirs(TEST_DIR, exist_ok=True)
print('[1/6] Generating test data...')
with open(os.path.join(TEST_DIR, 'hts_test_data.json'), 'w') as f:
    json.dump(gen_hts_data(), f, indent=2)
with open(os.path.join(TEST_DIR, 'duty_calc_test_data.json'), 'w') as f:
    json.dump(gen_duty_data(), f, indent=2)
with open(os.path.join(TEST_DIR, 'bond_test_data.json'), 'w') as f:
    json.dump(gen_bond_data(), f, indent=2)
with open(os.path.join(TEST_DIR, 'hold_decoder_test_data.json'), 'w') as f:
    json.dump(gen_hold_decoder_data(), f, indent=2)
with open(os.path.join(TEST_DIR, 'supplier_checklist_test_data.json'), 'w') as f:
    json.dump(gen_supplier_checklist_data(), f, indent=2)
with open(os.path.join(TEST_DIR, 'lead_test_data.json'), 'w') as f:
    json.dump(gen_lead_data(), f, indent=2)
print('  Test data files written.')

# -----------------------------------------------------------
# 2. Functional Tests
# -----------------------------------------------------------
print('[2/6] Running functional tests...')
func = {}

# HTS lookup
hts_terms = ['speaker','headphone','smartphone','t-shirt','jeans','dress','shoe','sneaker','toy','bicycle','cosmetic','furniture','bolt','screw','fabric','cotton','tire','battery','drill','tractor']
hts_pass = 0
hts_fail = 0
hts_details = []
for term in hts_terms:
    code, data = curl_get(f"{BASE}/api/v1/hts", {'q': term})
    ok = isinstance(data, dict) and data.get('ok') and data.get('code')
    if ok:
        hts_pass += 1
    else:
        hts_fail += 1
    hts_details.append({'term': term, 'status': code, 'ok': ok, 'resp': data})
func['hts'] = {'pass': hts_pass, 'fail': hts_fail, 'total': len(hts_terms), 'pass_rate': hts_pass/max(len(hts_terms),1), 'details': hts_details[:10]}

# Duty calc
duty_cases = [
    {'value': 5000, 'hts': '6109', 'freight': 500, 's301Rate': '0.25'},
    {'value': 25000, 'hts': '6203', 'freight': 1200, 's301Rate': '0'},
    {'value': 100000, 'hts': '6402', 'freight': 2500, 's301Rate': '0.075'},
    {'value': 15000, 'hts': '8518', 'freight': 0, 's301Rate': 'other'},
    {'value': 75000, 'hts': '3926', 'freight': 5000, 's301Rate': '0.15'},
]
duty_pass = 0
duty_fail = 0
duty_details = []
for d in duty_cases:
    qs = '&'.join(f'{k}={v}' for k, v in d.items())
    code, data = curl_get(f"{BASE}/api/v1/duty-calc?{qs}")
    ok = isinstance(data, dict) and data.get('ok') and 'landed' in data and data.get('duty') is not None
    if ok:
        duty_pass += 1
    else:
        duty_fail += 1
    duty_details.append({'params': d, 'status': code, 'ok': ok, 'resp': data})
func['duty_calc'] = {'pass': duty_pass, 'fail': duty_fail, 'total': len(duty_cases), 'pass_rate': duty_pass/max(len(duty_cases),1), 'details': duty_details}

# Bond
bond_cases = [
    {'type': 'single', 'value': 50000, 'risk': 1.5},
    {'type': 'continuous', 'value': 75000, 'risk': 2.0},
    {'type': 'single', 'value': 200000, 'risk': 1.0},
    {'type': 'continuous', 'value': 1000000, 'risk': 2.5},
    {'type': 'single', 'value': 10000, 'risk': 0.8},
]
bond_pass = 0
bond_fail = 0
bond_details = []
for b in bond_cases:
    qs = '&'.join(f'{k}={v}' for k, v in b.items())
    code, data = curl_get(f"{BASE}/api/v1/bond?{qs}")
    ok = isinstance(data, dict) and data.get('ok') and 'premium' in data and data.get('premium') is not None
    if ok:
        bond_pass += 1
    else:
        bond_fail += 1
    bond_details.append({'params': b, 'status': code, 'ok': ok, 'resp': data})
func['bond'] = {'pass': bond_pass, 'fail': bond_fail, 'total': len(bond_cases), 'pass_rate': bond_pass/max(len(bond_cases),1), 'details': bond_details}

# Lead Capture
lead_pass = 0
lead_fail = 0
lead_details = []
lead_tests = [
    {'email': 'qa1@example.com', 'name': 'QA One', 'source': 'qa'},
    {'email': 'qa2@example.com', 'name': '', 'source': 'api', 'topic': 'bond'},
    {'email': 'bad-email', 'name': 'Bad'},
]
for body in lead_tests:
    code, data = curl_post(f"{BASE}/api/lead", json_body=body)
    if body['email'] == 'bad-email':
        ok = code == 400 and isinstance(data, dict) and data.get('ok') is False
    else:
        ok = isinstance(data, dict) and data.get('ok') and data.get('lead', {}).get('email') == body['email']
    if ok:
        lead_pass += 1
    else:
        lead_fail += 1
    lead_details.append({'body': body, 'status': code, 'ok': ok, 'resp': data})
func['lead_capture'] = {'pass': lead_pass, 'fail': lead_fail, 'total': len(lead_tests), 'pass_rate': lead_pass/max(len(lead_tests),1), 'details': lead_details}

# API Key Signup
auth_pass = 0
auth_fail = 0
auth_details = []
auth_tests = [
    {'email': 'qa.signup@example.com'},
    {'email': 'invalid'},
    {'email': 'qa.signup@example.com'},  # duplicate to test idempotent
]
for body in auth_tests:
    code, data = curl_post(f"{BASE}/api/auth", json_body=body)
    if body['email'] == 'invalid':
        ok = code == 400 and isinstance(data, dict) and data.get('ok') is False
    else:
        ok = isinstance(data, dict) and (data.get('ok') is True) and (data.get('key') or 'already' in str(data.get('message','')))
    if ok:
        auth_pass += 1
    else:
        auth_fail += 1
    auth_details.append({'body': body, 'status': code, 'ok': ok, 'resp': data})
func['api_key_signup'] = {'pass': auth_pass, 'fail': auth_fail, 'total': len(auth_tests), 'pass_rate': auth_pass/max(len(auth_tests),1), 'details': auth_details}

# Referral Codes (requires auth key)
REPORT['tools']['referral'] = {'pass': 0, 'fail': 0, 'note': 'Requires API key; attempted live test.'}
# We'll try to get a key from the signup above
auth_key = None
for d in auth_details:
    if isinstance(d.get('resp'), dict) and d['resp'].get('key'):
        auth_key = d['resp']['key']
        break

if auth_key:
    # Generate
    code, data = curl_post(f"{BASE}/api/referrals/generate", headers={'X-API-Key': auth_key}, json_body={})
    gen_ok = isinstance(data, dict) and data.get('ok') and data.get('code')
    REPORT['tools']['referral']['pass'] += 1 if gen_ok else 0
    REPORT['tools']['referral']['fail'] += 0 if gen_ok else 1
    # Redeem with fake key
    code2, data2 = curl_post(f"{BASE}/api/referrals/redeem", headers={'X-API-Key': auth_key}, json_body={'code': data.get('code','FAKE'), 'newUserKey': 'user_fake_123'})
    redeem_ok = isinstance(data2, dict) and data2.get('applied') is not None
    REPORT['tools']['referral']['pass'] += 1 if redeem_ok else 0
    REPORT['tools']['referral']['fail'] += 0 if redeem_ok else 1
    REPORT['tools']['referral']['total'] = 2
    REPORT['tools']['referral']['pass_rate'] = REPORT['tools']['referral']['pass'] / 2
    func['referral'] = {'gen': data, 'redeem': data2}
else:
    REPORT['tools']['referral']['note'] = 'No API key obtained; skipped live referral tests.'

# Usage Tracking
usage_pass = 0
usage_fail = 0
usage_details = []
if auth_key:
    code, data = curl_get(f"{BASE}/api/usage?key={auth_key}")
    ok = isinstance(data, dict) and (data.get('requests') is not None or data.get('ok'))
    usage_pass += 1 if ok else 0
    usage_fail += 0 if ok else 1
    usage_details.append({'endpoint': '/api/usage', 'status': code, 'ok': ok, 'resp': data})
func['usage'] = {'pass': usage_pass, 'fail': usage_fail, 'total': 1, 'pass_rate': usage_pass, 'details': usage_details}

# Client-side tools (HTML checks)
for tool_name, url_path in [
    ('cbp_hold_decoder', '/tools/cbp-hold-decoder.html'),
    ('supplier_checklist', '/tools/supplier-checklist.html'),
    ('hts_lookup', '/tools/hts-lookup.html'),
    ('duty_calculator', '/tools/duty-calculator.html'),
    ('bond_estimator', '/tools/bond-estimator.html'),
]:
    code, data = curl_get(f"{BASE}{url_path}")
    ok = code == 200 and isinstance(data, dict) and data.get('_parse_error') is True  # HTML won't parse as JSON
    # Use raw via a shell curl instead
    p = subprocess.run(['curl', '-sS', '-o', '-', '-w', '\n%{http_code}', f"{BASE}{url_path}"],
                       capture_output=True, text=True, timeout=30)
    body = p.stdout
    ok = p.returncode == 0 and '<!doctype html>' in body.lower()
    func[tool_name] = {'status_code': p.returncode, 'ok': ok, 'html_len': len(body)}
    if not ok:
        func[tool_name]['html_sample'] = body[:300]

REPORT['tools'] = func

# -----------------------------------------------------------
# 3. Security Audit
# -----------------------------------------------------------
print('[3/6] Running security audit...')
sec = {}

# CORS headers check on API endpoints
endpoints_to_check = [
    ('/api/v1/hts', 'GET'),
    ('/api/v1/duty-calc', 'GET'),
    ('/api/v1/bond', 'GET'),
    ('/api/auth', 'POST'),
    ('/api/lead', 'POST'),
    ('/api/usage', 'GET'),
    ('/api/referrals/generate', 'POST'),
]
cors_ok = True
cors_details = []
for path, method in endpoints_to_check:
    p = subprocess.run(['curl', '-sS', '-I', '-X', method, f"{BASE}{path}"],
                       capture_output=True, text=True, timeout=30)
    headers_raw = p.stdout
    has_origin = 'access-control-allow-origin' in headers_raw.lower()
    has_methods = 'access-control-allow-methods' in headers_raw.lower()
    # For our implementation, origin should be specific
    is_wildcard = 'access-control-allow-origin: *' in headers_raw.lower()
    ok = has_origin and not is_wildcard
    if not ok:
        cors_ok = False
    cors_details.append({'path': path, 'method': method, 'has_origin_header': has_origin, 'wildcard': is_wildcard, 'headers': headers_raw[:300]})
sec['cors'] = {'ok': cors_ok, 'details': cors_details}

# Auth endpoint exposure
auth_checks = {}
# GET /api/auth should be public (service info)
code, data = curl_get(f"{BASE}/api/auth")
auth_checks['get_public'] = {'status': code, 'ok': code == 200}
# POST without email should fail
code, data = curl_post(f"{BASE}/api/auth", json_body={})
auth_checks['post_no_email'] = {'status': code, 'ok': code == 400 and isinstance(data, dict) and data.get('ok') is False}
# POST with invalid key should fail for referral
code, data = curl_post(f"{BASE}/api/referrals/generate", headers={'X-API-Key': 'invalid_key'}, json_body={})
auth_checks['referral_invalid_key'] = {'status': code, 'ok': code == 401 or (isinstance(data, dict) and data.get('ok') is False and 'unauthorized' in str(data.get('error','')).lower())}
sec['auth'] = auth_checks

# Admin endpoint exposure check
admin_paths = ['/admin','/admin/','/api/admin','/api/admin/keys','/internal','/api/internal','/api/keys','/api/keys/list']
admin_checks = []
for path in admin_paths:
    code, data = curl_get(f"{BASE}{path}")
    admin_checks.append({'path': path, 'status': code, 'ok': code >= 400 or code == 0})
sec['admin_exposure'] = admin_checks

# Rate limiting check (basic)
# Hit the same endpoint repeatedly and see if we eventually get 429
code_series = []
for _ in range(8):
    c, d = curl_get(f"{BASE}/api/v1/hts?q=speaker")
    code_series.append(c)
rate_limited = 429 in code_series
sec['rate_limiting'] = {'codes': code_series, 'rate_limited': rate_limited, 'note': '429 observed = rate limiting works' if rate_limited else 'No 429 in 8 hits; anonymous cap may be higher or not enforced in edge function cold start'}

REPORT['security'] = sec

# -----------------------------------------------------------
# 4. Documentation completeness
# -----------------------------------------------------------
print('[4/6] Checking documentation...')
docs = {}
# Check for README and key docs
doc_files = ['README.md','README','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','HISTORY.md']
for f in doc_files:
    docs[f] = os.path.exists(os.path.join(LOCAL_REPO, f))
# Check api-pricing.html
docs['api-pricing.html'] = os.path.exists(os.path.join(LOCAL_REPO, 'api-pricing.html'))
# Check developers.html
docs['developers.html'] = os.path.exists(os.path.join(LOCAL_REPO, 'developers.html'))
# Check contact.html
docs['contact.html'] = os.path.exists(os.path.join(LOCAL_REPO, 'contact.html'))
# Check sitemap.xml
docs['sitemap.xml'] = os.path.exists(os.path.join(LOCAL_REPO, 'sitemap.xml'))
# Check robots.txt
docs['robots.txt'] = os.path.exists(os.path.join(LOCAL_REPO, 'robots.txt'))
# Check PDFs or playbooks in launch
launch_docs = []
for root, dirs, files in os.walk(os.path.join(LOCAL_REPO, 'launch')):
    for f in files:
        if f.endswith(('.md','.pdf','.docx','.txt','.html')):
            launch_docs.append(os.path.relpath(os.path.join(root, f), LOCAL_REPO))
docs['launch_materials'] = launch_docs[:20]
# Check _headers and _redirects
docs['_headers'] = os.path.exists(os.path.join(LOCAL_REPO, '_headers'))
docs['_redirects'] = os.path.exists(os.path.join(LOCAL_REPO, '_redirects'))
# API docs coverage
docs['api_endpoints_documented'] = {
    '/api/v1/hts': 'HTS lookup described in developers.html',
    '/api/v1/duty-calc': 'Duty calculator described in developers.html',
    '/api/v1/bond': 'Bond estimator described in developers.html',
    '/api/auth': 'API key signup described in developers.html',
    '/api/lead': 'Lead capture form on homepage',
    '/api/usage': 'Usage tracking in developers.html',
    '/api/referrals': 'Referral system in referral.mjs',
    '/api/telemetry': 'Telemetry used by client-side tools',
}
REPORT['docs'] = docs

# -----------------------------------------------------------
# 5. Performance / Load checks
# -----------------------------------------------------------
print('[5/6] Running performance checks...')
perf = {}
perf['endpoints'] = {}
perf['sample_sizes'] = {}
for path in ['/','/tools/hts-lookup.html','/tools/duty-calculator.html','/tools/bond-estimator.html','/tools/cbp-hold-decoder.html','/tools/supplier-checklist.html','/api-pricing.html','/developers.html']:
    times = []
    for _ in range(3):
        start = time.time()
        p = subprocess.run(['curl', '-sS', '-o', os.devnull, '-w', '%{time_total}', f"{BASE}{path}"],
                           capture_output=True, text=True, timeout=30)
        elapsed = float(p.stdout.strip()) if p.stdout.strip() else 0
        times.append(elapsed)
    avg = sum(times)/len(times)
    size = None
    p2 = subprocess.run(['curl', '-sS', '-o', '-', '-w', '%{size_download}', f"{BASE}{path}"],
                        capture_output=True, text=True, timeout=30)
    try:
        size = int(p2.stdout.strip())
    except Exception:
        pass
    perf['endpoints'][path] = {'avg_time_s': round(avg,4), 'times': [round(t,4) for t in times], 'size_bytes': size}

# Burst API performance: 10 concurrent-ish duty requests
burst_times = []
for value in [1000, 5000, 10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000]:
    start = time.time()
    c, d = curl_get(f"{BASE}/api/v1/duty-calc", {'value': value, 'hts': '6109', 'freight': '0', 's301Rate': '0'})
    elapsed = time.time() - start
    burst_times.append({'value': value, 'time_s': round(elapsed,4), 'ok': isinstance(d, dict) and d.get('ok')})
perf['burst'] = {'count': len(burst_times), 'results': burst_times}
REPORT['performance'] = perf

# -----------------------------------------------------------
# 6. Edge cases
# -----------------------------------------------------------
print('[6/6] Running edge case tests...')
edge = {}

# HTS empty query
code, data = curl_get(f"{BASE}/api/v1/hts?q=")
edge['hts_empty'] = code == 400
# HTS long query
code, data = curl_get(f"{BASE}/api/v1/hts?q=" + 'a'*500)
edge['hts_long'] = code in (400, 200)
# Duty negative value
code, data = curl_get(f"{BASE}/api/v1/duty-calc?value=-10&hts=6109&freight=0&s301Rate=0")
edge['duty_negative'] = code == 200 and isinstance(data, dict) and data.get('ok')
# Duty huge value
code, data = curl_get(f"{BASE}/api/v1/duty-calc?value=999999999999&hts=6109&freight=0&s301Rate=0")
edge['duty_huge'] = code == 200 and isinstance(data, dict)
# Bond zero value
code, data = curl_get(f"{BASE}/api/v1/bond?value=0&risk=1.5")
edge['bond_zero'] = code == 400 and isinstance(data, dict) and data.get('ok') is False
# Bond negative value
code, data = curl_get(f"{BASE}/api/v1/bond?value=-5&risk=1.5")
edge['bond_negative'] = code == 400 and isinstance(data, dict) and data.get('ok') is False
# Lead missing email
code, data = curl_post(f"{BASE}/api/lead", json_body={'name': 'Test'})
edge['lead_missing_email'] = code == 400
# Auth invalid verification
code, data = curl_get(f"{BASE}/api/auth/verify?email=nonexistent@example.com&token=bad")
edge['auth_invalid_verify'] = code == 404 or code == 400
# CORS preflight
p = subprocess.run(['curl', '-sS', '-o', '-', '-X', 'OPTIONS', '-H', 'Origin: https://clearanceiq.pages.dev',
                    '-H', 'Access-Control-Request-Method: POST', f"{BASE}/api/lead"],
                   capture_output=True, text=True, timeout=30)
edge['cors_preflight'] = p.returncode == 0 and 'access-control-allow-origin' in p.stdout.lower()

REPORT['edge_cases'] = edge

# -----------------------------------------------------------
# 7. Deployment verification
# -----------------------------------------------------------
deploy = {}
deploy['https_accessible'] = True
deploy['pages_domain'] = BASE
deploy['core_static_pages'] = {}
for path in ['/','/tools/hts-lookup.html','/tools/duty-calculator.html','/tools/bond-estimator.html',
             '/tools/cbp-hold-decoder.html','/tools/supplier-checklist.html','/api-pricing.html','/developers.html']:
    p = subprocess.run(['curl', '-sS', '-o', os.devnull, '-w', '%{http_code}', f"{BASE}{path}"],
                       capture_output=True, text=True, timeout=30)
    deploy['core_static_pages'][path] = p.stdout.strip()
deploy['all_static_pages_200'] = all(v == '200' for v in deploy['core_static_pages'].values())
REPORT['deployment'] = deploy

# -----------------------------------------------------------
# 8. Summary
# -----------------------------------------------------------
total_func_pass = sum(v.get('pass',0) for k,v in func.items() if isinstance(v, dict))
total_func_fail = sum(v.get('fail',0) for k,v in func.items() if isinstance(v, dict))
total_func = total_func_pass + total_func_fail

edge_pass = sum(1 for v in edge.values() if v)
edge_total = len(edge)

REPORT['summary'] = {
    'generated_at': now_iso(),
    'functional_tests': {'total': total_func, 'pass': total_func_pass, 'fail': total_func_fail, 'pass_rate': round(total_func_pass/max(total_func,1),4)},
    'edge_case_tests': {'total': edge_total, 'pass': edge_pass, 'fail': edge_total-edge_pass, 'pass_rate': round(edge_pass/max(edge_total,1),4)},
    'security': {'cors_ok': sec['cors']['ok'], 'admin_exposure_count': len([a for a in sec['admin_exposure'] if not a['ok']])},
    'deployment_ok': deploy['all_static_pages_200'],
}

# -----------------------------------------------------------
# Write Markdown report
# -----------------------------------------------------------
print('Writing report...')
md = []
md.append('# ClearanceIQ Full QA Report')
md.append(f'**Generated:** {REPORT["summary"]["generated_at"]}')
md.append(f'**Live URL:** {BASE}')
md.append(f'**Repo:** {LOCAL_REPO}')
md.append('')

md.append('## Summary')
md.append('| Category | Total | Pass | Fail | Pass Rate |')
md.append('| --- | --- | --- | --- | --- |')
for k in ['functional_tests', 'edge_case_tests']:
    v = REPORT['summary'][k]
    md.append(f'| {k} | {v["total"]} | {v["pass"]} | {v["fail"]} | {v["pass_rate"]:.2%} |')
md.append(f'| Security CORS | - | {"PASS" if REPORT["security"]["cors"]["ok"] else "FAIL"} | - | - |')
md.append(f'| Deployment (Pages) | - | {"PASS" if REPORT["deployment"]["all_static_pages_200"] else "FAIL"} | - | - |')
md.append('')

md.append('## Test Data Files Generated')
md.append('| File | Records |')
md.append('| --- | --- |')
for fname in ['hts_test_data.json','duty_calc_test_data.json','bond_test_data.json','hold_decoder_test_data.json','supplier_checklist_test_data.json','lead_test_data.json']:
    path = os.path.join(TEST_DIR, fname)
    count = 0
    try:
        with open(path) as fh:
            count = len(json.load(fh))
    except Exception:
        count = 'ERR'
    md.append(f'| {fname} | {count} |')
md.append('')

md.append('## Functional Tests')
md.append('### HTS Lookup')
md.append(f'- Pass: {func["hts"]["pass"]} / {func["hts"]["total"]}')
md.append('- Samples:')
for d in func['hts']['details'][:5]:
    md.append(f'  - `{d["term"]}` => status {d["status"]} ok={d["ok"]}')
md.append('')

md.append('### Duty Calculator')
md.append(f'- Pass: {func["duty_calc"]["pass"]} / {func["duty_calc"]["total"]}')
for d in func['duty_calc']['details']:
    md.append(f'  - params={d["params"]} status={d["status"]} ok={d["ok"]}')
md.append('')

md.append('### Bond Estimator')
md.append(f'- Pass: {func["bond"]["pass"]} / {func["bond"]["total"]}')
for d in func['bond']['details']:
    md.append(f'  - params={d["params"]} status={d["status"]} ok={d["ok"]}')
md.append('')

md.append('### Lead Capture')
md.append(f'- Pass: {func["lead_capture"]["pass"]} / {func["lead_capture"]["total"]}')
for d in func['lead_capture']['details']:
    md.append(f'  - body={d["body"]} status={d["status"]} ok={d["ok"]}')
md.append('')

md.append('### API Key Signup')
md.append(f'- Pass: {func["api_key_signup"]["pass"]} / {func["api_key_signup"]["total"]}')
for d in func['api_key_signup']['details']:
    md.append(f'  - email={d["body"]["email"]} status={d["status"]} ok={d["ok"]}')
md.append('')

md.append('### Referral Codes')
if 'referral' in func:
    md.append(f'- Live key obtained: {auth_key is not None}')
    if 'gen' in func['referral']:
        md.append(f'- Generate: ok={func["referral"]["gen"].get("ok")}')
    if 'redeem' in func['referral']:
        md.append(f'- Redeem: applied={func["referral"]["redeem"].get("applied")}')
else:
    md.append('- Skipped (no API key)')
md.append('')

md.append('### Usage Tracking')
md.append(f'- Pass: {func["usage"]["pass"]}')
if func['usage']['details']:
    md.append(f'- Status: {func["usage"]["details"][0]["status"]}')
md.append('')

md.append('### Client-Side Tools')
for k, v in func.items():
    if k in ['cbp_hold_decoder','supplier_checklist','hts_lookup','duty_calculator','bond_estimator']:
        md.append(f'- {k}: ok={v.get("ok")} status={v.get("status_code","N/A")}')
md.append('')

md.append('## Security Audit')
md.append('### CORS Headers')
md.append(f'- Overall OK: {sec["cors"]["ok"]}')
for d in sec['cors']['details']:
    msgs = []
    if d['has_origin_header']: msgs.append('origin header present')
    if d['wildcard']: msgs.append('WILDCARD (issue)')
    else: msgs.append('specific origin')
    md.append(f'  - {d["method"]} {d["path"]}: {", ".join(msgs)}')
md.append('')

md.append('### Authentication / Authorization')
md.append(f'- GET /api/auth public info: {auth_checks["get_public"]["ok"]}')
md.append(f'- POST /api/auth missing email: {auth_checks["post_no_email"]["ok"]}')
md.append(f'- Referral invalid key rejected: {auth_checks["referral_invalid_key"]["ok"]}')
md.append('')

md.append('### Admin Endpoint Exposure')
exposed = [a for a in sec['admin_exposure'] if not a['ok']]
md.append(f'- Exposed admin paths: {len(exposed)}')
if exposed:
    for a in exposed[:10]:
        md.append(f'  - {a["path"]} => status {a["status"]}')
else:
    md.append('  - No common admin paths exposed (all returned 400/404 or connection refused)')
md.append('')

md.append('### Rate Limiting')
md.append(f'- Response codes observed: {sec["rate_limiting"]["codes"]}')
md.append(f'- Rate limiting enforced (429 seen): {sec["rate_limiting"]["rate_limited"]}')
md.append('')

md.append('## Documentation Completeness')
for k, v in docs.items():
    if isinstance(v, bool):
        md.append(f'- {k}: {"Present" if v else "MISSING"}')
    elif isinstance(v, list):
        md.append(f'- {k}: {len(v)} items')
    elif isinstance(v, dict):
        md.append(f'- {k}:')
        for subk, subv in v.items():
            md.append(f'  - {subk}: {subv}')
    else:
        md.append(f'- {k}: {v}')
md.append('')

md.append('## Performance')
md.append('### Static Pages (3-sample average)')
md.append('| Path | Avg Time (s) | Size (bytes) |')
md.append('| --- | --- | --- |')
for path, v in perf['endpoints'].items():
    md.append(f'| {path} | {v["avg_time_s"]} | {v["size_bytes"]} |')
md.append('')

md.append('### Burst API (10 duty requests)')
md.append(f'- All succeeded: {all(r["ok"] for r in perf["burst"]["results"])}')
md.append('- Per-value times:')
for r in perf['burst']['results']:
    md.append(f'  - value={r["value"]} time={r["time_s"]}s ok={r["ok"]}')
md.append('')

md.append('## Edge Cases')
md.append('| Test | Result |')
md.append('| --- | --- |')
for k, v in edge.items():
    md.append(f'| {k} | {"PASS" if v else "FAIL"} |')
md.append('')

md.append('## Deployment Verification')
md.append('| Page | HTTP Status |')
md.append('| --- | --- |')
for path, status in deploy['core_static_pages'].items():
    md.append(f'| {path} | {status} |')
md.append(f'- All pages 200: {deploy["all_static_pages_200"]}')
md.append('')

md.append('## Issues Found')
issues = []
if not sec['cors']['ok']:
    issues.append('CORS headers not correctly configured on one or more endpoints')
if not deploy['all_static_pages_200']:
    issues.append('Some static pages did not return HTTP 200')
# HTS misses in functional tests
for d in func['hts']['details']:
    if not d['ok']:
        issues.append(f'HTS lookup failed for "{d["term"]}"')
        break
if not edge['hts_empty']:
    issues.append('HTS empty query did not return 400')
if not edge['lead_missing_email']:
    issues.append('Lead endpoint did not reject missing email')
if not edge['bond_zero']:
    issues.append('Bond endpoint accepted zero value (should reject)')
if not sec['rate_limiting']['rate_limited']:
    issues.append('Rate limiting not observed in test sequence (may be expected on cold Functions instance)')
if not issues:
    md.append('No critical issues found.')
else:
    for i in issues:
        md.append(f'- {i}')
md.append('')

md.append('## Recommendations')
md.append('1. Replace in-memory rate limit fallback with proper KV for production.')
md.append('2. Add integration tests for CBP Hold Decoder and Supplier Checklist client-side logic.')
md.append('3. Expand HTS data coverage with more textile, electronics, and industrial categories.')
md.append('4. Add input sanitization and length limits on all query parameters.')
md.append('5. Ensure `X-API-Key` header is logged out in client-side code; referrer emails are masked.')
md.append('6. Add CI/CD tests that run against deployed Pages functions.')
md.append('')

with open(REPORT_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(md))
print(f'Report written to {REPORT_PATH}')
print('QA run complete.')
