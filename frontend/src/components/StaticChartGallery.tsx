import { useState } from 'react';
import { useAppStore, type ChartData } from '@/store/useAppStore';
import ChartCard from '@/components/ChartCard';
import ChartModal from '@/components/ChartModal';

const CHART_ITEMS: { key: keyof ChartData; title: string; accent: 'accent' }[] = [
  { key: 'dashboard', title: '综合看板', accent: 'accent' },
  { key: 'pie', title: '饼图', accent: 'accent' },
  { key: 'line', title: '折线图', accent: 'accent' },
  { key: 'bar', title: '柱状图', accent: 'accent' },
  { key: 'scatter', title: '散点图', accent: 'accent' },
];

export default function StaticChartGallery() {
  const { charts, chartsMeta, loading } = useAppStore();
  const [modal, setModal] = useState<{ title: string; url: string } | null>(null);

  if (!charts) {
    return (
      <div className="data-card p-8 text-center mb-6">
        <p className="font-body text-sm text-secondary">暂无自动生成的静态图表</p>
        <p className="font-body text-xs text-tertiary mt-1">请在上传页完成洞察分析后查看</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CHART_ITEMS.map(({ key, title, accent }) => {
          const url = charts[key] || null;
          const meta = chartsMeta?.[key];
          const unavailableReason = !url && meta?.status === 'skipped'
            ? meta.reason
            : !url
              ? '该数据结构无法生成此图'
              : undefined;
          return (
            <ChartCard
              key={key}
              title={title}
              imageUrl={url}
              unavailableReason={unavailableReason}
              isLoading={loading}
              accent={accent}
              onFullscreen={() => url && setModal({ title, url })}
            />
          );
        })}
      </div>
      {modal && (
        <ChartModal
          title={modal.title}
          imageUrl={modal.url}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
