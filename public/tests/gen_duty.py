import json, random, os

base = r'C:\Users\Najmi\Documents\Tycoon\site\tests'
os.makedirs(base, exist_ok=True)

# 2. Duty Calculator test data - 3000 items
origins = ['China', 'Vietnam', 'Mexico', 'Germany', 'India', 'Japan', 'South Korea']
hts_list = [
    '8471.30.0000', '8517.12.0030', '8541.40.2000', '9503.00.1000',
    '6403.19.2010', '6109.10.0012', '4202.21.0000', '7321.11.1000'
]

duty_data = []
for i in range(3000):
    value = round(random.uniform(100, 50000), 2)
    freight = round(value * random.uniform(0.05, 0.20), 2)
    duty_data.append({
        'id': i+1,
        'value_usd': value,
        'hts_code': random.choice(hts_list),
        'origin': random.choice(origins),
        'freight_usd': freight,
        'insurance_usd': round(freight * random.uniform(0.01, 0.05), 2),
        'expected_duty_min': 0,
        'expected_duty_max': round(value * 0.25, 2),
        'section301_expected': random.choice([True, False])
    })

with open(os.path.join(base, 'duty_calc_test_data.json'), 'w') as f:
    json.dump(duty_data, f, indent=2)
print(f'duty_calc_test_data.json: {len(duty_data)} records')
