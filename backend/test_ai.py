import sys, requests, json
sys.path.insert(0, 'lib')

print('=== 示例数据 AI 分析 ===')
r = requests.post('http://localhost:5000/api/analyze', json={'file_id': 'sample'})
d = r.json()
analysis = d['analysis']
print('Summary:', analysis['summary'])
print('Findings count:', len(analysis['findings']))
for f in analysis['findings']:
    print(f'  [{f["severity"]}] {f["title"]}')
print('Recommendations:', len(analysis['recommendations']))
print('Action Plans:', len(analysis['action_plans']))
for ap in analysis['action_plans']:
    print(f'  - {ap["title"]} ({len(ap["steps"])} steps)')

print()
print('=== 汽车数据 AI 分析 ===')
with open(r'..\2025年11月汽车排行数据.csv', 'rb') as fh:
    r2 = requests.post('http://localhost:5000/api/upload', files={'file': fh})
    fid = r2.json()['file_id']
r3 = requests.post('http://localhost:5000/api/analyze', json={'file_id': fid})
d2 = r3.json()
analysis2 = d2['analysis']
print('Summary:', analysis2['summary'])
print('Findings count:', len(analysis2['findings']))
for f in analysis2['findings']:
    print(f'  [{f["severity"]}] {f["title"]}')
print('Recommendations:', len(analysis2['recommendations']))
print('Action Plans:', len(analysis2['action_plans']))
for ap in analysis2['action_plans']:
    print(f'  - {ap["title"]} ({len(ap["steps"])} steps)')
