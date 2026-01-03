
// Fix: Import React to provide access to the React namespace for types like ReactNode
import React from 'react';

export interface PriceData {
  p: string; // price
  c: number; // change
  P: string; // change percent string
}

export interface PricesState {
  btc: PriceData | null;
  eth: PriceData | null;
  usdtwd: string | null;
  jpytwd: string | null;
}

export interface NewsItem {
  id: string;
  time: string;
  rawTime: number;
  text: string;
  type: 'macro' | 'forex' | 'crypto' | 'stock' | 'all';
  importance: 'high' | 'normal';
  sentiment: 'bullish' | 'bearish' | 'neutral' | null;
  url: string;
  source: string;
  summary?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export type ConnectionStatus = 'connecting' | 'live' | 'fallback' | 'error';