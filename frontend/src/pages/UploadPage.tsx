import { useNavigate } from 'react-router-dom';
import AnalysisHistoryPanel from '@/components/AnalysisHistoryPanel';
import FileDrop from '@/components/FileDrop';
import { addAnalysisRecord } from '@/lib/analysisHistory';
import { processData, syncActionPlans } from '@/lib/api';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { saveActiveSession, type ActiveSession } from '@/lib/sessionStorage';
import { useAppStore } from '@/store/useAppStore';
import type { ActionPlan, FileInfo, ChartData, ChartsMeta, AiAnalysis, Insights } from '@/store/useAppStore';
import { ArrowRight, Database, Sparkles, Activity, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const navigate = useNavigate();
  const { fileInfo, loading, error, setLoading, setCharts, setChartsMeta, setInsights, setError, setFileInfo, setAiAnalysis, setActions } = useAppStore();

  const normalizeActions = (plans: ActionPlan[]) =>
    plans.map((p) => ({ ...p, status: p.status ?? 'pending', progress: p.progress ?? 0 }));

  const persistSession = (
    info: FileInfo,
    chartData: ChartData,
    meta: ChartsMeta | null,
    analysis: AiAnalysis | null,
    insightData: Insights | null,
  ): ActiveSession => {
    const session: ActiveSession = {
      fileInfo: info,
      charts: chartData,
      chartsMeta: meta,
      aiAnalysis: analysis,
      insights: insightData,
    };
    saveActiveSession(session);
    addAnalysisRecord(session, info, analysis);
    return session;
  };

  const syncAndSetActions = async (fileId: string, plans: ActionPlan[]) => {
    const normalized = normalizeActions(plans);
    const syncRes = await syncActionPlans(fileId, normalized);
    if (syncRes.success && syncRes.actions) {
      setActions(syncRes.actions);
    } else {
      setActions(normalized);
    }
  };

  const handleGenerate = async (fileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await processData(fileId);

      let chartsResult: ChartData | null = null;
      let metaResult: ChartsMeta | null = null;
      let insightsResult: Insights | null = null;
      let analysisResult: AiAnalysis | null = null;

      if (result.success) {
        if (result.charts) {
          chartsResult = result.charts;
          metaResult = result.charts_meta ?? null;
          insightsResult = result.insights ?? null;
          setCharts(chartsResult);
          setChartsMeta(metaResult);
          setInsights(insightsResult);
        }
        if (result.analysis) {
          analysisResult = result.analysis;
          setAiAnalysis(analysisResult);
          if (analysisResult.action_plans.length > 0) {
            await syncAndSetActions(fileId, analysisResult.action_plans);
          }
        }
        const info = useAppStore.getState().fileInfo;
        if (info && chartsResult && analysisResult) {
          persistSession(info, chartsResult, metaResult, analysisResult, insightsResult);
          navigate('/dashboard');
        } else {
          setError('处理结果不完整，请重试');
        }
      } else {
        setError(result.error || '洞察分析失败');
      }
    } catch {
      setError('网络请求失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await processData('sample');

      let sampleInfo: FileInfo | null = null;
      let chartsResult: ChartData | null = null;
      let metaResult: ChartsMeta | null = null;
      let insightsResult: Insights | null = null;
      let analysisResult: AiAnalysis | null = null;

      if (result.success) {
        if (result.file_info) {
          sampleInfo = result.file_info;
          setFileInfo(sampleInfo);
        }
        if (result.charts) {
          chartsResult = result.charts;
          metaResult = result.charts_meta ?? null;
          insightsResult = result.insights ?? null;
          setCharts(chartsResult);
          setChartsMeta(metaResult);
          setInsights(insightsResult);
        }
        if (result.analysis) {
          analysisResult = result.analysis;
          setAiAnalysis(analysisResult);
          if (analysisResult.action_plans.length > 0) {
            await syncAndSetActions('sample', analysisResult.action_plans);
          }
        }
        if (sampleInfo && chartsResult && analysisResult) {
          persistSession(sampleInfo, chartsResult, metaResult, analysisResult, insightsResult);
          navigate('/dashboard');
        } else {
          setError('处理结果不完整，请重试');
        }
      } else {
        setError(result.error || '示例数据处理失败');
      }
    } catch {
      setError('网络请求失败，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="mx-auto max-w-2xl">
        {/* Hero section */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-nebula-subtle to-violet-subtle border border-nebula/20">
              <Sparkles className="w-3.5 h-3.5 text-violet" />
              <span className="font-body text-xs text-nebula-light font-medium">{BRAND_NAME} · 规则引擎</span>
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-frost mb-4 leading-[1.1] tracking-tight">
            数据<span className="text-gradient-prism">洞察</span>，即刻呈现
          </h1>
          <p className="font-body text-sm text-frost-muted max-w-lg mx-auto leading-relaxed">
            上传 CSV / Excel，{BRAND_TAGLINE}自动生成可视化图表。<br />
            规则引擎提供深度解读与可执行行动计划
          </p>
        </div>

        {/* Upload area */}
        <div className="animate-fade-in-up stagger-1">
          <FileDrop />
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-ruby-subtle border border-ruby/20 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-ruby flex-shrink-0" />
            <span className="font-body text-xs text-ruby-light">{error}</span>
          </div>
        )}

        {/* Generate button */}
        {fileInfo && (
          <div className="mt-6 text-center animate-fade-in-up stagger-2">
            <button
              onClick={() => handleGenerate(fileInfo.file_id)}
              disabled={loading}
              className="btn-primary text-sm px-10 py-3.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  分析生成中…
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  开始洞察分析
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Sample data */}
        <div className="mt-10 text-center animate-fade-in-up stagger-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-nebula/40 to-transparent" />
            <span className="font-body text-xs text-frost-dim">或者</span>
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent via-violet/40 to-transparent" />
          </div>
          <button
            onClick={handleSample}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            <Database className="w-4 h-4 text-cyan" />
            加载示例数据快速体验
          </button>
        </div>

        <AnalysisHistoryPanel />
      </div>
    </div>
  );
}
