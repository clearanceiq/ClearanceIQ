import json, random, os

base = r'C:\Users\Najmi\Documents\Tycoon\site\tests'
os.makedirs(base, exist_ok=True)

# 1. HTS test data - 3000 items
hts_codes = [
    '8471.30.0000', '8517.12.0030', '8541.40.2000', '9503.00.1000',
    '6403.19.2010', '6109.10.0012', '4202.21.0000', '7321.11.1000',
    '3923.10.0000', '7210.49.0010', '9013.80.1000', '8504.40.8000'
]
descriptions = [
    'automatic data processing machines', 'smartphones', 'LED backlight modules',
    'toy action figures', 'athletic footwear', "men's knit shirts",
    'leather handbags', 'stainless steel tableware', 'plastic food containers',
    'cold-rolled steel sheets', 'optical telescopes', 'static converters'
]

hts_data = []
for i in range(3000):
    code = random.choice(hts_codes)
    desc = random.choice(descriptions)
    hts_data.append({
        'id': i+1,
        'query': f'{desc} {random.choice(["from china", "from vietnam", "from mexico", "bulk order", "sample"])}',
        'hts_code': code,
        'description': desc,
        'duty_rate': round(random.uniform(0, 25), 2),
        'expected_origin': random.choice(['China', 'Vietnam', 'Mexico', 'Germany', 'India'])
    })

with open(os.path.join(base, 'hts_test_data.json'), 'w') as f:
    json.dump(hts_data, f, indent=2)
print(f'hts_test_data.json: {len(hts_data)} records')
