"""
数据处理 API 模块
==================
为前端 ECharts 交互式图表提供 JSON 数据接口。
支持：原始数据返回、数据筛选、数据透视、计算列、多数据集对比。
"""

import ast
import operator
import os
import json
import math
import pandas as pd
import numpy as np
from typing import Any

_SAFE_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}
_SAFE_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _safe_eval_formula(formula: str, namespace: dict) -> Any:
    """白名单 AST 求值：仅允许列名、数字、+ - * / 和括号。"""
    try:
        tree = ast.parse(formula, mode='eval')
    except SyntaxError as e:
        raise ValueError(f'公式语法错误: {e}') from e

    def _eval_node(node):
        if isinstance(node, ast.Expression):
            return _eval_node(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError('只允许数字常量')
        if isinstance(node, ast.Num):
            return node.n
        if isinstance(node, ast.Name):
            if node.id not in namespace:
                raise ValueError(f'未知列名: {node.id}')
            return namespace[node.id]
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in _SAFE_BINOPS:
                raise ValueError('不允许的运算符，仅支持 + - * /')
            return _SAFE_BINOPS[op_type](_eval_node(node.left), _eval_node(node.right))
        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in _SAFE_UNARYOPS:
                raise ValueError('不允许的一元运算符')
            return _SAFE_UNARYOPS[op_type](_eval_node(node.operand))
        raise ValueError('不允许的表达式结构')

    return _eval_node(tree)


def _read_csv_safe(path: str) -> pd.DataFrame:
    """安全读取CSV，自动检测编码，并尝试转换数值列"""
    for enc in ['utf-8', 'utf-8-sig', 'gb18030', 'gbk', 'latin1']:
        try:
            df = pd.read_csv(path, encoding=enc)
            return _try_convert_numeric(df)
        except (UnicodeDecodeError, Exception):
            continue
    df = pd.read_csv(path, encoding='utf-8', errors='replace')
    return _try_convert_numeric(df)


def _try_convert_numeric(df: pd.DataFrame) -> pd.DataFrame:
    """将 object 列中的数值转换为 float，'-' 等占位符转为 NaN"""
    PLACEHOLDER_VALS = ['-', '--', '---', '/', '\\', '无', '缺考', '免考', '未考',
                        'N/A', 'NA', 'na', 'n/a', 'null', 'NULL', 'None', 'none', '']
    for col in df.columns:
        if df[col].dtype != 'object':
            continue
        col_data = df[col].dropna()
        if len(col_data) == 0:
            continue
        col_clean = col_data.astype(str).str.strip()
        # pandas 3.x: 必须用 Series.replace() 而非 str.replace() 来替换为 NaN
        cleaned = col_clean.replace(PLACEHOLDER_VALS, np.nan)
        numeric_vals = pd.to_numeric(cleaned, errors='coerce')
        valid_ratio = numeric_vals.notna().sum() / len(col_data)
        if valid_ratio >= 0.25:
            col_full = df[col].astype(str).str.strip()
            cleaned_full = col_full.replace(PLACEHOLDER_VALS, np.nan)
            df[col] = pd.to_numeric(cleaned_full, errors='coerce')
    return df


def _read_excel_safe(path: str) -> pd.DataFrame:
    """安全读取Excel文件(xlsx/xls)，自动跳过标题行，并尝试转换数值列"""
    ext = os.path.splitext(path)[1].lower()

    # 先读原始数据（不带header）检查前几行
    try:
        raw = pd.read_excel(path, header=None, nrows=3)
    except Exception:
        if ext == '.xls':
            raise ValueError('读取 .xls 文件失败，请将文件另存为 .xlsx 格式后重新上传')
        raise

    if len(raw) == 0:
        return pd.DataFrame()

    header_row = 0
    # 检测第0行是否是标题行（大量NaN）
    first_row_nan = raw.iloc[0].isna().sum()
    if first_row_nan >= len(raw.columns) * 0.7:
        header_row = 1

    # 检测第1行是否也是说明行（较少非空值）
    if header_row == 1 and len(raw) > 2:
        second_row_nan = raw.iloc[1].isna().sum()
        if second_row_nan >= len(raw.columns) * 0.7:
            header_row = 2

    try:
        df = pd.read_excel(path, header=header_row)
    except Exception:
        if ext == '.xls':
            raise ValueError('读取 .xls 文件失败，请将文件另存为 .xlsx 格式后重新上传')
        raise

    # 清理 Unnamed 列（合并单元格导致的空列名）
    df = df.loc[:, ~df.columns.astype(str).str.startswith('Unnamed')]
    # 清理空列
    df = df.dropna(axis=1, how='all')
    # 清理列名首尾空格
    df.columns = [str(c).strip() if c is not None else f'列{i}' for i, c in enumerate(df.columns)]

    # 尝试将包含数值的 object 列转为 numeric
    df = _try_convert_numeric(df)

    return df


def _read_data_safe(path: str) -> pd.DataFrame:
    """根据扩展名自动选择读取方式"""
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.xlsx', '.xls'):
        return _read_excel_safe(path)
    return _read_csv_safe(path)


_DF_CACHE: dict[tuple, pd.DataFrame] = {}
_DF_CACHE_ORDER: list[tuple] = []
_DF_CACHE_MAX = 16


def clear_dataframe_cache():
    """清空 DataFrame 缓存（测试或热重载时使用）。"""
    _DF_CACHE.clear()
    _DF_CACHE_ORDER.clear()


def load_dataframe(path: str) -> pd.DataFrame:
    """带 LRU 缓存的 DataFrame 加载，key = (abspath, mtime, size)。"""
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    abspath = os.path.abspath(path)
    stat = os.stat(abspath)
    key = (abspath, stat.st_mtime_ns, stat.st_size)
    cached = _DF_CACHE.get(key)
    if cached is not None:
        return cached
    df = _read_data_safe(abspath)
    _DF_CACHE[key] = df
    _DF_CACHE_ORDER.append(key)
    if len(_DF_CACHE_ORDER) > _DF_CACHE_MAX:
        oldest = _DF_CACHE_ORDER.pop(0)
        _DF_CACHE.pop(oldest, None)
    return df


def resolve_data_path(file_id: str, upload_dir: str, sample_file: str) -> str | None:
    if file_id == "sample":
        return sample_file if os.path.exists(sample_file) else None
    return find_upload_file(upload_dir, file_id)


def find_upload_file(upload_dir: str, file_id: str) -> str | None:
    """在uploads目录中查找file_id对应的文件(扩展名不固定)"""
    for ext in ['.csv', '.xlsx', '.xls']:
        path = os.path.join(upload_dir, f'{file_id}{ext}')
        if os.path.exists(path):
            return path
    return None


def _sanitize_json_value(val):
    if val is None or val is pd.NA:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return None if np.isnan(val) else round(float(val), 4)
    if isinstance(val, float):
        return None if val != val else round(val, 4)
    if isinstance(val, int):
        return val
    if pd.isna(val):
        return None
    return str(val)


def _df_to_json(df: pd.DataFrame) -> list:
    """DataFrame 转为 JSON 安全的 list[dict]（向量化，避免 iterrows）。"""
    if df.empty:
        return []
    work = df.copy()
    float_cols = work.select_dtypes(include=['float', 'float32', 'float64']).columns
    if len(float_cols) > 0:
        work[float_cols] = work[float_cols].round(4)
    records = work.to_dict(orient='records')
    for rec in records:
        for key in list(rec.keys()):
            rec[key] = _sanitize_json_value(rec[key])
    return records


def get_column_types(df: pd.DataFrame) -> dict:
    """获取列类型分类: numeric / category / text"""
    types = {}
    for col in df.columns:
        if df[col].dtype in ('int64', 'float64', 'int32', 'float32'):
            types[col] = 'numeric'
        elif df[col].nunique() <= 30:
            types[col] = 'category'
        else:
            types[col] = 'text'
    return types


def filter_data(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    """
    数据筛选
    filters: {
        "column": {"type": "category"/"range"/"search", "values": [...] / "min": x, "max": y / "text": "..."}
    }
    """
    result = df.copy()
    for col, cond in filters.items():
        if col not in result.columns:
            continue
        ftype = cond.get('type')
        if ftype == 'category':
            values = cond.get('values', [])
            if values:
                result = result[result[col].astype(str).isin([str(v) for v in values])]
        elif ftype == 'range':
            mn = cond.get('min')
            mx = cond.get('max')
            if mn is not None:
                result = result[pd.to_numeric(result[col], errors='coerce') >= float(mn)]
            if mx is not None:
                result = result[pd.to_numeric(result[col], errors='coerce') <= float(mx)]
        elif ftype == 'search':
            text = cond.get('text', '').strip()
            if text:
                result = result[result[col].astype(str).str.contains(text, case=False, na=False)]
    return result


def pivot_data(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """
    数据透视
    config: {
        "index": "列名",      # 行分组
        "columns": "列名",    # 列分组
        "values": "列名",     # 聚合值
        "aggfunc": "sum"/"mean"/"count"/"min"/"max"
    }
    """
    agg_map = {
        'sum': 'sum', 'mean': 'mean', 'count': 'count',
        'min': 'min', 'max': 'max',
    }
    aggfunc = agg_map.get(config.get('aggfunc', 'sum'), 'sum')
    try:
        pivot = pd.pivot_table(
            df,
            index=config['index'],
            columns=config['columns'],
            values=config['values'],
            aggfunc=aggfunc,
            fill_value=0,
        )
        pivot = pivot.reset_index()
        pivot.columns = [str(c) for c in pivot.columns]
        return pivot
    except Exception as e:
        raise ValueError(f'透视失败: {str(e)}')


def add_calculated_column(df: pd.DataFrame, config: dict) -> pd.DataFrame:
    """
    添加计算列
    config: {
        "name": "新列名",
        "formula": "A + B" / "A * 0.1" / "A / B * 100"
        A, B 为已有数值列名
    }
    """
    result = df.copy()
    name = config['name']
    formula = config['formula']
    try:
        namespace = {}
        for col in result.select_dtypes(include=[np.number]).columns:
            namespace[col] = pd.to_numeric(result[col], errors='coerce')
        result[name] = _safe_eval_formula(formula, namespace)
        # 处理 inf
        result[name] = result[name].replace([np.inf, -np.inf], np.nan)
    except Exception as e:
        raise ValueError(f'计算列创建失败: {str(e)}。请使用数值列名和 + - * / 运算符')
    return result


def aggregate_for_chart(df: pd.DataFrame, x_col: str, y_col: str,
                        aggfunc: str = 'sum') -> pd.DataFrame:
    """
    为图表聚合数据：按 x_col 分组聚合 y_col
    """
    if x_col not in df.columns or y_col not in df.columns:
        return df
    n_unique = df[x_col].nunique()
    if n_unique == len(df):
        return df  # 无重复，不聚合

    agg_map = {'sum': 'sum', 'mean': 'mean', 'count': 'count', 'min': 'min', 'max': 'max'}
    func = agg_map.get(aggfunc, 'sum')
    grouped = df.groupby(x_col, as_index=False).agg({y_col: func})

    # 时间排序
    time_order = [f'{i}月' for i in range(1, 13)] + ['Q1', 'Q2', 'Q3', 'Q4']
    x_vals = grouped[x_col].astype(str).tolist()
    if all(v in time_order for v in x_vals):
        grouped['_sort'] = grouped[x_col].map({v: i for i, v in enumerate(time_order)})
        grouped = grouped.sort_values('_sort').drop(columns=['_sort'])

    return grouped.reset_index(drop=True)


DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500
MAX_CHART_POINTS = 2000
MAX_TRANSFORM_ROWS = 500


def sort_dataframe(
    df: pd.DataFrame,
    sort_col: str | None,
    sort_dir: str = 'asc',
    column_types: dict | None = None,
) -> pd.DataFrame:
    """按列排序，数值列自动转 numeric。"""
    if not sort_col or sort_col not in df.columns:
        return df
    ascending = sort_dir != 'desc'
    types = column_types or get_column_types(df)
    if types.get(sort_col) == 'numeric':
        work = df.copy()
        work['_sort_key'] = pd.to_numeric(work[sort_col], errors='coerce')
        return (
            work.sort_values('_sort_key', ascending=ascending, na_position='last')
            .drop(columns=['_sort_key'])
            .reset_index(drop=True)
        )
    return (
        df.sort_values(sort_col, ascending=ascending, key=lambda s: s.astype(str), na_position='last')
        .reset_index(drop=True)
    )


def prepare_table_data(
    df: pd.DataFrame,
    offset: int = 0,
    limit: int = DEFAULT_PAGE_SIZE,
    sort_col: str | None = None,
    sort_dir: str = 'asc',
) -> tuple[pd.DataFrame, dict]:
    """筛选后排序 + 分页，供预览表使用。"""
    types = get_column_types(df)
    sorted_df = sort_dataframe(df, sort_col, sort_dir, types)
    page_df, page_meta = paginate_dataframe(sorted_df, offset, limit)
    if sort_col:
        page_meta['sort_col'] = sort_col
        page_meta['sort_dir'] = sort_dir
    return page_df, page_meta


def paginate_dataframe(df: pd.DataFrame, offset: int = 0, limit: int = DEFAULT_PAGE_SIZE) -> tuple[pd.DataFrame, dict]:
    """返回分页切片与分页元信息。"""
    total = len(df)
    offset = max(0, offset)
    limit = min(max(1, limit), MAX_PAGE_SIZE)
    end = min(offset + limit, total)
    return df.iloc[offset:end], {
        'row_count': total,
        'offset': offset,
        'limit': limit,
        'has_more': end < total,
    }


def get_filter_meta(df: pd.DataFrame) -> dict:
    """筛选面板元数据：分类列唯一值、数值列范围。"""
    types = get_column_types(df)
    meta: dict[str, dict] = {}
    for col in df.columns:
        col_type = types[col]
        if col_type == 'category':
            vals = df[col].astype(str).dropna().unique().tolist()[:50]
            meta[col] = {'type': 'category', 'values': vals}
        elif col_type == 'numeric':
            vals = pd.to_numeric(df[col], errors='coerce').dropna()
            if len(vals) > 0:
                meta[col] = {
                    'type': 'numeric',
                    'min': round(float(vals.min()), 4),
                    'max': round(float(vals.max()), 4),
                }
            else:
                meta[col] = {'type': 'numeric', 'min': 0, 'max': 100}
        else:
            meta[col] = {'type': 'text'}
    return meta


def _sort_chart_entries(x_vals: list, y_vals: list, sort_by: str) -> tuple[list, list]:
    entries = list(zip(x_vals, y_vals))
    if sort_by == 'value_desc':
        entries.sort(key=lambda e: e[1], reverse=True)
    elif sort_by == 'value_asc':
        entries.sort(key=lambda e: e[1])
    elif sort_by == 'name_asc':
        entries.sort(key=lambda e: str(e[0]))
    elif sort_by == 'name_desc':
        entries.sort(key=lambda e: str(e[0]), reverse=True)
    return [e[0] for e in entries], [e[1] for e in entries]


def _numeric_series(df: pd.DataFrame, col: str) -> pd.Series:
    return pd.to_numeric(df[col], errors='coerce')


def build_chart_series(df: pd.DataFrame, config: dict, max_points: int = MAX_CHART_POINTS) -> dict:
    """服务端图表序列构建，减轻前端大数据聚合压力。"""
    chart_type = config.get('type', 'bar')
    x_col = config.get('x_col', '')
    y_cols = config.get('y_cols') or []
    aggfunc = config.get('aggfunc', 'sum')
    sort_by = config.get('sort_by', 'none')

    agg_map = {'sum': 'sum', 'mean': 'mean', 'count': 'count', 'min': 'min', 'max': 'max'}
    pandas_agg = agg_map.get(aggfunc, 'sum')

    if chart_type in ('bar', 'line', 'area', 'funnel', 'radar'):
        if not x_col or not y_cols or x_col not in df.columns:
            return {'ready': False, 'reason': '请选择 X 轴和 Y 轴数据列'}
        valid_y = [c for c in y_cols if c in df.columns]
        if not valid_y:
            return {'ready': False, 'reason': '所选 Y 轴列无效'}

        work = df[[x_col] + valid_y].copy()
        for col in valid_y:
            work[col] = _numeric_series(work, col)

        grouped = work.groupby(x_col, dropna=False)
        primary = valid_y[0]
        primary_agg = grouped[primary].agg(pandas_agg)
        x_raw = [str(k) for k in primary_agg.index.tolist()]
        y_raw = [
            round(float(v), 2) if pd.notna(v) else 0
            for v in primary_agg.tolist()
        ]
        x_sorted, _ = _sort_chart_entries(x_raw, y_raw, sort_by)

        series = []
        for y_col in valid_y:
            agg_vals = grouped[y_col].agg(pandas_agg)
            y_map = {
                str(k): round(float(v), 2) if pd.notna(v) else 0
                for k, v in agg_vals.items()
            }
            series.append({'name': y_col, 'data': [y_map.get(x, 0) for x in x_sorted]})

        return {'ready': True, 'x': x_sorted, 'series': series}

    if chart_type == 'pie':
        if not x_col or not y_cols or x_col not in df.columns:
            return {'ready': False, 'reason': '请选择 X 轴和 Y 轴数据列'}
        y_col = y_cols[0]
        if y_col not in df.columns:
            return {'ready': False, 'reason': '所选 Y 轴列无效'}
        work = df[[x_col, y_col]].copy()
        work[y_col] = _numeric_series(work, y_col)
        grouped = work.groupby(x_col, dropna=False)[y_col].agg(pandas_agg)
        x_raw = [str(k) for k in grouped.index.tolist()]
        y_raw = [round(float(v), 2) if pd.notna(v) else 0 for v in grouped.tolist()]
        x_sorted, y_sorted = _sort_chart_entries(x_raw, y_raw, sort_by)
        pie_data = [{'name': x, 'value': y} for x, y in zip(x_sorted, y_sorted)]
        if len(pie_data) > 8:
            sorted_pie = sorted(pie_data, key=lambda p: p['value'], reverse=True)
            top7 = sorted_pie[:7]
            other_sum = sum(p['value'] for p in sorted_pie[7:])
            pie_data = top7 + [{'name': '其他', 'value': round(other_sum, 2)}]
        return {'ready': True, 'pie_data': pie_data}

    if chart_type == 'scatter':
        if not x_col or not y_cols:
            return {'ready': False, 'reason': '请选择 X 轴和 Y 轴数据列'}
        y_col = y_cols[0]
        if x_col not in df.columns or y_col not in df.columns:
            return {'ready': False, 'reason': '所选列无效'}
        work = df[[x_col, y_col]].copy()
        work[x_col] = _numeric_series(work, x_col)
        work[y_col] = _numeric_series(work, y_col)
        work = work.dropna()
        if len(work) > max_points:
            work = work.sample(n=max_points, random_state=42)
        points = [
            [round(float(r[x_col]), 4), round(float(r[y_col]), 4)]
            for _, r in work.iterrows()
        ]
        return {'ready': True, 'points': points, 'x_name': x_col, 'y_name': y_col}

    if chart_type == 'histogram':
        if not y_cols:
            return {'ready': False, 'reason': '请选择 Y 轴数据列'}
        y_col = y_cols[0]
        if y_col not in df.columns:
            return {'ready': False, 'reason': '所选 Y 轴列无效'}
        values = _numeric_series(df, y_col).dropna().tolist()
        if not values:
            return {'ready': False, 'reason': '该列无有效数值数据'}
        min_v = min(values)
        max_v = max(values)
        bin_count = min(20, math.ceil(math.sqrt(len(values))))
        bin_size = (max_v - min_v) / bin_count or 1
        bins = [0] * bin_count
        labels = []
        for i in range(bin_count):
            labels.append(f'{min_v + i * bin_size:.1f}-{min_v + (i + 1) * bin_size:.1f}')
        for v in values:
            idx = int((v - min_v) / bin_size)
            if idx >= bin_count:
                idx = bin_count - 1
            bins[idx] += 1
        return {'ready': True, 'x': labels, 'bins': bins}

    if chart_type == 'heatmap':
        all_numeric = [
            c for c in df.columns
            if _numeric_series(df, c).notna().any()
        ]
        selected = [c for c in y_cols if c in all_numeric] if y_cols else all_numeric
        labels = selected[:10]
        if len(labels) < 2:
            return {'ready': False, 'reason': '至少需要 2 个数值列才能生成相关性热力图'}
        corr_data = []
        for i, col_i in enumerate(labels):
            for j, col_j in enumerate(labels):
                r = float(df[[col_i, col_j]].apply(pd.to_numeric, errors='coerce').corr().iloc[0, 1])
                if r != r:
                    r = 0
                corr_data.append([j, i, round(r, 2)])
        return {'ready': True, 'labels': labels, 'corr_data': corr_data}

    if chart_type == 'boxplot':
        if not x_col or not y_cols or x_col not in df.columns:
            return {'ready': False, 'reason': '请选择 X 轴和 Y 轴数据列'}
        y_col = y_cols[0]
        if y_col not in df.columns:
            return {'ready': False, 'reason': '所选 Y 轴列无效'}
        work = df[[x_col, y_col]].copy()
        work[y_col] = _numeric_series(work, y_col)
        work = work.dropna(subset=[y_col])
        x_cats = []
        box_data = []
        for key, group in work.groupby(x_col, dropna=False):
            vals = sorted(group[y_col].tolist())
            if not vals:
                continue
            q1 = vals[int(len(vals) * 0.25)]
            median = vals[int(len(vals) * 0.5)]
            q3 = vals[int(len(vals) * 0.75)]
            iqr = q3 - q1
            lower = max(vals[0], q1 - 1.5 * iqr)
            upper = min(vals[-1], q3 + 1.5 * iqr)
            x_cats.append(str(key))
            box_data.append([
                round(lower, 2), round(q1, 2), round(median, 2), round(q3, 2), round(upper, 2),
            ])
        return {'ready': True, 'x': x_cats, 'box_data': box_data, 'y_name': y_col}

    return {'ready': False, 'reason': f'不支持的图表类型: {chart_type}'}


def get_numeric_stats(df: pd.DataFrame, col: str) -> dict:
    """获取数值列统计信息"""
    if col not in df.columns:
        return {}
    vals = pd.to_numeric(df[col], errors='coerce').dropna()
    if len(vals) == 0:
        return {}
    return {
        'count': int(len(vals)),
        'mean': round(float(vals.mean()), 4),
        'std': round(float(vals.std()), 4) if len(vals) > 1 else 0,
        'min': round(float(vals.min()), 4),
        'max': round(float(vals.max()), 4),
        'median': round(float(vals.median()), 4),
        'q1': round(float(vals.quantile(0.25)), 4),
        'q3': round(float(vals.quantile(0.75)), 4),
        'sum': round(float(vals.sum()), 4),
    }
