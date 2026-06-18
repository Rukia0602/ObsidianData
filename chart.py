import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
import os

matplotlib.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'Noto Sans CJK SC']
matplotlib.rcParams['axes.unicode_minus'] = False

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'charts')

os.makedirs(OUTPUT_DIR, exist_ok=True)

df = pd.read_csv(DATA_FILE, encoding='utf-8')

print("=" * 50)
print("数据概览")
print("=" * 50)
print(df.head(10))
print(f"\n数据维度: {df.shape[0]} 行 x {df.shape[1]} 列")
print(f"\n各列数据类型:\n{df.dtypes}")
print(f"\n基本统计:\n{df.describe()}")
print("=" * 50)

category_sales = df.groupby('产品类别')['销售额(万元)'].sum().sort_values(ascending=False)
category_profit = df.groupby('产品类别')['利润(万元)'].sum().sort_values(ascending=False)
monthly_trend = df.pivot_table(values='销售额(万元)', index='月份', columns='产品类别', aggfunc='sum')
region_sales = df.groupby('地区')['销售额(万元)'].sum().sort_values(ascending=False)
region_profit = df.groupby('地区')['利润(万元)'].sum().sort_values(ascending=False)

months_order = ['1月','2月','3月','4月','5月','6月']
monthly_trend = monthly_trend.reindex(months_order)

fig, axes = plt.subplots(2, 2, figsize=(18, 14))
fig.suptitle('销售数据综合仪表盘', fontsize=22, fontweight='bold', y=0.98)

# ============================================================
# 图1: 饼图 - 各产品类别销售额占比
# ============================================================
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
ax1 = axes[0, 0]
wedges, texts, autotexts = ax1.pie(
    category_sales.values,
    labels=category_sales.index,
    autopct='%1.1f%%',
    colors=colors,
    startangle=90,
    explode=(0.05, 0.03, 0.02, 0.02),
    shadow=True,
    textprops={'fontsize': 12}
)
for at in autotexts:
    at.set_fontsize(11)
    at.set_fontweight('bold')
ax1.set_title('各产品类别销售额占比', fontsize=16, fontweight='bold', pad=20)

# ============================================================
# 图2: 折线图 - 各产品月度销售趋势
# ============================================================
ax2 = axes[0, 1]
markers = ['o', 's', 'D', '^']
line_colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
for i, col in enumerate(monthly_trend.columns):
    ax2.plot(
        monthly_trend.index, monthly_trend[col],
        marker=markers[i], color=line_colors[i], linewidth=2.5,
        markersize=8, label=col
    )
ax2.set_xlabel('月份', fontsize=12)
ax2.set_ylabel('销售额 (万元)', fontsize=12)
ax2.set_title('各产品月度销售额趋势', fontsize=16, fontweight='bold')
ax2.legend(fontsize=12, loc='upper left')
ax2.grid(True, alpha=0.3, linestyle='--')

# ============================================================
# 图3: 柱状图 - 各地区销售额与利润对比
# ============================================================
ax3 = axes[1, 0]
x = range(len(region_sales))
width = 0.35
bars1 = ax3.bar([i - width/2 for i in x], region_sales.values, width,
                label='销售额(万元)', color='#FF6B6B', edgecolor='white', linewidth=0.5)
bars2 = ax3.bar([i + width/2 for i in x], region_profit.values, width,
                label='利润(万元)', color='#4ECDC4', edgecolor='white', linewidth=0.5)
ax3.set_xticks(x)
ax3.set_xticklabels(region_sales.index, fontsize=12)
ax3.set_ylabel('金额 (万元)', fontsize=12)
ax3.set_title('各地区销售额与利润对比', fontsize=16, fontweight='bold')
ax3.legend(fontsize=12)

for bar in bars1:
    height = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2., height + 2, f'{height:.0f}',
             ha='center', va='bottom', fontsize=10, fontweight='bold', color='#c0392b')
for bar in bars2:
    height = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2., height + 1, f'{height:.0f}',
             ha='center', va='bottom', fontsize=10, fontweight='bold', color='#16a085')

# ============================================================
# 图4: 散点图 - 广告投入 vs 销售额 相关性
# ============================================================
ax4 = axes[1, 1]
categories = df['产品类别'].unique()
scatter_colors = {'电子产品': '#FF6B6B', '家居用品': '#4ECDC4', '食品饮料': '#45B7D1', '服装鞋帽': '#96CEB4'}
for cat in categories:
    cat_data = df[df['产品类别'] == cat]
    ax4.scatter(
        cat_data['广告投入(万元)'], cat_data['销售额(万元)'],
        s=cat_data['销量(件)'] / 5, alpha=0.7, label=cat,
        c=scatter_colors.get(cat, '#333333'), edgecolors='white', linewidth=0.8
    )
ax4.set_xlabel('广告投入 (万元)', fontsize=12)
ax4.set_ylabel('销售额 (万元)', fontsize=12)
ax4.set_title('广告投入与销售额关系 (气泡大小=销量)', fontsize=16, fontweight='bold')
ax4.legend(fontsize=11, loc='lower right')
ax4.grid(True, alpha=0.3, linestyle='--')

plt.tight_layout(rect=[0, 0, 1, 0.95])

dashboard_path = os.path.join(OUTPUT_DIR, 'dashboard.png')
fig.savefig(dashboard_path, dpi=150, bbox_inches='tight', facecolor='white')
print(f"\n仪表盘已保存: {dashboard_path}")
plt.close(fig)

# ============================================================
# 单独导出高清大图
# ============================================================

# 饼图
fig1, ax1 = plt.subplots(figsize=(10, 8))
wedges, texts, autotexts = ax1.pie(
    category_sales.values, labels=category_sales.index,
    autopct='%1.1f%%', colors=colors, startangle=90,
    explode=(0.05, 0.03, 0.02, 0.02), shadow=True,
    textprops={'fontsize': 13}
)
for at in autotexts:
    at.set_fontsize(12)
    at.set_fontweight('bold')
ax1.set_title('各产品类别销售额占比', fontsize=18, fontweight='bold')
fig1.savefig(os.path.join(OUTPUT_DIR, 'pie_category.png'), dpi=200, bbox_inches='tight', facecolor='white')
plt.close(fig1)

# 折线图
fig2, ax2 = plt.subplots(figsize=(12, 7))
for i, col in enumerate(monthly_trend.columns):
    ax2.plot(monthly_trend.index, monthly_trend[col],
             marker=markers[i], color=line_colors[i], linewidth=3,
             markersize=10, label=col)
    for j, val in enumerate(monthly_trend[col]):
        ax2.annotate(f'{val:.0f}', (monthly_trend.index[j], val),
                     textcoords="offset points", xytext=(0, 12),
                     ha='center', fontsize=10, fontweight='bold', color=line_colors[i])
ax2.set_xlabel('月份', fontsize=13)
ax2.set_ylabel('销售额 (万元)', fontsize=13)
ax2.set_title('各产品月度销售额趋势', fontsize=18, fontweight='bold')
ax2.legend(fontsize=13, loc='upper left')
ax2.grid(True, alpha=0.3, linestyle='--')
fig2.savefig(os.path.join(OUTPUT_DIR, 'line_trend.png'), dpi=200, bbox_inches='tight', facecolor='white')
plt.close(fig2)

# 柱状图
fig3, ax3 = plt.subplots(figsize=(12, 7))
x = range(len(region_sales))
width = 0.35
bars1 = ax3.bar([i - width/2 for i in x], region_sales.values, width,
                label='销售额(万元)', color='#FF6B6B', edgecolor='white', linewidth=0.5)
bars2 = ax3.bar([i + width/2 for i in x], region_profit.values, width,
                label='利润(万元)', color='#4ECDC4', edgecolor='white', linewidth=0.5)
ax3.set_xticks(x)
ax3.set_xticklabels(region_sales.index, fontsize=13)
ax3.set_ylabel('金额 (万元)', fontsize=13)
ax3.set_title('各地区销售额与利润对比', fontsize=18, fontweight='bold')
ax3.legend(fontsize=13)
for bar in bars1:
    height = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2., height + 2, f'{height:.0f}',
             ha='center', va='bottom', fontsize=11, fontweight='bold', color='#c0392b')
for bar in bars2:
    height = bar.get_height()
    ax3.text(bar.get_x() + bar.get_width()/2., height + 1, f'{height:.0f}',
             ha='center', va='bottom', fontsize=11, fontweight='bold', color='#16a085')
fig3.savefig(os.path.join(OUTPUT_DIR, 'bar_region.png'), dpi=200, bbox_inches='tight', facecolor='white')
plt.close(fig3)

# 散点图
fig4, ax4 = plt.subplots(figsize=(12, 7))
for cat in categories:
    cat_data = df[df['产品类别'] == cat]
    ax4.scatter(
        cat_data['广告投入(万元)'], cat_data['销售额(万元)'],
        s=cat_data['销量(件)'] / 3, alpha=0.7, label=cat,
        c=scatter_colors.get(cat, '#333333'), edgecolors='white', linewidth=1
    )
ax4.set_xlabel('广告投入 (万元)', fontsize=13)
ax4.set_ylabel('销售额 (万元)', fontsize=13)
ax4.set_title('广告投入与销售额关系 (气泡大小=销量)', fontsize=18, fontweight='bold')
ax4.legend(fontsize=12, loc='lower right')
ax4.grid(True, alpha=0.3, linestyle='--')
fig4.savefig(os.path.join(OUTPUT_DIR, 'scatter_ad.png'), dpi=200, bbox_inches='tight', facecolor='white')
plt.close(fig4)

print(f"\n所有图表已生成至: {OUTPUT_DIR}")
print("  - dashboard.png   (综合仪表盘)")
print("  - pie_category.png   (饼图)")
print("  - line_trend.png     (折线图)")
print("  - bar_region.png     (柱状图)")
print("  - scatter_ad.png     (散点图)")
print("\n数据洞察:\n")
print(f"  销售额最高类别: {category_sales.idxmax()} ({category_sales.max():.0f}万元)")
print(f"  利润最高类别: {category_profit.idxmax()} ({category_profit.max():.0f}万元)")
print(f"  销售额最高地区: {region_sales.idxmax()} ({region_sales.max():.0f}万元)")
print(f"  6个月总销售额: {df['销售额(万元)'].sum():.0f}万元")
print(f"  6个月总利润: {df['利润(万元)'].sum():.0f}万元")
print(f"  利润率: {df['利润(万元)'].sum()/df['销售额(万元)'].sum()*100:.1f}%")
print("=" * 50)
