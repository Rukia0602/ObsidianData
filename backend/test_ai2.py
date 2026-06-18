import sys, requests, json
sys.path.insert(0, 'lib')

print('=== 示例数据 AI 分析 ===')
r = requests.post('http://localhost:5000/api/analyze', json={'file_id': 'sample'})
print('Status:', r.status_code)
print('Response:', r.text[:500])

print()
print('=== 汽车数据测试 ===')
with open(r'..\2025年11月汽车排行数据.csv', 'rb') as fh:
    r2 = requests.post('http://localhost:5000/api/upload', files={'file': fh})
    up_data = r2.json()
    print('Upload:', up_data.get('success'), up_data.get('file_id'))
    fid = up_data.get('file_id', 'unknown')

r3 = requests.post('http://localhost:5000/api/analyze', json={'file_id': fid})
d2 = r3.json()
print('Status:', r3.status_code)
if d2.get('success'):
    a = d2['analysis']
    print('Summary:', a['summary'])
    print('Findings:', len(a['findings']))
    for f in a['findings']:
        print(f'  [{f["severity"]}] {f["title"]}')
    print('Recommendations:', len(a['recommendations']))
    print('Action Plans:', len(a['action_plans']))
    for ap in a['action_plans']:
        print(f'  - {ap["title"]} ({len(ap["steps"])} steps, KPI: {ap["measurable_kpi"]})')
else:
    print('Error:', d2.get('error'))
