import React from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { WatchlistItem } from '@/types';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Wallet, History, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PortfolioViewProps {
    userId?: string;
    watchlist: WatchlistItem[];
    onAssetClick: (asset: WatchlistItem) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const PortfolioView: React.FC<PortfolioViewProps> = ({ userId, watchlist, onAssetClick }) => {
    const { profile, holdings, transactions, isLoading } = usePortfolio(userId);

    const formatCurrency = (val: number) =>
        val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const getAssetPrice = (symbol: string) => {
        const asset = watchlist.find(a => a.symbol === symbol);
        return asset ? asset.dailyData[asset.dailyData.length - 1].closingPrice : 0;
    };

    const totalHoldingsValue = holdings.reduce((sum, h) => {
        return sum + (h.amount * getAssetPrice(h.symbol));
    }, 0);

    const totalValue = (profile?.balance || 0) + totalHoldingsValue;

    const chartData = holdings.map(h => ({
        name: h.symbol,
        value: h.amount * getAssetPrice(h.symbol)
    })).sort((a, b) => b.value - a.value);

    if (chartData.length > 0 && profile?.balance) {
        chartData.push({ name: 'Cash', value: profile.balance });
    }

    if (isLoading && !profile) {
        return <div className="p-8 text-center text-gray-400">Loading Portfolio...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Total Portfolio Value">
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</div>
                        <TrendingUp className="text-green-500 w-8 h-8" />
                    </div>
                    <p className="text-gray-400 text-sm mt-2">Combined Cash & Assets</p>
                </DashboardCard>

                <DashboardCard title="Cash Balance">
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-blue-accent">{formatCurrency(profile?.balance || 0)}</div>
                        <Wallet className="text-blue-accent w-8 h-8" />
                    </div>
                    <p className="text-gray-400 text-sm mt-2">Available for Trading</p>
                </DashboardCard>

                <DashboardCard title="Holdings Value">
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-purple-400">{formatCurrency(totalHoldingsValue)}</div>
                        <PieChartIcon className="text-purple-400 w-8 h-8" />
                    </div>
                    <p className="text-gray-400 text-sm mt-2">Market value of assets</p>
                </DashboardCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard title="Allocation">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        {chartData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                <span className="text-gray-300 font-medium">{d.name}</span>
                                <span className="text-gray-500">{((d.value / totalValue) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </DashboardCard>

                <DashboardCard title="Recent Transactions">
                    <div className="overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Asset</th>
                                    <th className="px-4 py-2">Amount</th>
                                    <th className="px-4 py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {transactions.length > 0 ? transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'BUY' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-white">{tx.symbol}</td>
                                        <td className="px-4 py-3 text-gray-300">{tx.amount.toFixed(4)}</td>
                                        <td className="px-4 py-3 text-gray-300">{formatCurrency(tx.total)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">No transactions yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </DashboardCard>
            </div>

            <DashboardCard title="Your Assets">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-xs text-gray-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Asset</th>
                                <th className="px-6 py-4">Balance</th>
                                <th className="px-6 py-4">Current Price</th>
                                <th className="px-6 py-4">Value</th>
                                <th className="px-6 py-4">Profit/Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {holdings.length > 0 ? holdings.map(h => {
                                const currentPrice = getAssetPrice(h.symbol);
                                const currentValue = h.amount * currentPrice;
                                const profit = currentValue - h.totalCostBasis;
                                const profitPercent = (profit / h.totalCostBasis) * 100;

                                return (
                                    <tr
                                        key={h.assetId}
                                        className="hover:bg-gray-800/30 cursor-pointer transition-colors"
                                        onClick={() => {
                                            const asset = watchlist.find(a => a.id === h.assetId);
                                            if (asset) onAssetClick(asset);
                                        }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mr-3 font-bold text-xs">{h.symbol}</div>
                                                <div>
                                                    <div className="font-bold text-white">{h.name}</div>
                                                    <div className="text-xs text-gray-500">Avg. {formatCurrency(h.averageCost)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-200">{h.amount.toFixed(4)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-300">{formatCurrency(currentPrice)}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-white">
                                            {formatCurrency(currentValue)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex flex-col items-end ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                <div className="font-bold text-sm">
                                                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                                                </div>
                                                <div className="text-[10px] flex items-center">
                                                    {profit >= 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                                                    {profitPercent.toFixed(2)}%
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <History className="mx-auto w-12 h-12 text-gray-700 mb-4" />
                                        <p className="text-gray-500">No holdings found. Start trading to see your portfolio!</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </DashboardCard>
        </div>
    );
};
