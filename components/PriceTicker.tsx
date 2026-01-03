
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PriceData } from '../types';

interface TickerItemProps {
  label: string;
  price: string | undefined;
  changePercent: string | undefined;
  colorClass: string;
  isLoading: boolean;
  isError: boolean;
}

const TickerItem: React.FC<TickerItemProps> = ({ label, price, changePercent, colorClass, isLoading, isError }) => {
  const isPositive = parseFloat(changePercent || "0") >= 0;
  
  return (
    <div className="flex items-center mx-4 group cursor-default">
      <span className={`${colorClass} font-bold mr-2 text-xs uppercase`}>{label}</span>
      {isLoading ? (
        <div className="h-4 w-12 bg-slate-800 rounded animate-pulse"></div>
      ) : isError ? (
        <span className="text-slate-500 font-mono">---</span>
      ) : (
        <>
          <span className="font-mono text-slate-100 mr-2 tabular-nums">{price}</span>
          <span className={`flex items-center text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
             {isPositive ? <TrendingUp size={10} className="mr-0.5"/> : <TrendingDown size={10} className="mr-0.5"/>} 
             {changePercent}%
          </span>
        </>
      )}
    </div>
  );
};

interface PriceTickerProps {
  prices: { btc: PriceData | null; eth: PriceData | null; usdtwd: string | null; jpytwd: string | null };
  connectionStatus: string;
}

export const PriceTicker: React.FC<PriceTickerProps> = ({ prices, connectionStatus }) => {
  const items = [
    { label: 'BTC/USD', price: prices.btc?.p, change: prices.btc?.P, color: 'text-orange-400' },
    { label: 'ETH/USD', price: prices.eth?.p, change: prices.eth?.P, color: 'text-indigo-400' },
    { label: 'USD/TWD', price: prices.usdtwd, change: "0.00", color: 'text-emerald-400' },
    { label: 'JPY/TWD', price: prices.jpytwd, change: "0.00", color: 'text-pink-400' },
  ];

  return (
    <div className="flex-1 overflow-hidden relative bg-slate-900 border-x border-slate-800">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>
      
      <div className="animate-scroll py-2 items-center">
        {[...items, ...items].map((item, idx) => (
          <TickerItem 
            key={`${item.label}-${idx}`}
            label={item.label}
            price={item.price || "---"}
            changePercent={item.change}
            colorClass={item.color}
            isLoading={!item.price && connectionStatus !== 'error'}
            isError={connectionStatus === 'error'}
          />
        ))}
      </div>
    </div>
  );
};
