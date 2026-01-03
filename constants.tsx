
import React from 'react';
import { Globe, Activity, DollarSign, Cpu, TrendingUp } from 'lucide-react';
import { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'all', name: '全球宏觀', icon: <Globe size={14} /> },
  { id: 'macro', name: '宏觀經濟', icon: <Activity size={14} /> },
  { id: 'forex', name: '外匯/匯率', icon: <DollarSign size={14} /> },
  { id: 'crypto', name: '加密貨幣', icon: <Cpu size={14} /> },
  { id: 'stock', name: '股票市場', icon: <TrendingUp size={14} /> },
];

export const RSS_FEEDS = [
  // 使用更精確的搜尋參數並鎖定最新消息
  { url: 'https://news.google.com/rss/search?q=when:1h+financial+markets&hl=zh-TW&gl=TW&ceid=TW:zh-hant', type: 'macro' },
  { url: 'https://news.google.com/rss/search?q=when:1h+stock+market+breaking&hl=zh-TW&gl=TW&ceid=TW:zh-hant', type: 'stock' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'crypto' },
  { url: 'https://news.google.com/rss/search?q=when:1h+fed+interest+rates&hl=en-US&gl=US&ceid=US:en', type: 'macro' }
];

export const KEYWORDS = {
  high_importance: [
    'Fed', 'CPI', 'GDP', 'Rates', 'Inflation', 'War', 'Crisis', 'Breaking', 'Crash', 'Surge', 'Unemployment',
    'ECB', 'BoE', 'Powell', 'Yellen', 'Deficit', 'Default', 'SEC', 'ETF', 'Nvidia', 'TSMC', 'Apple', '聯準會', '升息', '通膨'
  ],
  bullish: [
    'Surge', 'Soar', 'Rally', 'Gain', 'Profit', 'Bullish', 'Buy', 'Upgrade', 'Outperform', 'Recovery', 'Approve', 'Wins', 'Beat', '大漲', '反彈', '看好'
  ],
  bearish: [
    'Plunge', 'Tumble', 'Slump', 'Loss', 'Bearish', 'Sell', 'Downgrade', 'Underperform', 'Recession', 'Deny', 'Lawsuit', 'Miss', '暴跌', '衰退', '看淡'
  ]
};
