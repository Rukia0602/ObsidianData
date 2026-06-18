# -*- coding: utf-8 -*-
import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# 上传成绩单
files = {'file': open('../2025-2026学年下学期高三一模-高三年级5-15班学生成绩.xlsx', 'rb')}
r = requests.post('http://localhost:5000/api/upload', files=files)
d = r.json()
if not d.get('success'):
    print('UPLOAD FAIL:', d.get('error'))
    sys.exit(1)

fid = d['file_id']
print(f'upload OK: {d["row_count"]} rows x {d["col_count"]} cols')
print(f'columns: {d["columns"][:10]}')
print()

# 测试数据接口
r2 = requests.get(f'http://localhost:5000/api/data/{fid}')
d2 = r2.json()
if d2.get('success'):
    print('data OK:', d2['row_count'], 'rows')
    print('column_types:', dict(list(d2['column_types'].items())[:10]))
    print('numeric cols:', [k for k,v in d2['column_types'].items() if v=='numeric'][:10])
    print()

    # 测试图表生成(matplotlib)
    r3 = requests.post('http://localhost:5000/api/chart', json={'file_id': fid})
    d3 = r3.json()
    if d3.get('success'):
        print('chart OK, keys:', list(d3['charts'].keys()))
    else:
        print('chart FAIL:', d3.get('error'))
    print()

    # 测试AI分析
    r4 = requests.post('http://localhost:5000/api/analyze', json={'file_id': fid})
    d4 = r4.json()
    if d4.get('success'):
        a = d4['analysis']
        print('analyze OK')
        print('summary:', a['summary'][:120])
        print('findings:', len(a['findings']))
        for f in a['findings'][:5]:
            print('  -', f['title'], ':', f['content'][:60])
    else:
        print('analyze FAIL:', d4.get('error'))
else:
    print('data FAIL:', d2.get('error'))
