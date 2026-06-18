import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os
import re
import numpy as np
from app.services.data_api import _read_csv_safe

matplotlib.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False

CHART_DPI = 80

PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
           '#DDA0DD', '#F0E68C', '#87CEEB', '#FFB347', '#77DD77',
           '#FF6961', '#AEC6CF', '#F49AC2', '#B19CD9', '#FDFD96',
           '#84B819', '#779ECB', '#03C03C', '#FFD1DC', '#836953']


def _is_junk_col(name, series, total_rows):
    name_low = str(name).lower()
    if series.dtype == 'object':
        sample = series.dropna().head(20).astype(str)
        if sample.str.contains(r'^https?://', na=False).any():
            return True
        if sample.str.contains(r'\.(?:png|jpg|jpeg|gif|webp|svg|bmp)', na=False).any():
            return True
    if series.nunique() == 0:
        return True
    if series.nunique() == total_rows and series.dtype == 'object':
        suspect = True
        for v in series.dropna().head(10).astype(str):
            if not (re.search(r'[\u4e00-\u9fff]', v) or re.search(r'[a-zA-Z]', v)):
                suspect = False
                break
        if not suspect:
            return True
    return False


def _is_constant(series):
    if series.nunique() <= 1:
        return True
    if series.dtype in ('int64', 'float64') and series.sum() == 0:
        return True
    return False


def _detect_time_col(df, col, total_rows):
    if df[col].nunique() < 2:
        return False
    if df[col].nunique() > min(total_rows // 2, 60):
        return False
    vals = df[col].dropna().astype(str).tolist()
    time_kws = ['月', '季', '年', '季度', '周', 'Q', 'Mon', 'Jan', 'Feb', 'Mar',
                'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    match_count = sum(1 for v in vals if any(kw in v for kw in time_kws))
    return match_count >= len(vals) * 0.5


def _generate_pie(df, category_col, value_col, output_dir, top_n=8):
    grouped = df.groupby(category_col)[value_col].sum().sort_values(ascending=False)
    if len(grouped) > top_n:
        other_sum = grouped.iloc[top_n:].sum()
        grouped = grouped.iloc[:top_n]
        grouped['其他'] = other_sum

    n = len(grouped)
    colors = PALETTE[:n]

    fig, ax = plt.subplots(figsize=(10, 8))
    wedges, texts, autotexts = ax.pie(
        grouped.values, labels=grouped.index, autopct='%1.1f%%',
        colors=colors, startangle=90,
        shadow=True, textprops={'fontsize': 12}
    )
    for at in autotexts:
        at.set_fontsize(11)
        at.set_fontweight('bold')
    ax.set_title(f'{category_col} 分布 ({value_col})', fontsize=18, fontweight='bold')
    path = os.path.join(output_dir, 'pie_category.png')
    fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return 'pie_category.png', grouped


def _generate_line(df, time_col, category_col, value_col, output_dir):
    pivot = df.groupby([time_col, category_col])[value_col].sum().unstack()
    if len(pivot) < 2 or len(pivot) > 36:
        return None, None

    fig, ax = plt.subplots(figsize=(12, 7))
    markers = ['o', 's', 'D', '^', 'v', 'p', '*', 'X']
    for i, col_name in enumerate(pivot.columns):
        ax.plot(range(len(pivot.index)), pivot[col_name],
                marker=markers[i % len(markers)], linewidth=2.5,
                markersize=8, label=str(col_name), color=PALETTE[i % len(PALETTE)])
    ax.set_xticks(range(len(pivot.index)))
    ax.set_xticklabels(pivot.index.tolist(), fontsize=11)
    ax.set_ylabel(value_col, fontsize=13)
    ax.set_title(f'{value_col} 趋势变化', fontsize=18, fontweight='bold')
    ax.legend(fontsize=11, loc='upper left')
    ax.grid(True, alpha=0.3, linestyle='--')
    path = os.path.join(output_dir, 'line_trend.png')
    fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return 'line_trend.png', pivot


def _generate_bar(df, group_col, col1, col2, output_dir, top_n=15, horizontal=False):
    grouped = df.groupby(group_col).agg({col1: 'sum', col2: 'sum'}).sort_values(col1, ascending=False)
    if len(grouped) > top_n:
        grouped = grouped.head(top_n)

    if horizontal:
        fig, ax = plt.subplots(figsize=(10, max(6, len(grouped) * 0.4)))
        y = range(len(grouped))
        height = 0.35
        ax.barh([i - height/2 for i in y], grouped[col1].values, height,
                label=col1, color='#FF6B6B', edgecolor='white', linewidth=0.5)
        ax.barh([i + height/2 for i in y], grouped[col2].values, height,
                label=col2, color='#4ECDC4', edgecolor='white', linewidth=0.5)
        ax.set_yticks(y)
        ax.set_yticklabels(grouped.index.tolist(), fontsize=10)
        ax.set_xlabel('数值', fontsize=12)
        ax.invert_yaxis()
    else:
        fig, ax = plt.subplots(figsize=(12, 7))
        x = range(len(grouped))
        width = 0.35
        ax.bar([i - width/2 for i in x], grouped[col1].values, width,
               label=col1, color='#FF6B6B', edgecolor='white', linewidth=0.5)
        ax.bar([i + width/2 for i in x], grouped[col2].values, width,
               label=col2, color='#4ECDC4', edgecolor='white', linewidth=0.5)
        ax.set_xticks(x)
        ax.set_xticklabels(grouped.index.tolist(), fontsize=9, rotation=45, ha='right')

    ax.set_title(f'{group_col} {col1}/{col2} 对比', fontsize=18, fontweight='bold')
    ax.legend(fontsize=12)
    path = os.path.join(output_dir, 'bar_region.png')
    fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return 'bar_region.png', grouped


def _generate_scatter(df, col_x, col_y, col_size, category_col, output_dir, top_brands=8):
    fig, ax = plt.subplots(figsize=(12, 7))

    if category_col:
        brand_counts = df[category_col].value_counts()
        top = brand_counts.head(top_brands).index.tolist()
        for i, cat in enumerate(top):
            cat_data = df[df[category_col] == cat]
            if len(cat_data) == 0:
                continue
            s_vals = cat_data[col_size].values if col_size else 80
            if col_size and isinstance(s_vals, np.ndarray) and len(s_vals) > 0:
                mean_s = s_vals.mean()
                s_vals = s_vals / (mean_s / 80) if mean_s > 0 else 80
            ax.scatter(cat_data[col_x], cat_data[col_y],
                       s=s_vals, alpha=0.6, label=str(cat),
                       c=PALETTE[i % len(PALETTE)], edgecolors='white', linewidth=0.5)
        other = df[~df[category_col].isin(top)]
        if len(other) > 0:
            ax.scatter(other[col_x], other[col_y],
                       s=30, alpha=0.2, label='其他', c='#CCCCCC', edgecolors='white', linewidth=0.5)
    else:
        ax.scatter(df[col_x], df[col_y],
                   s=60, alpha=0.7, c='#FF6B6B', edgecolors='white', linewidth=0.5)

    ax.set_xlabel(col_x, fontsize=13)
    ax.set_ylabel(col_y, fontsize=13)
    size_desc = f' (气泡={col_size})' if col_size else ''
    ax.set_title(f'{col_x} vs {col_y}{size_desc}', fontsize=18, fontweight='bold')
    ax.legend(fontsize=9, loc='lower right', ncol=2)
    ax.grid(True, alpha=0.3, linestyle='--')
    path = os.path.join(output_dir, 'scatter_ad.png')
    fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return 'scatter_ad.png'


def _generate_rank_line(df, rank_col, value_col, output_dir, category_col=None):
    df_sorted = df.sort_values(rank_col, ascending=True)
    fig, ax = plt.subplots(figsize=(12, 7))

    if category_col:
        top_brands = df[category_col].value_counts().head(6).index.tolist()
        for i, brand in enumerate(top_brands):
            brand_data = df_sorted[df_sorted[category_col] == brand]
            ax.scatter(brand_data[rank_col].values, brand_data[value_col].values,
                       s=30, alpha=0.7, label=str(brand),
                       c=PALETTE[i % len(PALETTE)], edgecolors='white', linewidth=0.5)

    ax.plot(df_sorted[rank_col].values, df_sorted[value_col].values,
            color='#00d4ff', alpha=0.3, linewidth=1)
    ax.fill_between(df_sorted[rank_col].values, 0, df_sorted[value_col].values,
                    alpha=0.05, color='#00d4ff')

    ax.set_xlabel(rank_col, fontsize=13)
    ax.set_ylabel(value_col, fontsize=13)
    ax.set_title(f'{rank_col} vs {value_col} 分布', fontsize=18, fontweight='bold')
    if category_col:
        ax.legend(fontsize=9, loc='upper right')
    ax.grid(True, alpha=0.3, linestyle='--')
    path = os.path.join(output_dir, 'line_trend.png')
    fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return 'line_trend.png'


def _meta_generated(charts_meta, key, fallback=False):
    charts_meta[key] = {'status': 'generated', 'fallback': fallback}


def _meta_skipped(charts_meta, key, reason):
    charts_meta[key] = {'status': 'skipped', 'reason': reason}


def _resolve_group_col(df, string_cols, category_col, brand_col, total_rows):
    if category_col:
        return category_col
    if brand_col:
        return brand_col
    for col in string_cols:
        n = df[col].nunique()
        if 2 <= n <= min(50, total_rows):
            return col
    return string_cols[0] if string_cols else None


def _apply_chart_fallbacks(df, charts, charts_meta, numeric_cols, string_cols,
                           category_col, brand_col, time_col, output_dir, total_rows):
    """当主逻辑未生成足够图表时，用通用列组合兜底。"""
    group_col = _resolve_group_col(df, string_cols, category_col, brand_col, total_rows)

    if not numeric_cols:
        for key in ('pie', 'line', 'bar', 'scatter'):
            if key not in charts:
                _meta_skipped(charts_meta, key, '无可用数值列')
        return

    val_col = numeric_cols[0]

    if 'pie' not in charts and group_col:
        _, pie_data = _generate_pie(df, group_col, val_col, output_dir)
        if pie_data is not None:
            charts['pie'] = os.path.join(os.path.basename(output_dir), 'pie_category.png')
            _meta_generated(charts_meta, 'pie', fallback=True)
        else:
            _meta_skipped(charts_meta, 'pie', '数据不足以生成饼图')
    elif 'pie' not in charts:
        _meta_skipped(charts_meta, 'pie', '缺少分类列')

    if 'bar' not in charts and group_col:
        col1 = numeric_cols[0]
        col2 = numeric_cols[1] if len(numeric_cols) >= 2 else col1
        result, _ = _generate_bar(df, group_col, col1, col2, output_dir, top_n=12)
        if result:
            charts['bar'] = os.path.join(os.path.basename(output_dir), result)
            _meta_generated(charts_meta, 'bar', fallback=True)
        else:
            _meta_skipped(charts_meta, 'bar', '数据不足以生成柱状图')
    elif 'bar' not in charts:
        _meta_skipped(charts_meta, 'bar', '缺少分组列')

    if 'line' not in charts:
        if time_col and category_col and len(numeric_cols) >= 1:
            result, _ = _generate_line(df, time_col, category_col, numeric_cols[0], output_dir)
            if result:
                charts['line'] = os.path.join(os.path.basename(output_dir), result)
                _meta_generated(charts_meta, 'line', fallback=True)
        elif group_col:
            grouped = df.groupby(group_col)[val_col].mean().sort_index()
            if len(grouped) >= 2:
                fig, ax = plt.subplots(figsize=(10, 5))
                ax.plot(range(len(grouped)), grouped.values, marker='o', color='#4ECDC4', linewidth=2)
                ax.set_xticks(range(len(grouped)))
                ax.set_xticklabels(grouped.index.tolist(), fontsize=9, rotation=45, ha='right')
                ax.set_title(f'{group_col} × {val_col}', fontsize=14, fontweight='bold')
                ax.grid(True, alpha=0.3, linestyle='--')
                path = os.path.join(output_dir, 'line_trend.png')
                fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
                plt.close(fig)
                charts['line'] = os.path.join(os.path.basename(output_dir), 'line_trend.png')
                _meta_generated(charts_meta, 'line', fallback=True)
        if 'line' not in charts:
            _meta_skipped(charts_meta, 'line', '缺少时间列或有效分组')

    if 'scatter' not in charts and len(numeric_cols) >= 2:
        result = _generate_scatter(
            df, numeric_cols[0], numeric_cols[1],
            numeric_cols[2] if len(numeric_cols) >= 3 else None,
            group_col, output_dir,
        )
        if result:
            charts['scatter'] = os.path.join(os.path.basename(output_dir), result)
            _meta_generated(charts_meta, 'scatter', fallback=True)
        else:
            _meta_skipped(charts_meta, 'scatter', '数据不足以生成散点图')
    elif 'scatter' not in charts:
        _meta_skipped(charts_meta, 'scatter', '需要至少两个数值列')


def generate_charts(file_path, output_dir, df=None):
    os.makedirs(output_dir, exist_ok=True)
    if df is None:
        from app.services.data_api import load_dataframe
        df = load_dataframe(file_path)
    total_rows = len(df)

    numeric_cols = []
    for c in df.select_dtypes(include=['int64', 'float64']).columns:
        if not _is_constant(df[c]) and not _is_junk_col(c, df[c], total_rows):
            numeric_cols.append(c)

    string_cols = []
    for c in df.select_dtypes(include=['object']).columns:
        if not _is_junk_col(c, df[c], total_rows):
            string_cols.append(c)

    insights = {}
    charts = {}
    charts_meta = {}

    insights['total_rows'] = total_rows
    insights['total_cols'] = len(df.columns)

    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) > 0:
            insights[f'{col}_sum'] = round(float(s.sum()), 2)
            insights[f'{col}_mean'] = round(float(s.mean()), 2)
            insights[f'{col}_max'] = round(float(s.max()), 2)
            insights[f'{col}_min'] = round(float(s.min()), 2)

    category_col = None
    for col in string_cols:
        n = df[col].nunique()
        if 2 <= n <= 15:
            category_col = col
            break

    brand_col = None
    if not category_col:
        for col in string_cols:
            n = df[col].nunique()
            if 16 <= n <= 60:
                brand_col = col
                break
        if not brand_col:
            for col in string_cols:
                n = df[col].nunique()
                if 61 <= n <= 200:
                    brand_col = col
                    break

    time_col = None
    for col in string_cols:
        if _detect_time_col(df, col, total_rows):
            time_col = col
            break

    item_col = None
    for col in string_cols:
        if df[col].nunique() == total_rows:
            item_col = col
            break
    if not item_col and len(string_cols) > 0:
        n_max = 0
        for col in string_cols:
            if df[col].nunique() > n_max:
                n_max = df[col].nunique()
                item_col = col

    rank_col = None
    for col in numeric_cols:
        col_lower = col.lower()
        if any(kw in col_lower for kw in ['rank', '排名', '排位', '序号', 'no']):
            if df[col].nunique() > total_rows * 0.3:
                rank_col = col
                break

    is_grouped = (category_col is not None or time_col is not None)

    if is_grouped:
        group_col = category_col or brand_col
        if group_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            _, pie_data = _generate_pie(df, group_col, val_col, output_dir)
            if pie_data is not None:
                charts['pie'] = os.path.join(os.path.basename(output_dir), 'pie_category.png')
                insights[f'top_{group_col}'] = pie_data.index[0]

        if time_col and category_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            result, _ = _generate_line(df, time_col, category_col, val_col, output_dir)
            if result:
                charts['line'] = os.path.join(os.path.basename(output_dir), result)

        if group_col and len(numeric_cols) >= 2:
            col1, col2 = numeric_cols[0], numeric_cols[1]
            result, _ = _generate_bar(df, group_col, col1, col2, output_dir)
            if result:
                charts['bar'] = os.path.join(os.path.basename(output_dir), result)

        if len(numeric_cols) >= 2:
            col_x = numeric_cols[0]
            col_y = numeric_cols[1]
            col_size = numeric_cols[2] if len(numeric_cols) >= 3 else None
            result = _generate_scatter(df, col_x, col_y, col_size, category_col or brand_col, output_dir)
            if result:
                charts['scatter'] = os.path.join(os.path.basename(output_dir), result)

    else:
        best_group_col = brand_col or item_col
        pie_chart_n = 8 if brand_col else 6

        if best_group_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            _, pie_data = _generate_pie(df, best_group_col, val_col, output_dir, top_n=pie_chart_n)
            if pie_data is not None:
                charts['pie'] = os.path.join(os.path.basename(output_dir), 'pie_category.png')
                insights[f'top_{best_group_col}'] = pie_data.index[0]

        if rank_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[1] if len(numeric_cols) >= 2 else numeric_cols[0]
            _generate_rank_line(df, rank_col, val_col, output_dir, brand_col)
            charts['line'] = os.path.join(os.path.basename(output_dir), 'line_trend.png')
        elif best_group_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            grouped = df.groupby(best_group_col)[val_col].sum().sort_values(ascending=False).head(15)
            fig, ax = plt.subplots(figsize=(10, max(5, len(grouped) * 0.35)))
            ax.barh(grouped.index.tolist(), grouped.values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
                     '#FFEAA7', '#DDA0DD', '#F0E68C', '#87CEEB', '#FFB347', '#77DD77',
                     '#FF6961', '#AEC6CF', '#F49AC2', '#B19CD9', '#FDFD96'][:len(grouped)],
                    edgecolor='white', linewidth=0.5)
            ax.invert_yaxis()
            ax.set_xlabel(val_col, fontsize=12)
            ax.set_title(f'Top {len(grouped)} {best_group_col} ({val_col})', fontsize=16, fontweight='bold')
            path = os.path.join(output_dir, 'line_trend.png')
            fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
            plt.close(fig)
            charts['line'] = os.path.join(os.path.basename(output_dir), 'line_trend.png')

        if item_col and len(numeric_cols) >= 2:
            col1, col2 = numeric_cols[0], numeric_cols[1]
            df_sorted = df.sort_values(col1, ascending=False)
            grouped = df_sorted.head(15)
            fig, ax = plt.subplots(figsize=(12, 7))
            x = range(len(grouped))
            width = 0.35
            ax.bar([i - width/2 for i in x], grouped[col1].values, width,
                   label=col1, color='#FF6B6B', edgecolor='white', linewidth=0.5)
            ax.bar([i + width/2 for i in x], grouped[col2].values, width,
                   label=col2, color='#4ECDC4', edgecolor='white', linewidth=0.5)
            ax.set_xticks(x)
            ax.set_xticklabels(grouped[item_col].values[:15], fontsize=8, rotation=45, ha='right')
            ax.set_title(f'Top 15 {item_col} {col1}/{col2} 对比', fontsize=16, fontweight='bold')
            ax.legend(fontsize=12)
            path = os.path.join(output_dir, 'bar_region.png')
            fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
            plt.close(fig)
            charts['bar'] = os.path.join(os.path.basename(output_dir), 'bar_region.png')
        elif best_group_col and len(numeric_cols) >= 2:
            col1, col2 = numeric_cols[0], numeric_cols[1]
            grouped = df.groupby(best_group_col).agg({col1: 'sum', col2: 'sum'}).sort_values(col1, ascending=False).head(12)
            fig, ax = plt.subplots(figsize=(12, 7))
            x = range(len(grouped))
            width = 0.35
            ax.bar([i - width/2 for i in x], grouped[col1].values, width,
                   label=col1, color='#FF6B6B', edgecolor='white', linewidth=0.5)
            ax.bar([i + width/2 for i in x], grouped[col2].values, width,
                   label=col2, color='#4ECDC4', edgecolor='white', linewidth=0.5)
            ax.set_xticks(x)
            ax.set_xticklabels(grouped.index.tolist(), fontsize=9, rotation=45, ha='right')
            ax.set_title(f'{best_group_col} {col1}/{col2} 对比', fontsize=16, fontweight='bold')
            ax.legend(fontsize=12)
            path = os.path.join(output_dir, 'bar_region.png')
            fig.savefig(path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
            plt.close(fig)
            charts['bar'] = os.path.join(os.path.basename(output_dir), 'bar_region.png')

        if len(numeric_cols) >= 2:
            col_x = numeric_cols[1] if len(numeric_cols) >= 2 else numeric_cols[0]
            col_y = numeric_cols[0]
            col_size = numeric_cols[2] if len(numeric_cols) >= 3 else None
            result = _generate_scatter(df, col_x, col_y, col_size, brand_col, output_dir)
            if result:
                charts['scatter'] = os.path.join(os.path.basename(output_dir), result)

    _apply_chart_fallbacks(
        df, charts, charts_meta, numeric_cols, string_cols,
        category_col, brand_col, time_col, output_dir, total_rows,
    )
    for key in ('pie', 'line', 'bar', 'scatter'):
        if key in charts and key not in charts_meta:
            _meta_generated(charts_meta, key)

    fig, axes = plt.subplots(2, 2, figsize=(18, 14))
    fig.suptitle('数据综合仪表盘', fontsize=22, fontweight='bold', y=0.98)
    dashboard_has_panel = False

    if is_grouped:
        if category_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            grouped = df.groupby(category_col)[val_col].sum().sort_values(ascending=False)
            if len(grouped) > 8:
                other = grouped.iloc[8:].sum()
                grouped = grouped.head(8)
                grouped['其他'] = other
            ax1 = axes[0, 0]
            ax1.pie(grouped.values, labels=grouped.index, autopct='%1.1f%%',
                    colors=PALETTE[:len(grouped)], startangle=90, shadow=True)
            ax1.set_title('分类占比', fontsize=14, fontweight='bold')
            dashboard_has_panel = True

        if time_col and category_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            pivot = df.groupby([time_col, category_col])[val_col].sum().unstack()
            if 2 <= len(pivot) <= 24:
                ax2 = axes[0, 1]
                markers = ['o', 's', 'D', '^', 'v', 'p', '*']
                for i, col_name in enumerate(pivot.columns):
                    ax2.plot(range(len(pivot.index)), pivot[col_name],
                             marker=markers[i % len(markers)], label=str(col_name))
                ax2.set_xticks(range(len(pivot.index)))
                ax2.set_xticklabels(pivot.index.tolist(), fontsize=9)
                ax2.set_title('趋势变化', fontsize=14, fontweight='bold')
                ax2.legend(fontsize=9)
                ax2.grid(True, alpha=0.3, linestyle='--')
                dashboard_has_panel = True

        gc = category_col or brand_col
        if gc and len(numeric_cols) >= 2:
            col1, col2 = numeric_cols[0], numeric_cols[1]
            grouped = df.groupby(gc).agg({col1: 'sum', col2: 'sum'}).sort_values(col1, ascending=False).head(12)
            ax3 = axes[1, 0]
            width = 0.35
            x = range(len(grouped))
            ax3.bar([i - width/2 for i in x], grouped[col1].values, width, label=col1, color='#FF6B6B')
            ax3.bar([i + width/2 for i in x], grouped[col2].values, width, label=col2, color='#4ECDC4')
            ax3.set_xticks(x)
            ax3.set_xticklabels(grouped.index.tolist(), fontsize=8, rotation=45, ha='right')
            ax3.set_title('分组对比', fontsize=14, fontweight='bold')
            ax3.legend(fontsize=9)
            dashboard_has_panel = True

        if len(numeric_cols) >= 2:
            col_x = numeric_cols[0]
            col_y = numeric_cols[1]
            ax4 = axes[1, 1]
            if category_col or brand_col:
                gc2 = category_col or brand_col
                for i, cat in enumerate(df[gc2].value_counts().head(8).index):
                    cat_data = df[df[gc2] == cat]
                    ax4.scatter(cat_data[col_x], cat_data[col_y], alpha=0.6, label=str(cat), s=20)
                ax4.legend(fontsize=7, loc='lower right', ncol=2)
            else:
                ax4.scatter(df[col_x], df[col_y], alpha=0.7, color='#FF6B6B', s=20)
            ax4.set_xlabel(col_x, fontsize=9)
            ax4.set_ylabel(col_y, fontsize=9)
            ax4.set_title('相关性分析', fontsize=14, fontweight='bold')
            ax4.grid(True, alpha=0.3, linestyle='--')
            dashboard_has_panel = True

    else:
        if brand_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            grouped = df.groupby(brand_col)[val_col].sum().sort_values(ascending=False)
            if len(grouped) > 8:
                other = grouped.iloc[8:].sum()
                grouped = grouped.head(8)
                grouped['其他'] = other
            ax1 = axes[0, 0]
            ax1.pie(grouped.values, labels=grouped.index, autopct='%1.1f%%',
                    colors=PALETTE[:len(grouped)], startangle=90, shadow=True)
            ax1.set_title(f'{brand_col} {val_col} 占比', fontsize=14, fontweight='bold')
            dashboard_has_panel = True

        if item_col and len(numeric_cols) >= 1:
            val_col = numeric_cols[0]
            top_items = df.sort_values(val_col, ascending=False).head(12)
            ax2 = axes[0, 1]
            bars = ax2.barh(top_items[item_col].values[:12], top_items[val_col].values[:12],
                           color=[PALETTE[i % len(PALETTE)] for i in range(12)],
                           edgecolor='white', linewidth=0.3)
            ax2.invert_yaxis()
            ax2.set_xlabel(val_col, fontsize=9)
            ax2.set_title(f'Top 12 ({val_col})', fontsize=14, fontweight='bold')
            ax2.tick_params(axis='y', labelsize=8)
            dashboard_has_panel = True

        if brand_col and len(numeric_cols) >= 2:
            col1, col2 = numeric_cols[0], numeric_cols[1]
            grouped = df.groupby(brand_col).agg({col1: 'sum', col2: 'mean'}).round(1)
            grouped = grouped.sort_values(col1, ascending=False).head(10)
            ax3 = axes[1, 0]
            width = 0.35
            x = range(len(grouped))
            ax3.bar([i - width/2 for i in x], grouped[col1].values, width,
                    label=f'{col1}(合计)', color='#FF6B6B')
            ax3.bar([i + width/2 for i in x], grouped[col2].values, width,
                    label=f'{col2}(均值)', color='#4ECDC4')
            ax3.set_xticks(x)
            ax3.set_xticklabels(grouped.index.tolist(), fontsize=8, rotation=45, ha='right')
            ax3.set_title('品牌合计 vs 均值', fontsize=14, fontweight='bold')
            ax3.legend(fontsize=8)
            dashboard_has_panel = True

        if len(numeric_cols) >= 2:
            col_x = numeric_cols[1] if len(numeric_cols) >= 2 else numeric_cols[0]
            col_y = numeric_cols[0]
            ax4 = axes[1, 1]
            if brand_col:
                top_b = df[brand_col].value_counts().head(6).index.tolist()
                for i, cat in enumerate(top_b):
                    cat_data = df[df[brand_col] == cat]
                    ax4.scatter(cat_data[col_x], cat_data[col_y],
                                alpha=0.6, label=str(cat), s=15,
                                c=PALETTE[i % len(PALETTE)])
                other = df[~df[brand_col].isin(top_b)]
                if len(other) > 0:
                    ax4.scatter(other[col_x], other[col_y],
                                alpha=0.15, s=10, color='#CCCCCC', label='其他')
                ax4.legend(fontsize=7, loc='upper right', ncol=2)
            else:
                ax4.scatter(df[col_x], df[col_y], alpha=0.6, s=15, color='#FF6B6B')
            ax4.set_xlabel(col_x, fontsize=9)
            ax4.set_ylabel(col_y, fontsize=9)
            ax4.set_title('相关性分析', fontsize=14, fontweight='bold')
            ax4.grid(True, alpha=0.3, linestyle='--')
            dashboard_has_panel = True

    if not dashboard_has_panel and len(numeric_cols) >= 1:
        ax = axes[0, 0]
        val_col = numeric_cols[0]
        summary = df[val_col].describe()
        ax.bar(summary.index.tolist(), summary.values, color=PALETTE[:len(summary)])
        ax.set_title(f'{val_col} 统计摘要', fontsize=14, fontweight='bold')
        ax.tick_params(axis='x', rotation=30)
        dashboard_has_panel = True

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    dashboard_path = os.path.join(output_dir, 'dashboard.png')
    fig.savefig(dashboard_path, dpi=CHART_DPI, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    charts['dashboard'] = os.path.join(os.path.basename(output_dir), 'dashboard.png')
    _meta_generated(charts_meta, 'dashboard', fallback=not dashboard_has_panel)

    return charts, insights, charts_meta
