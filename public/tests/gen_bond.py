import json, random, os

base = r'C:\Users\Najmi\Documents\Tycoon\site\tests'
os.makedirs(base, exist_ok=True)

# 3. Bond Estimator test data - 3000 items
bond_data = []
for i in range(3000):
    shipment_type = random.choice(['single', 'continuous'])
    value = round(random.uniform(5000, 1000000), 2)
    risk = round(random.uniform(1.0, 3.0), 2)
    min_bond = 50000 if shipment_type == 'continuous' else value
    min_bond = max(min_bond, 50000)
    
    bond_data.append({
        'id': i+1,
        'shipment_type': shipment_type,
        'shipment_value': value,
        'risk_factor': risk,
        'expected_min_bond': min_bond,
        'expected_premium_rate': round(0.015 * risk, 4),
        'expected_premium_min': round(min_bond * 0.015 * risk, 2)
    })

with open(os.path.join(base, 'bond_test_data.json'), 'w') as f:
    json.dump(bond_data, f, indent=2)
print(f'bond_test_data.json: {len(bond_data)} records')
