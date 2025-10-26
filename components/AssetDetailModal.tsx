import React from 'react';
import { WatchlistItem, DailyData } from '../types';
import { PriceChart } from './PriceChart';
import { XMarkIcon, ArrowDownIcon, ArrowUpIcon } from './IconComponents';

interface AssetDetailModalProps {
  asset: WatchlistItem;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
};

const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

const PercentChange: React.FC<{ value: number }> = ({ value }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const colorClass = isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-400';
    
    return (
        <span className={`flex items-center font-semibold ${colorClass}`}>
            {isPositive && <ArrowUpIcon className="w-4 h-4 mr-1" />}
            {isNegative && <ArrowDownIcon className="w-4 h-4 mr-1" />}
            {formatPercent(value)}
        </span>
    );
};

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
  const latestData = asset.dailyData[asset.dailyData.length - 1];

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-4 font-bold text-xl">{asset.symbol.charAt(0)}</div>
            <div>
              <h2 className="text-xl font-bold text-white">{asset.name} ({asset.symbol})</h2>
              <p className="text-sm text-gray-400">Date of Entry: {asset.dateOfEntry}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close modal">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
             <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Current Price</div>
                <div className="text-lg font-semibold text-white">{formatCurrency(latestData.closingPrice)}</div>
             </div>
             <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Daily % Change</div>
                <div className="text-lg"><PercentChange value={latestData.dailyPercentChange} /></div>
             </div>
             <div className="bg-gray-700/50 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Total % Since Watchlist</div>
                <div className="text-lg"><PercentChange value={latestData.totalPercentSinceWatchlist} /></div>
             </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-white">Price History Since Watchlist</h3>
            <div className="bg-gray-900 p-4 rounded-lg">
                <PriceChart data={asset.dailyData} width={700} height={250} />
            </div>
          </div>

          <div>
             <h3 className="text-lg font-semibold mb-2 text-white">Daily Data & Insights</h3>
             <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Closing Price</th>
                            <th className="px-4 py-2">Daily % Change</th>
                            <th className="px-4 py-2">Key News/Insight</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800">
                        {[...asset.dailyData].reverse().map((data: DailyData) => (
                            <tr key={data.date} className="border-b border-gray-700 last:border-b-0">
                                <td className="px-4 py-2">{data.date}</td>
                                <td className="px-4 py-2">{formatCurrency(data.closingPrice)}</td>
                                <td className="px-4 py-2"><PercentChange value={data.dailyPercentChange} /></td>
                                <td className="px-4 py-2 text-gray-300">{data.keyNewsInsight}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};