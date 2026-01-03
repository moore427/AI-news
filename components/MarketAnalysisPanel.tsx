
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import { NewsItem } from '../types';
import { getMarketAnalysis } from '../services/geminiService';

interface MarketAnalysisPanelProps {
  news: NewsItem[];
}

export const MarketAnalysisPanel: React.FC<MarketAnalysisPanelProps> = ({ news }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    if (news.length === 0) return;
    setLoading(true);
    const result = await getMarketAnalysis(news);
    setAnalysis(result);
    setLoading(false);
  };

  useEffect(() => {
    if (news.length > 0 && !analysis) {
      fetchAnalysis();
    }
  }, [news]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <h2 className="flex items-center gap-2 font-bold text-slate-100">
          <Sparkles size={18} className="text-blue-400" />
          智能市場洞察
        </h2>
        <button 
          onClick={fetchAnalysis}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4 py-4">
            <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
            <div className="h-4 bg-slate-800 rounded w-4/6 animate-pulse"></div>
            <div className="h-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
          </div>
        ) : analysis ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-slate-400 leading-relaxed space-y-4">
              {analysis}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-600 font-mono tracking-widest">GEMINI 3 FLASH 驅動</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 hover:bg-blue-600/20 transition-all">
                <MessageSquare size={14} />
                諮詢 AI 分析師
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-600">
            正在收集即時新聞進行分析...
          </div>
        )}
      </div>
    </div>
  );
};
