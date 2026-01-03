
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Pause, 
  Play, 
  Zap, 
  Search,
  Settings,
  Bell,
  BarChart3,
  Clock,
  Languages
} from 'lucide-react';

import { PricesState, NewsItem, ConnectionStatus } from './types';
import { CATEGORIES, RSS_FEEDS, KEYWORDS } from './constants';
import { PriceTicker } from './components/PriceTicker';
import { NewsCard } from './components/NewsCard';
import { MarketAnalysisPanel } from './components/MarketAnalysisPanel';
import { translateHeadlines } from './services/geminiService';

// --- Utility Functions ---

const analyzeSentiment = (text: string) => {
  const t = text.toLowerCase();
  for (const w of KEYWORDS.bullish) if (t.includes(w.toLowerCase())) return 'bullish';
  for (const w of KEYWORDS.bearish) if (t.includes(w.toLowerCase())) return 'bearish';
  return 'neutral';
};

const analyzeImportance = (text: string): 'high' | 'normal' => {
  const t = text.toLowerCase();
  for (const w of KEYWORDS.high_importance) if (t.includes(w.toLowerCase())) return 'high';
  return 'normal';
};

const detectCategory = (text: string, defaultCat: string): NewsItem['type'] => {
  const t = text.toLowerCase();
  if (t.includes('bitcoin') || t.includes('crypto') || t.includes('btc') || t.includes('ethereum') || t.includes('binance')) return 'crypto';
  if (t.includes('fx') || t.includes('currency') || t.includes('dollar') || t.includes('forex') || t.includes('yen')) return 'forex';
  if (t.includes('stock') || t.includes('market') || t.includes('nasdaq') || t.includes('nvidia') || t.includes('wall st')) return 'stock';
  return defaultCat as NewsItem['type'];
};

// 格式化台北當前時間（時:分:秒）
const formatCurrentTime = (date: Date) => {
  return date.toLocaleTimeString('zh-TW', { 
    timeZone: 'Asia/Taipei',
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
};

// 格式化新聞張貼時間（年/月/日 時:分）
const formatPostTime = (date: Date) => {
  return date.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
};

const getRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
};

// --- Main Component ---

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [prices, setPrices] = useState<PricesState>({ btc: null, eth: null, usdtwd: null, jpytwd: null });
  const [filter, setFilter] = useState('all');
  const [isPaused, setIsPaused] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime(new Date()));
  const [lastSyncTime, setLastSyncTime] = useState<string>('--:--');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const processedIds = useRef(new Set<string>());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatCurrentTime(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);

  const connectWs = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    
    const ws = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum');
    wsRef.current = ws;

    ws.onopen = () => setConnectionStatus('live');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPrices(prev => ({
          ...prev,
          btc: data.bitcoin ? { 
            p: parseFloat(data.bitcoin).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            c: 0,
            P: "0.00"
          } : prev.btc,
          eth: data.ethereum ? { 
            p: parseFloat(data.ethereum).toLocaleString('en-US', { minimumFractionDigits: 2 }),
            c: 0,
            P: "0.00"
          } : prev.eth
        }));
      } catch (e) { console.error("WS Parse Error", e); }
    };
    ws.onerror = () => setConnectionStatus('error');
    ws.onclose = () => {
      if (!isPaused) setTimeout(connectWs, 5000);
    };
  }, [isPaused]);

  useEffect(() => {
    connectWs();
    return () => wsRef.current?.close();
  }, [connectWs]);

  const fetchMarketData = async () => {
    try {
      const resFx = await fetch('https://open.er-api.com/v6/latest/USD');
      if (resFx.ok) {
        const json = await resFx.json();
        setPrices(prev => ({
          ...prev,
          usdtwd: json.rates.TWD.toFixed(2),
          jpytwd: (json.rates.TWD / json.rates.JPY).toFixed(4)
        }));
      }
    } catch (e) { console.error("FX Fetch Error", e); }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNews = useCallback(async () => {
    if (isPaused) return;
    setLoading(true);

    try {
      const fetchPromises = RSS_FEEDS.map(async (feed) => {
        try {
          const cacheBuster = `&_t=${Date.now()}`;
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}${cacheBuster}`);
          const data = await res.json();
          if (data.status === 'ok') {
            return data.items.map((item: any) => {
              const pubDate = new Date(item.pubDate);
              return {
                id: item.guid || item.link,
                // 使用包含日期的台北時間格式
                time: formatPostTime(pubDate),
                rawTime: pubDate.getTime(),
                text: item.title,
                type: detectCategory(item.title, feed.type),
                importance: analyzeImportance(item.title),
                sentiment: analyzeSentiment(item.title),
                url: item.link,
                source: data.feed.title.replace("RSS Feed", "").trim(),
                relativeTime: getRelativeTime(pubDate.getTime())
              };
            });
          }
          return [];
        } catch (e) { return []; }
      });

      const results = await Promise.all(fetchPromises);
      const allFetched = results.flat().sort((a, b) => b.rawTime - a.rawTime);
      
      const newItems = allFetched.filter(item => !processedIds.current.has(item.id));
      
      if (newItems.length > 0) {
        setIsTranslating(true);
        const titlesToTranslate = newItems.map(item => item.text);
        const translatedTitles = await translateHeadlines(titlesToTranslate);
        
        const processedItems = newItems.map((item, index) => ({
          ...item,
          text: translatedTitles[index] || item.text,
          sentiment: analyzeSentiment(translatedTitles[index] || item.text),
          importance: analyzeImportance(translatedTitles[index] || item.text)
        }));

        processedItems.forEach(item => processedIds.current.add(item.id));
        
        setNews(prev => {
          const combined = [...processedItems, ...prev]
            .sort((a, b) => b.rawTime - a.rawTime)
            .slice(0, 100);
          return combined;
        });
        
        setLastSyncTime(new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setIsTranslating(false);
      }
    } catch (e) { console.error("Global News Error", e); }
    finally { setLoading(false); }
  }, [isPaused]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 45000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filteredNews = news.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const connectionLabel = () => {
    switch(connectionStatus) {
      case 'live': return '數據連線中';
      case 'connecting': return '正在連線';
      case 'error': return '連線不穩定';
      default: return '離線狀態';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
                <Activity size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">FinPulse AI</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{connectionLabel()}</span>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === cat.id ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="搜尋新聞標題..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
               <div className="hidden sm:flex flex-col items-end mr-2">
                 <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">數據最後更新</span>
                 <span className="text-xs font-mono text-blue-400">{lastSyncTime}</span>
               </div>
               <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                 <Bell size={20} />
                 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-900"></span>
               </button>
               <button className="p-2 text-slate-400 hover:text-white transition-colors">
                 <Settings size={20} />
               </button>
            </div>
            <div className="h-8 w-px bg-slate-800 mx-2 hidden sm:block"></div>
            <div className="font-mono text-sm text-blue-400 hidden sm:block">台北 {currentTime}</div>
          </div>
        </div>
        
        {/* Real-time Ticker */}
        <PriceTicker prices={prices} connectionStatus={connectionStatus} />
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* News Feed - Center */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
               <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                 <Zap className="text-yellow-400" size={20} />
                 即時資訊流
               </h2>
               <div className="flex items-center gap-2">
                 <div className="bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-xs text-slate-400 font-mono">
                   已同步 {filteredNews.length} 則動態
                 </div>
                 {isTranslating && (
                   <div className="flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full border border-blue-400/20 animate-pulse">
                     <Languages size={10} />
                     AI 翻譯中
                   </div>
                 )}
               </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  isPaused 
                    ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? '恢復同步' : '暫停串流'}
              </button>
              <button 
                onClick={fetchNews}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[700px]">
            {loading && news.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
                <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
                <p className="font-mono uppercase tracking-widest text-xs">正在與全球新聞伺服器同步並進行翻譯...</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
                <BarChart3 size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">目前的篩選條件下無結果。</p>
                <button onClick={() => {setFilter('all'); setSearchQuery('');}} className="mt-4 text-blue-400 underline underline-offset-4 text-sm">清除所有篩選</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredNews.map((item, idx) => (
                  <NewsCard key={item.id} item={item} isNew={idx === 0 && !isPaused} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence & Analytics - Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <MarketAnalysisPanel news={news} />
          
          {/* Market Status Overview */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={14} />
              市場概覽快照 (台北時區)
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded">
                    <Zap size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">加密貨幣波動性</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">適中</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded">
                    <Activity size={18} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">市場情緒指數</span>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded border border-slate-400/20">中立</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-600 leading-relaxed italic">
                數據整合自全球 RSS 即時來源，由 AI 自動翻譯為繁體中文。所有時間均校準為台北時區 (UTC+8)。
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center shadow-lg">
              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">今日獲取訊號</span>
              <span className="text-2xl font-mono text-white font-bold">{news.length}</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center shadow-lg">
              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">看漲情緒比</span>
              <span className="text-2xl font-mono text-emerald-400 font-bold">
                {Math.round((news.filter(n => n.sentiment === 'bullish').length / (news.length || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Sticky Refresh (Bottom Right) */}
      <button 
        onClick={fetchNews}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform border-4 border-slate-900"
      >
        <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}
