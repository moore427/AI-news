
import React, { useState } from 'react';
import { ExternalLink, BrainCircuit, ChevronDown, ChevronUp, Share2, Clock } from 'lucide-react';
import { NewsItem } from '../types';
import { summarizeHeadline } from '../services/geminiService';

interface NewsCardProps {
  item: NewsItem;
  isNew?: boolean;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item, isNew }) => {
  const [summary, setSummary] = useState<string | null>(item.summary || null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (summary) {
      setExpanded(!expanded);
      return;
    }
    setLoadingSummary(true);
    const result = await summarizeHeadline(item.text);
    setSummary(result);
    setLoadingSummary(false);
    setExpanded(true);
  };

  const getSentimentStyles = () => {
    if (item.sentiment === 'bullish') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (item.sentiment === 'bearish') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const sentimentLabel = () => {
    if (item.sentiment === 'bullish') return '看漲';
    if (item.sentiment === 'bearish') return '看跌';
    return '中立';
  };

  return (
    <div className={`relative pl-12 pr-4 py-4 border-b border-slate-800 transition-all group hover:bg-slate-800/30 ${isNew ? 'animate-[pulse_1s_ease-in-out]' : ''}`}>
      {/* Time Dot */}
      <div className="absolute left-4 top-5 w-4 flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mb-1 ${item.importance === 'high' ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`}></div>
        <div className="w-[1px] h-full bg-slate-800"></div>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <Clock size={10} className="text-slate-600" />
          <span className="text-slate-400 font-bold">張貼於 {item.time}</span>
          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
          <span className="text-blue-500/80">{item.source}</span>
          {item.importance === 'high' && (
            <span className="bg-rose-500 text-white px-1 rounded font-bold">重要時訊</span>
          )}
        </div>

        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <h3 className={`text-sm md:text-base font-medium leading-tight ${item.importance === 'high' ? 'text-slate-100' : 'text-slate-300'}`}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                {item.text}
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </h3>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={handleSummarize}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors border border-slate-700"
              title="AI 分析"
            >
              <BrainCircuit size={16} className={loadingSummary ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 uppercase font-bold tracking-tighter">
             {item.type}
           </span>
           {item.sentiment && (
             <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-tighter ${getSentimentStyles()}`}>
               {sentimentLabel()}
             </span>
           )}
        </div>

        {expanded && summary && (
          <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-slate-400 leading-relaxed italic animate-in fade-in slide-in-from-top-1">
            <span className="text-blue-400 font-bold not-italic mr-2">AI 摘要報告:</span>
            {summary}
          </div>
        )}
      </div>
    </div>
  );
};
