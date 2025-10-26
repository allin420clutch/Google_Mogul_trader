import React from 'react';
import { WatchlistItem } from '../types';
import { ArrowDownIcon, ArrowUpIcon } from './IconComponents';

interface AssetTableProps {
  assets: WatchlistItem[];
  isDailyAdditions?: boolean;
  isSnapshot?: boolean;
  onRowClick?: (asset: WatchlistItem) => void;
}

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export const AssetTable: React.FC<AssetTableProps> = ({ assets, isDailyAdditions = false, isSnapshot = false, onRowClick }) => {
    if (assets.length === 0) {
        return <p className="text-gray-400 text-center py-4">No assets to display.</p>;
    }

    const headers = [
        { key: 'name', label: 'Asset' },
        ...(!isDailyAdditions && !isSnapshot ? [{ key: 'dateOfEntry', label: 'Date of Entry' }] : []),
        { key: 'marketCap', label: 'Market Cap' },
        ...(!isDailyAdditions && !isSnapshot ? [{ key: 'closingPrice', label: 'Closing Price (24h)' }] : []),
        ...(!isDailyAdditions && !isSnapshot ? [{ key: 'openingPrice', label: 'Opening Price (24h)' }] : []),
        { key: 'dailyPercentChange', label: 'Daily % Change' },
        { key: 'totalPercentSinceWatchlist', label: 'Total % Since Watchlist' },
        ...(!isDailyAdditions && !isSnapshot ? [{ key: 'lifetimePercentChange', label: 'Lifetime % Change' }] : []),
        ...(!isDailyAdditions && !isSnapshot ? [{ key: 'keyNewsInsight', label: 'Key News/Insight' }] : []),
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                    <tr>
                        {headers.map(header => (
                            <th key={header.key} scope="col" className="px-4 py-3">{header.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {assets.map((item) => {
                        const latestData = item.dailyData[item.dailyData.length - 1];
                        if (!latestData) return null;

                        return (
                            <tr 
                                key={item.id} 
                                className={`bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick?.(item)}
                            >
                                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 font-bold">{item.symbol.charAt(0)}</div>
                                        <div>
                                            <div>{item.name}</div>
                                            <div className="text-gray-500">{item.symbol}</div>
                                        </div>
                                    </div>
                                </td>
                                {!isDailyAdditions && !isSnapshot && <td className="px-4 py-3">{item.dateOfEntry}</td>}
                                <td className="px-4 py-3">{formatCurrency(latestData.marketCap)}</td>
                                {!isDailyAdditions && !isSnapshot && <td className="px-4 py-3">{formatCurrency(latestData.closingPrice)}</td>}
                                {!isDailyAdditions && !isSnapshot && <td className="px-4 py-3">{formatCurrency(latestData.openingPrice)}</td>}
                                <td className="px-4 py-3"><PercentChange value={latestData.dailyPercentChange} /></td>
                                <td className="px-4 py-3"><PercentChange value={latestData.totalPercentSinceWatchlist} /></td>
                                {!isDailyAdditions && !isSnapshot && <td className="px-4 py-3"><PercentChange value={latestData.lifetimePercentChange} /></td>}
                                {!isDailyAdditions && !isSnapshot && <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={latestData.keyNewsInsight}>{latestData.keyNewsInsight}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};