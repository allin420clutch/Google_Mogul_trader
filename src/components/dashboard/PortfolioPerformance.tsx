import React from 'react';
import { WatchlistItem } from '@/types';
import { ArrowDownIcon, ArrowUpIcon } from '@/components/ui/IconComponents';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { PieChart, Wallet, TrendingUp, Activity } from 'lucide-react';

interface PortfolioPerformanceProps {
  watchlist: WatchlistItem[];
}

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const PercentBadge: React.FC<{ value: number }> = ({ value }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  let colorClass = 'bg-gray-700 text-gray-300 border-gray-600';
  if (isPositive) colorClass = 'bg-green-500/10 text-green-400 border-green-500/20';
  if (isNegative) colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
  
  return (
    <span className={`flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
      {isPositive && <ArrowUpIcon className="w-3 h-3 mr-1" />}
      {isNegative && <ArrowDownIcon className="w-3 h-3 mr-1" />}
      {formatPercent(value)}
    </span>
  );
};

export const PortfolioPerformance: React.FC<PortfolioPerformanceProps> = ({ watchlist }) => {
  if (watchlist.length === 0) {
    return (
      <DashboardCard title="Portfolio Performance">
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <PieChart className="w-12 h-12 mb-3 opacity-20" />
          <p>Add assets to your watchlist to see portfolio performance.</p>
        </div>
      </DashboardCard>
    );
  }

  // Calculate metrics assuming 1 unit of each asset for simplicity
  let totalValue = 0;
  let totalDailyChangePercent = 0;
  let totalLifetimeChangePercent = 0;

  watchlist.forEach(item => {
    const latestData = item.dailyData[item.dailyData.length - 1];
    if (latestData) {
      totalValue += latestData.closingPrice;
      totalDailyChangePercent += latestData.dailyPercentChange;
      totalLifetimeChangePercent += latestData.totalPercentSinceWatchlist;
    }
  });

  const avgDailyChange = totalDailyChangePercent / watchlist.length;
  const avgLifetimeChange = totalLifetimeChangePercent / watchlist.length;

  return (
    <DashboardCard title="Portfolio Performance (Equal Weight)">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center text-gray-400 mb-2">
            <Wallet className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Total Index Value</span>
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Sum of 1 unit per asset
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center text-gray-400 mb-2">
            <Activity className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Avg Daily Change</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
              <PercentBadge value={avgDailyChange} />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Across {watchlist.length} assets
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 flex flex-col justify-between">
          <div className="flex items-center text-gray-400 mb-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Avg Lifetime Return</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-white">
               <PercentBadge value={avgLifetimeChange} />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Since added to watchlist
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};
