import pandas as pd
import numpy as np
import os
import json
import uuid
import datetime
from collections import defaultdict

from app.config import ACTIONS_FILE


def _load_actions():
    if not os.path.exists(ACTIONS_FILE):
        return {}
    with open(ACTIONS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_actions(actions):
    with open(ACTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(actions, f, ensure_ascii=False, indent=2)


def analyze(file_path=None, df=None):
    if df is None:
        if not file_path:
            raise ValueError('需要提供 file_path 或 df')
        from app.services.data_api import load_dataframe
        df = load_dataframe(file_path)
    total_rows = len(df)

    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
    string_cols = df.select_dtypes(include=['object']).columns.tolist()

    # 排除 ID/排名/编号类列 — 它们不是有意义的统计指标
    _ID_COL_KWS = ['id', 'ID', '编号', '序号', '准考证号', '学号', '座位号',
                   '校次', '班次', '名次', '排名', 'rank', 'Rank']
    useful_num = [c for c in numeric_cols
                  if c not in ('评分', 'brand_id', 'car_series_id', '车系ID', '品牌ID', '图片链接')
                  and not any(kw in str(c) for kw in _ID_COL_KWS)
                  and df[c].nunique() > 1]
    useful_str = [c for c in string_cols if not any(str(v).startswith('http')
                  for v in df[c].dropna().head(5).astype(str))]

    findings = []
    recommendations = []
    action_plans = []
    summary = ''

    category_col = None
    for c in useful_str:
        if 2 <= df[c].nunique() <= 20:
            category_col = c
            break
    if category_col is None:
        for c in useful_str:
            if 20 < df[c].nunique() <= 200:
                category_col = c
                break

    time_col = None
    for c in useful_str:
        vals = df[c].dropna().astype(str).tolist()
        if 2 <= df[c].nunique() <= 36 and any(
            kw in str(v) for v in vals[:5] for kw in ['月', '年', '季', 'Q', 'Mon', 'Jan']
        ):
            time_col = c
            break

    leader_val = None
    follower_val = None
    if len(useful_num) >= 1:
        leader_val = useful_num[0]
    if len(useful_num) >= 2:
        follower_val = useful_num[1]

    is_ranking = any(kw in c.lower() for c in useful_num for kw in ['排名', 'rank'])

    # ---- Finding 1: 数据概览 ----
    findings.append({
        'type': 'overview',
        'title': '数据规模',
        'severity': 'info',
        'content': f'共 {total_rows} 条记录，{len(useful_num)} 个数值维度，{len(useful_str)} 个分类维度。{"已识别排名结构" if is_ranking else "已识别分组/时间序列结构"}。',
    })

    # ---- Finding 2: 领先者识别 ----
    if leader_val and category_col:
        top_n = df.groupby(category_col)[leader_val].sum().sort_values(ascending=False)
        if len(top_n) >= 2:
            top1_name = top_n.index[0]
            top1_val = int(top_n.iloc[0])
            top2_name = top_n.index[1]
            top2_val = int(top_n.iloc[1])
            gap = top1_val - top2_val
            pct = round((gap / top2_val) * 100, 1) if top2_val else 0
            findings.append({
                'type': 'champion',
                'title': '领先者分析',
                'severity': 'success',
                'content': f'"{top1_name}" 以 {top1_val} 位居榜首，领先第二名 "{top2_name}" 达 {gap}（{pct}%）。建议总结其优势经验并加以推广。',
            })

    # ---- Finding 3: 机会点 / 潜力识别 ----
    if category_col and len(useful_num) >= 2:
        col1, col2 = useful_num[0], useful_num[1]
        try:
            grouped = df.groupby(category_col).agg({col1: 'sum', col2: 'mean'}).round(1)
            if len(grouped) >= 5:
                grouped['efficiency'] = grouped[col2] / (grouped[col1].max() + 1)
                top_eff = grouped.sort_values('efficiency', ascending=False)
                if len(top_eff) >= 3:
                    eff_name = top_eff.index[0]
                    findings.append({
                        'type': 'opportunity',
                        'title': '效率之星',
                        'severity': 'warning',
                        'content': f'"{eff_name}" 在 {col2} 均值上表现最优，但 {col1} 合计不高。建议分析其优势所在并推广经验到其他分组。',
                    })
        except (ValueError, TypeError, KeyError):
            pass

    # ---- Finding 4: 相关性 ----
    if len(useful_num) >= 2 and not is_ranking:
        col_a, col_b = useful_num[0], useful_num[1]
        try:
            corr = round(df[col_a].corr(df[col_b]), 3)
            if abs(corr) >= 0.5:
                direction = '正相关' if corr > 0 else '负相关'
                findings.append({
                    'type': 'correlation',
                    'title': f'{col_a} 与 {col_b} 强相关',
                    'severity': 'warning',
                    'content': f'相关系数 {corr}，存在显著{direction}。提升 {col_a} 可能直接带动 {col_b} 增长，建议将 {col_a} 作为关键驱动指标进行监控和优化。',
                })
        except (ValueError, TypeError):
            pass

    # ---- Finding 5: 尾部风险 ----
    if leader_val and category_col:
        top_n = df.groupby(category_col)[leader_val].sum().sort_values(ascending=True)
        if len(top_n) >= 3:
            bottom = top_n.index[:3].tolist()
            findings.append({
                'type': 'risk',
                'title': '尾部预警',
                'severity': 'error',
                'content': f'"{", ".join(bottom)}" 在 {leader_val} 上排名垫底，建议评估原因并制定改进方案。',
            })

    # ---- Finding 6: 时间趋势 ----
    if time_col and category_col and leader_val:
        try:
            grouped = df.groupby([time_col, category_col])[leader_val].sum().unstack()
            if len(grouped) >= 2:
                first = grouped.iloc[0]
                last = grouped.iloc[-1]
                changes = (last - first).dropna().sort_values()
                if len(changes) >= 1:
                    best_grower = changes.idxmax()
                    worst_grower = changes.idxmin()
                    findings.append({
                        'type': 'trend',
                        'title': '增长态势',
                        'severity': 'info',
                        'content': f'"{best_grower}" 增长最快 ({int(changes.max())})，" {worst_grower}" 下滑最明显 ({int(changes.min())})。建议关注 {worst_grower} 下滑原因，及时干预扭转趋势。',
                    })
        except (ValueError, TypeError, KeyError):
            pass

    # ---- Finding 7: 集中度 ----
    if leader_val and category_col:
        total = df[leader_val].sum()
        top3_share = round(df.groupby(category_col)[leader_val].sum().nlargest(3).sum() / total * 100, 1)
        if top3_share > 50:
            findings.append({
                'type': 'concentration',
                'title': '集中度风险',
                'severity': 'warning',
                'content': f'Top 3 占据了 {top3_share}% 的 {leader_val}，存在集中度过高风险。建议关注分布均衡性，避免单点依赖。',
            })

    # ---- Finding 8: 排名陡降（汽车数据专用） ----
    if is_ranking and len(useful_num) >= 1:
        rank_col = [c for c in useful_num if '排名' in c or 'rank' in c.lower()][0]
        val_col = useful_num[1] if len(useful_num) >= 2 else useful_num[0]
        if '上期排名' in useful_num or any('上期' in c for c in useful_num):
            prev_col = [c for c in useful_num if '上期' in c or '前次' in c]
            if prev_col:
                prev_col = prev_col[0]
                df['排名变化'] = df[prev_col] - df[rank_col]
                jumpers = df[df['排名变化'] > 20].head(5)
                droppers = df[df['排名变化'] < -20].head(5)
                if len(jumpers) > 0 and category_col:
                    item_col = [c for c in useful_str if df[c].nunique() > total_rows * 0.5]
                    item_col = item_col[0] if item_col else useful_str[-1]
                    jump_names = jumpers[item_col].tolist()[:3]
                    drop_names = droppers[item_col].tolist()[:3] if len(droppers) > 0 else []
                    findings.append({
                        'type': 'ranking_shake',
                        'title': '排名异动',
                        'severity': 'warning',
                        'content': f'排名跃升最大：{", ".join(str(n) for n in jump_names)}；' +
                                   (f'排名下滑最大：{", ".join(str(n) for n in drop_names)}。' if drop_names else '') +
                                   '关注背后驱动因素以制定针对性策略。',
                    })

    # ---- Finding 9: 场景识别 + 针对性分析 ----
    scenario = _detect_scenario(df, useful_num, useful_str)
    scenario_findings = []
    if scenario == 'student_scores':
        scenario_findings = _analyze_student_scores(df, useful_num, useful_str)
    elif scenario == 'sales':
        scenario_findings = _analyze_sales(df, useful_num, useful_str)
    elif scenario == 'automobile':
        scenario_findings = _analyze_automobile(df, useful_num, useful_str)
    elif scenario == 'generic':
        scenario_findings = _analyze_generic(df, useful_num, useful_str)

    if scenario_findings:
        findings.extend(scenario_findings)

    # ---- 生成总结 ----
    severity_count = defaultdict(int)
    for f in findings:
        severity_count[f['severity']] += 1
    red = severity_count.get('error', 0)
    yellow = severity_count.get('warning', 0)

    scenario_names = {
        'student_scores': '学生成绩单',
        'sales': '销售数据',
        'automobile': '汽车数据',
        'generic': '通用数据',
    }
    scenario_label = scenario_names.get(scenario, '通用数据')
    summary = f'【{scenario_label}分析】共 {len(findings)} 个洞察：{red} 个风险、{yellow} 个机会。'
    if scenario_findings:
        summary += f' 已识别为{scenario_label}场景，生成{len(scenario_findings)}条针对性分析。'
    if red >= 2:
        summary += ' ⚠️ 存在多个风险点，建议优先处理。'
    elif yellow >= 3:
        summary += ' 📈 改进空间较大，存在多个增长机会。'
    else:
        summary += ' ✅ 整体状态良好。'

    # ---- 生成可执行建议 ----
    rec_id = 0
    for finding in findings:
        if finding['type'] == 'champion':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'medium',
                'title': '巩固龙头地位',
                'content': '组织最佳实践复盘会议，提炼成功经验形成SOP文档，向其他团队推广。',
                'impact': '高',
                'effort': '低',
            })
        elif finding['type'] == 'risk':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'high',
                'title': '尾部问题诊断',
                'content': '启动专题分析：检查数据异常原因，2周内输出诊断报告和改进方案。',
                'impact': '高',
                'effort': '中',
            })
        elif finding['type'] == 'trend':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'medium',
                'title': '趋势干预',
                'content': '针对下滑品类召开专项会议，制定促销+渠道+产品三维干预方案，设定1个月恢复目标。',
                'impact': '中',
                'effort': '中',
            })
        elif finding['type'] == 'correlation':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'medium',
                'title': '杠杆指标监控',
                'content': f'建立关键驱动指标看板，每日监控并对异常波动做根因分析。模拟投入产出比寻找最优杠杆点。',
                'impact': '高',
                'effort': '中',
            })
        elif finding['type'] == 'concentration':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'high',
                'title': '分散化策略',
                'content': '关注分布均衡性，评估集中度风险并制定缓解方案，设定改善目标。',
                'impact': '高',
                'effort': '中',
            })
        elif finding['type'] == 'ranking_shake':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'high',
                'title': '异动跟进',
                'content': '对排名剧烈变化的分组逐项排查原因，形成异动跟踪台账，每周更新。',
                'impact': '高',
                'effort': '中',
            })
        elif finding['type'] == 'missing_data':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'high',
                'title': '数据质量提升',
                'content': '优先补全高缺失率字段，建立数据录入校验规则，防止新增脏数据。',
                'impact': '高',
                'effort': '中',
            })
        elif finding['type'] == 'distribution_anomaly':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'medium',
                'title': '异常值核查',
                'content': '对离群记录逐条核实来源，区分真实异常与录入错误后再决定保留或修正。',
                'impact': '中',
                'effort': '中',
            })
        elif finding['type'] == 'top_share':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'medium',
                'title': '结构优化',
                'content': '分析头部集中原因，评估是否需要拓展品类/区域以分散风险。',
                'impact': '中',
                'effort': '中',
            })
        elif finding['type'] == 'generic_correlation':
            rec_id += 1
            recommendations.append({
                'id': rec_id,
                'priority': 'low',
                'title': '联动指标监控',
                'content': '将强相关指标纳入同一看板，便于联动分析与异常联动预警。',
                'impact': '中',
                'effort': '低',
            })

    # ---- 生成行动计划（基于 findings 模板）----
    if findings:
        action_plans = _generate_action_plans(findings, leader_val)

    return {
        'summary': summary,
        'findings': findings,
        'recommendations': recommendations,
        'action_plans': action_plans,
        'generated_at': datetime.datetime.now().isoformat(),
    }


def get_all_actions():
    return _load_actions()


def bulk_create_actions(session_id, plans):
    """一次读-改-写批量创建行动计划，保留 plan 中已有 id。"""
    actions = _load_actions()
    now = datetime.datetime.now().isoformat()
    created = []
    for plan in plans:
        action = dict(plan)
        if not action.get('id'):
            action['id'] = str(uuid.uuid4())[:8]
        action.setdefault('status', 'pending')
        action.setdefault('progress', 0)
        action.setdefault('created_at', now)
        action['updated_at'] = now
        created.append(action)
    actions[session_id] = created
    _save_actions(actions)
    return created


def create_action(session_id, action):
    actions = _load_actions()
    aid = str(uuid.uuid4())[:8]
    now = datetime.datetime.now().isoformat()
    action['id'] = aid
    action['created_at'] = now
    action['updated_at'] = now
    action['status'] = 'pending'
    action['progress'] = 0
    if session_id not in actions:
        actions[session_id] = []
    actions[session_id].append(action)
    _save_actions(actions)
    return action


def update_action(session_id, action_id, updates):
    actions = _load_actions()
    if session_id not in actions:
        return None
    for a in actions[session_id]:
        if a['id'] == action_id:
            a.update(updates)
            a['updated_at'] = datetime.datetime.now().isoformat()
            completed = sum(1 for s in a.get('steps', []) if s.startswith('✓'))
            total = len(a.get('steps', []))
            a['progress'] = round(completed / total * 100) if total > 0 else 0
            if a['progress'] >= 100:
                a['status'] = 'completed'
            _save_actions(actions)
            return a
    return None


def delete_action(session_id, action_id):
    actions = _load_actions()
    if session_id not in actions:
        return False
    actions[session_id] = [a for a in actions[session_id] if a['id'] != action_id]
    _save_actions(actions)
    return True


# ============================================================
# 行动计划模板生成
# ============================================================

def _make_action_plan(category, title, description, owner, days, kpi, priority, steps, plan_date):
    return {
        'id': str(uuid.uuid4())[:8],
        'category': category,
        'title': title,
        'description': description,
        'owner': owner,
        'deadline': (datetime.datetime.now() + datetime.timedelta(days=days)).strftime('%Y-%m-%d'),
        'measurable_kpi': kpi,
        'priority': priority,
        'steps': steps,
        'created_at': plan_date,
        'status': 'pending',
        'progress': 0,
    }


def _generate_action_plans(findings, leader_val=None):
    """根据 findings 类型匹配行动计划模板，避免固定文案。"""
    plan_date = datetime.datetime.now().strftime('%Y-%m-%d')
    action_plans = []
    added_types = set()

    templates = {
        'risk': ('risk', '尾部问题诊断与整改', 'high', 14, '风险信号数降低至0',
                 ['收集详细数据', '组织评审会议', '输出整改方案', '落实整改措施', '效果复盘']),
        'missing_data': ('risk', '数据质量清洗计划', 'high', 10, '缺失率降至5%以下',
                         ['盘点缺失字段', '制定补全规则', '执行清洗', '验证数据完整性']),
        'distribution_anomaly': ('risk', '异常值核查与处理', 'medium', 14, '异常记录核查完成率100%',
                                 ['标记异常记录', '追溯数据来源', '确认处理方案', '更新数据']),
        'concentration': ('risk', '集中度风险缓解', 'high', 30, 'Top3占比下降10%',
                          ['评估集中风险', '制定分散策略', '执行调整', '持续监控']),
        'top_share': ('growth', '分布均衡优化', 'medium', 30, 'Top3占比下降10%',
                      ['分析集中原因', '制定分散策略', '试点执行', '跟踪效果']),
        'champion': ('growth', '领先经验推广', 'medium', 30,
                     f'{leader_val or "核心指标"}提升5%',
                     ['复盘领先者经验', '形成SOP', '试点推广', '效果评估']),
        'opportunity': ('growth', '效率提升推广', 'medium', 30, '目标分组指标提升10%',
                        ['分析效率优势', '提炼最佳实践', '推广执行', '效果复盘']),
        'trend': ('growth', '趋势干预计划', 'medium', 30, '下滑指标恢复至基准线',
                  ['定位下滑原因', '制定干预方案', '执行调整', '跟踪恢复进度']),
        'correlation': ('growth', '杠杆指标优化', 'medium', 30, '关键指标改善10%',
                        ['识别驱动指标', '制定优化方案', '执行监控', '效果评估']),
        'generic_correlation': ('monitoring', '关联指标联动监控', 'medium', 21, '关键联动指标纳入看板',
                                ['确定联动指标对', '配置监控看板', '设置预警阈值', '定期复盘']),
        'ranking_shake': ('risk', '排名异动跟进', 'high', 14, '异动台账每周更新',
                          ['建立异动台账', '逐项排查原因', '制定应对策略', '每周复盘']),
    }

    for finding in findings:
        ftype = finding['type']
        if ftype not in templates or ftype in added_types:
            continue
        cat, title, priority, days, kpi, steps = templates[ftype]
        action_plans.append(_make_action_plan(
            cat, title, finding['content'][:120], '数据分析团队', days, kpi, priority, steps, plan_date,
        ))
        added_types.add(ftype)

    severity_count = defaultdict(int)
    for f in findings:
        severity_count[f['severity']] += 1

    if severity_count.get('error', 0) > 0 and 'risk' not in added_types and 'missing_data' not in added_types:
        action_plans.append(_make_action_plan(
            'risk', '综合风险排查', '针对识别出的风险信号制定整改计划',
            '数据分析团队', 14, '风险信号数降低至0', 'high',
            ['汇总风险清单', '组织评审会议', '输出整改方案', '落实整改措施', '效果复盘'],
            plan_date,
        ))
        added_types.add('_fallback_risk')

    if severity_count.get('warning', 0) > 0 and not any(p['category'] == 'growth' for p in action_plans):
        action_plans.append(_make_action_plan(
            'growth', '改进机会推进计划', '针对识别出的机会点制定改进策略',
            '团队', 30, f'{leader_val or "核心指标"}改善10%', 'medium',
            ['确定优先级排序', '制定方案', '启动试点执行', '数据跟踪与调优', '规模化推广'],
            plan_date,
        ))

    action_plans.append(_make_action_plan(
        'monitoring', '持续监控与预警', '建立核心指标监控看板，每周自动生成分析报告',
        '系统自动', 7, '每周报告准时产出率100%', 'low',
        ['确定监控指标体系', '配置自动化报告', '设置预警阈值', '通知相关人员'],
        plan_date,
    ))

    return action_plans


# ============================================================
# 场景识别 + 针对性分析
# ============================================================

def _detect_scenario(df, numeric_cols, string_cols):
    """识别数据场景：成绩单 / 销售数据 / 汽车数据 / 通用"""
    all_cols_lower = ' '.join(str(c).lower() for c in df.columns)

    # 成绩单场景
    score_keywords = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理',
                      '总分', '平均分', '学号', '姓名', '班级', '成绩', 'score', 'grade']
    score_hits = sum(1 for kw in score_keywords if kw in all_cols_lower)
    if score_hits >= 3:
        return 'student_scores'

    # 销售数据场景
    sales_keywords = ['销售额', '利润', '销量', '营收', '收入', '成本', '月份', '地区', '产品']
    sales_hits = sum(1 for kw in sales_keywords if kw in all_cols_lower)
    if sales_hits >= 3:
        return 'sales'

    # 汽车数据场景
    car_keywords = ['车型', '品牌', '排量', '马力', '油耗', '售价', '销量', 'rank', '排名', '车系', '汽车']
    car_hits = sum(1 for kw in car_keywords if kw in all_cols_lower)
    if car_hits >= 3:
        return 'automobile'

    return 'generic'


def _analyze_student_scores(df, numeric_cols, string_cols):
    """学生成绩单针对性分析"""
    findings = []

    # 找出科目列（排除学号、准考证号、总分、排名、名次、班次、校次等非科目数值列）
    exclude_kw = ['总分', '平均分', '排名', '名次', '学号', '准考证号', '座位号',
                  '班级', '班次', '校次', 'rank', 'count', 'id', '编号', '序号',
                  '原始分', '等级', '校名', '校方向', '校赋分', '校选考']
    subject_cols = [c for c in numeric_cols
                    if not any(kw in str(c) for kw in exclude_kw)
                    and not any(kw.lower() in str(c).lower() for kw in ['id', 'rank', 'count'])
                    and df[c].nunique() > 3]

    if not subject_cols:
        return findings

    # 1. 偏科分析 —— 每个学生的各科标准差
    name_col = None
    for c in string_cols:
        if '姓名' in c or 'name' in c.lower():
            name_col = c
            break
    if not name_col and string_cols:
        name_col = string_cols[0]

    if name_col and len(subject_cols) >= 3:
        # 计算每个学生的各科Z-score标准差
        z_scores = df[subject_cols].apply(lambda x: (x - x.mean()) / x.std() if x.std() > 0 else 0)
        df_z_std = z_scores.std(axis=1)
        df_mean = df[subject_cols].mean(axis=1)
        # 偏科 = Z分数标准差大（各科成绩波动大）
        imbalanced = df_z_std.nlargest(5)
        for idx in imbalanced.index:
            student = df.loc[idx, name_col]
            scores = {subj: int(df.loc[idx, subj]) for subj in subject_cols if pd.notna(df.loc[idx, subj])}
            best = max(scores, key=scores.get)
            worst = min(scores, key=scores.get)
            gap = scores[best] - scores[worst]
            if gap >= 20:  # 最高最低分差>=20才算偏科
                findings.append({
                    'type': 'imbalance',
                    'title': f'偏科预警: {student}',
                    'severity': 'error',
                    'content': f'各科差异显著（最高{best}{scores[best]}分 vs 最低{worst}{scores[worst]}分，差距{gap}分）。'
                               f'建议重点关注{worst}学科的辅导提升。',
                })

    # 2. 科目难度分析 —— 各科平均分对比
    if len(subject_cols) >= 2:
        avg_scores = {subj: round(float(df[subj].mean()), 1) for subj in subject_cols}
        sorted_subs = sorted(avg_scores.items(), key=lambda x: x[1])
        easiest = sorted_subs[-1]
        hardest = sorted_subs[0]
        gap = round(easiest[1] - hardest[1], 1)
        findings.append({
            'type': 'difficulty',
            'title': '科目难度分析',
            'severity': 'info',
            'content': f'全班平均分最高: {easiest[0]}({easiest[1]}分)，最低: {hardest[0]}({hardest[1]}分)，'
                       f'差距{gap}分。{hardest[0]}可能难度偏高或学生掌握不足，建议加强该科目教学。',
        })

    # 3. 科目相关性分析 —— 哪些科目成绩正相关
    if len(subject_cols) >= 3:
        corr = df[subject_cols].corr()
        pairs = []
        for i in range(len(subject_cols)):
            for j in range(i + 1, len(subject_cols)):
                r = corr.iloc[i, j]
                if abs(r) >= 0.5:
                    pairs.append((subject_cols[i], subject_cols[j], round(float(r), 2)))
        if pairs:
            pairs.sort(key=lambda x: abs(x[2]), reverse=True)
            top_pair = pairs[0]
            direction = '正' if top_pair[2] > 0 else '负'
            findings.append({
                'type': 'correlation',
                'title': '学科关联性',
                'severity': 'warning',
                'content': f'{top_pair[0]}与{top_pair[1]}存在显著{direction}相关(r={top_pair[2]})。'
                           f'{"两科学习可能相互促进" if direction == "正" else "可能存在学习时间冲突"}。',
            })

    # 4. 优生/后进生识别
    if name_col and len(subject_cols) >= 2:
        avg = df[subject_cols].mean(axis=1)
        top_students = avg.nlargest(3)
        bottom_students = avg.nsmallest(3)
        top_names = [str(df.loc[idx, name_col]) for idx in top_students.index]
        bottom_names = [str(df.loc[idx, name_col]) for idx in bottom_students.index]
        findings.append({
            'type': 'ranking',
            'title': '成绩梯队分析',
            'severity': 'info',
            'content': f'表现优异: {", ".join(top_names)}（均分{top_students.mean():.1f}）；'
                       f'需要关注: {", ".join(bottom_names)}（均分{bottom_students.mean():.1f}）。'
                       f'建议对后进生开展针对性辅导，缩小差距。',
        })

    # 5. 班级整体水平
    class_col = None
    for c in string_cols:
        if '班级' in c or 'class' in c.lower():
            class_col = c
            break
    if class_col and len(subject_cols) >= 2:
        class_avg = df.groupby(class_col)[subject_cols].mean().mean(axis=1).sort_values(ascending=False)
        if len(class_avg) >= 2:
            best_class = class_avg.index[0]
            worst_class = class_avg.index[-1]
            findings.append({
                'type': 'class_compare',
                'title': '班级对比',
                'severity': 'warning',
                'content': f'班级「{best_class}」整体均分最高({class_avg.iloc[0]:.1f})，'
                           f'「{worst_class}」最低({class_avg.iloc[-1]:.1f})。'
                           f'建议交流{best_class}的教学经验。',
            })

    return findings


def _analyze_generic(df, numeric_cols, string_cols):
    """通用数据场景：缺失值、分布异常、Top N 占比、相关性摘要。"""
    findings = []

    # 1. 缺失值率
    total_cells = df.shape[0] * df.shape[1]
    if total_cells > 0:
        missing_count = int(df.isna().sum().sum())
        missing_pct = round(missing_count / total_cells * 100, 1)
        if missing_pct >= 1:
            worst = df.isna().mean().sort_values(ascending=False)
            worst = worst[worst > 0].head(3)
            col_desc = '、'.join(
                f'"{c}"({round(v * 100, 1)}%)' for c, v in worst.items()
            ) if len(worst) > 0 else '无明显集中列'
            findings.append({
                'type': 'missing_data',
                'title': '缺失值分析',
                'severity': 'error' if missing_pct > 20 else 'warning' if missing_pct > 5 else 'info',
                'content': f'整体缺失率 {missing_pct}%（{missing_count}/{total_cells} 单元格）。'
                           f'缺失较多列：{col_desc}。建议补全或清洗后再做深度分析。',
            })

    # 2. Top N 分类占比
    category_col = None
    for c in string_cols:
        if 2 <= df[c].nunique() <= 50:
            category_col = c
            break
    if category_col and numeric_cols:
        leader = numeric_cols[0]
        try:
            grouped = df.groupby(category_col)[leader].sum().sort_values(ascending=False)
            if len(grouped) >= 3 and grouped.sum() > 0:
                top3_share = round(grouped.head(3).sum() / grouped.sum() * 100, 1)
                top_names = [str(n) for n in grouped.head(3).index.tolist()]
                if top3_share >= 50:
                    findings.append({
                        'type': 'top_share',
                        'title': f'Top3 {leader} 占比',
                        'severity': 'warning' if top3_share < 80 else 'error',
                        'content': f'按 "{category_col}" 分组，"{", ".join(top_names)}" '
                                   f'占据 {top3_share}% 的 {leader}，分布高度集中。',
                    })
        except (ValueError, TypeError, KeyError):
            pass

    # 3. 数值列分布异常（IQR 离群）
    for col in numeric_cols[:6]:
        try:
            vals = pd.to_numeric(df[col], errors='coerce').dropna()
            if len(vals) < 10:
                continue
            q1, q3 = vals.quantile(0.25), vals.quantile(0.75)
            iqr = q3 - q1
            if iqr <= 0:
                continue
            outliers = vals[(vals < q1 - 1.5 * iqr) | (vals > q3 + 1.5 * iqr)]
            outlier_pct = round(len(outliers) / len(vals) * 100, 1)
            if outlier_pct >= 5:
                findings.append({
                    'type': 'distribution_anomaly',
                    'title': f'{col} 分布异常',
                    'severity': 'error' if outlier_pct >= 15 else 'warning',
                    'content': f'"{col}" 约 {outlier_pct}% 的值为异常离群点（IQR 法），'
                               f'范围 [{round(float(vals.min()), 2)} ~ {round(float(vals.max()), 2)}]。'
                               f'建议核查数据来源与录入准确性。',
                })
                break
        except (ValueError, TypeError):
            pass

    # 4. 列间相关性摘要
    cols_for_corr = numeric_cols[:8]
    if len(cols_for_corr) >= 2:
        try:
            corr = df[cols_for_corr].corr()
            pairs = []
            for i in range(len(cols_for_corr)):
                for j in range(i + 1, len(cols_for_corr)):
                    r = corr.iloc[i, j]
                    if pd.notna(r) and abs(r) >= 0.5:
                        pairs.append((cols_for_corr[i], cols_for_corr[j], round(float(r), 2)))
            if pairs:
                pairs.sort(key=lambda x: abs(x[2]), reverse=True)
                top = pairs[0]
                direction = '正' if top[2] > 0 else '负'
                findings.append({
                    'type': 'generic_correlation',
                    'title': '列间相关性摘要',
                    'severity': 'info',
                    'content': f'共发现 {len(pairs)} 对强相关列。最强："{top[0]}" 与 "{top[1]}" '
                               f'({direction}相关 r={top[2]})。可考虑合并冗余指标或建立联动监控。',
                })
        except (ValueError, TypeError):
            pass

    return findings


def _analyze_sales(df, numeric_cols, string_cols):
    """销售数据针对性分析"""
    findings = []

    # 找关键列
    sales_col = None
    profit_col = None
    time_col = None
    category_col = None
    region_col = None

    for c in df.columns:
        c_lower = str(c).lower()
        if '销售额' in c or '营收' in c or '收入' in c or 'revenue' in c_lower:
            sales_col = c
        elif '利润' in c or 'profit' in c_lower:
            profit_col = c
        elif any(kw in c for kw in ['月', '年', '季', '日期']) or 'date' in c_lower:
            time_col = c
        elif any(kw in c for kw in ['产品', '品类', '类别', '商品']) and df[c].nunique() <= 30:
            category_col = c
        elif any(kw in c for kw in ['地区', '区域', '城市']) and df[c].nunique() <= 30:
            region_col = c

    # 1. 利润率分析
    if sales_col and profit_col:
        total_sales = df[sales_col].sum()
        total_profit = df[profit_col].sum()
        if total_sales > 0:
            profit_rate = round(total_profit / total_sales * 100, 1)
            severity = 'success' if profit_rate > 20 else 'warning' if profit_rate > 10 else 'error'
            findings.append({
                'type': 'profit_rate',
                'title': '整体利润率',
                'severity': severity,
                'content': f'总销售额{int(total_sales)}，总利润{int(total_profit)}，利润率{profit_rate}%。'
                           + ('盈利能力优秀' if profit_rate > 20 else '利润率偏低，需优化成本' if profit_rate < 10 else ''),
            })

    # 2. 产品/品类排名
    if sales_col and category_col:
        cat_sales = df.groupby(category_col)[sales_col].sum().sort_values(ascending=False)
        if len(cat_sales) >= 3:
            top1 = cat_sales.index[0]
            top1_val = int(cat_sales.iloc[0])
            bottom_val = int(cat_sales.iloc[-1])
            findings.append({
                'type': 'category_rank',
                'title': '产品排名',
                'severity': 'info',
                'content': f'「{top1}」销售额最高({top1_val})，占比{cat_sales.iloc[0]/cat_sales.sum()*100:.1f}%。'
                           f'末位产品销售额仅{bottom_val}。',
            })

    # 3. 地区对比
    if sales_col and region_col:
        region_sales = df.groupby(region_col)[sales_col].sum().sort_values(ascending=False)
        if len(region_sales) >= 2:
            best_region = region_sales.index[0]
            worst_region = region_sales.index[-1]
            findings.append({
                'type': 'region_compare',
                'title': '地区对比',
                'severity': 'warning',
                'content': f'「{best_region}」销售最佳({int(region_sales.iloc[0])})，'
                           f'「{worst_region}」最弱({int(region_sales.iloc[-1])})。'
                           f'建议在弱势区域加大市场投入或调研原因。',
            })

    # 4. 趋势分析
    if time_col and sales_col:
        time_order = [f'{i}月' for i in range(1, 13)] + ['Q1', 'Q2', 'Q3', 'Q4']
        time_sales = df.groupby(time_col)[sales_col].sum()
        if len(time_sales) >= 3:
            try:
                time_sales = time_sales.reindex([t for t in time_order if t in time_sales.index])
            except Exception:
                pass
            if len(time_sales) >= 3:
                first_half = time_sales.iloc[:len(time_sales)//2].mean()
                second_half = time_sales.iloc[len(time_sales)//2:].mean()
                change = (second_half - first_half) / first_half * 100 if first_half > 0 else 0
                direction = '上升' if change > 5 else '下降' if change < -5 else '平稳'
                findings.append({
                    'type': 'trend',
                    'title': '销售趋势',
                    'severity': 'success' if change > 0 else 'error' if change < 0 else 'info',
                    'content': f'前半段平均{first_half:.0f}，后半段平均{second_half:.0f}，'
                               f'趋势{direction}({change:+.1f}%)。',
                })

    # 5. 销量与广告投入相关性
    ad_col = None
    for c in numeric_cols:
        if '广告' in c or '投入' in c or 'ad' in str(c).lower():
            ad_col = c
            break
    if ad_col and sales_col:
        try:
            corr = round(float(df[ad_col].corr(df[sales_col])), 2)
            if abs(corr) >= 0.5:
                findings.append({
                    'type': 'ad_correlation',
                    'title': '广告投入与销售相关性',
                    'severity': 'warning',
                    'content': f'相关系数{corr}，{"强正" if corr > 0 else "强负"}相关。'
                               f'广告投入每增加1单位，销售额预计{"提升" if corr > 0 else "下降"}约{abs(corr)*100:.0f}%。',
                })
        except (ValueError, TypeError):
            pass

    return findings


def _analyze_automobile(df, numeric_cols, string_cols):
    """汽车数据针对性分析"""
    findings = []

    brand_col = None
    rank_col = None
    price_col = None
    sales_col = None

    for c in df.columns:
        c_lower = str(c).lower()
        if ('品牌' in c or 'brand' in c_lower) and df[c].dtype == 'object':
            brand_col = c
        elif '排名' in c or 'rank' in c_lower:
            rank_col = c
        elif '售价' in c or '价格' in c or 'price' in c_lower:
            price_col = c
        elif '销量' in c or 'sales' in c_lower:
            sales_col = c

    # 1. 品牌销量排名
    if brand_col and sales_col:
        brand_sales = df.groupby(brand_col)[sales_col].sum().sort_values(ascending=False)
        if len(brand_sales) >= 3:
            top3 = brand_sales.head(3)
            findings.append({
                'type': 'brand_rank',
                'title': '品牌销量TOP3',
                'severity': 'success',
                'content': f'销量前三: {", ".join(f"{b}({int(v)})" for b, v in top3.items())}。'
                           f'三者合计占总销量{top3.sum()/brand_sales.sum()*100:.1f}%。',
            })

    # 2. 价格区间分析
    if price_col:
        prices = df[price_col].dropna()
        if len(prices) > 5:
            avg_price = prices.mean()
            median_price = prices.median()
            findings.append({
                'type': 'price_analysis',
                'title': '价格分析',
                'severity': 'info',
                'content': f'平均售价{avg_price:.1f}万，中位数{median_price:.1f}万。'
                           f'{"高端车型偏多" if avg_price > median_price * 1.2 else "价格分布较均匀"}。',
            })

    # 3. 价格与销量关系
    if price_col and sales_col:
        try:
            corr = round(float(df[price_col].corr(df[sales_col])), 2)
            if abs(corr) >= 0.3:
                direction = '越便宜销量越高' if corr < 0 else '越贵反而越畅销'
                findings.append({
                    'type': 'price_sales',
                    'title': '价格与销量关系',
                    'severity': 'warning',
                    'content': f'相关系数{corr}，{direction}。'
                               f'{"价格敏感型市场，建议主打性价比" if corr < 0 else "品牌溢价明显，高端策略有效"}。',
                })
        except (ValueError, TypeError):
            pass

    # 4. 排名分布
    if rank_col:
        top10 = df[df[rank_col] <= 10]
        if len(top10) > 0 and brand_col:
            top_brands = top10[brand_col].value_counts().head(3)
            findings.append({
                'type': 'top_rank',
                'title': 'TOP10品牌分布',
                'severity': 'info',
                'content': f'前十名中: {", ".join(f"{b}({c}款" for b, c in top_brands.items())})。'
                           f'头部品牌集中度高。',
            })

    return findings
