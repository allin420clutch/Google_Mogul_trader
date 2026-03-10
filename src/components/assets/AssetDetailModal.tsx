import React, { useEffect, useState } from 'react';
import { WatchlistItem, DailyData, SentimentAnalysis } from '@/types';
import { PriceChart } from '@/components/assets/PriceChart';
import { XMarkIcon, ArrowDownIcon, ArrowUpIcon, ArrowPathIcon } from '@/components/ui/IconComponents';
import { getSentimentAnalysis } from '@/services/geminiService';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAuth } from '@/components/layout/AuthProvider';
import { ShoppingCart, LayoutList, Wallet } from 'lucide-react';

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
  const { user } = useAuth();
  const { profile, holdings, executeTrade } = usePortfolio(user?.uid);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [isSentimentLoading, setIsSentimentLoading] = useState(false);
  const [tradeAmount, setTradeAmount] = useState<number>(0);
  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const latestData = asset.dailyData[asset.dailyData.length - 1];
  const currentHolding = holdings.find(h => h.assetId === asset.id);

  useEffect(() => {
    const fetchSentiment = async () => {
      setIsSentimentLoading(true);
      try {
        const insights = asset.dailyData.map(d => d.keyNewsInsight).filter(Boolean);
        const result = await getSentimentAnalysis(asset.name, insights);
        setSentiment(result);
      } catch (error) {
        console.error("Sentiment fetch failed:", error);
      } finally {
        setIsSentimentLoading(false);
      }
    };

    fetchSentiment();
  }, [asset]);

  const handleTrade = async (type: 'BUY' | 'SELL') => {
    if (tradeAmount <= 0) {
      setTradeError('Enter a valid amount');
      return;
    }
    setIsTrading(true);
    setTradeError(null);
    setTradeSuccess(null);
    try {
      await executeTrade(asset, tradeAmount, type);
      setTradeSuccess(`Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${tradeAmount} ${asset.symbol}`);
      setTradeAmount(0);
    } catch (err: any) {
      setTradeError(err.message || 'Trade failed');
    } finally {
      setIsTrading(false);
    }
  };

  const getSentimentColor = (type: string) => {
    switch (type) {
      case 'Bullish': return 'text-green-500';
      case 'Bearish': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 66) return 'bg-green-500';
    if (score > 33) return 'bg-yellow-500';
    return 'bg-red-500';
  };

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

        <main className="p-6 overflow-y-auto space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Current Price</div>
              <div className="text-lg font-semibold text-white">{formatCurrency(latestData.closingPrice)}</div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Daily % Change</div>
              <div className="text-lg"><PercentChange value={latestData.dailyPercentChange} /></div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <div className="text-sm text-gray-400">Total % Since Watchlist</div>
              <div className="text-lg"><PercentChange value={latestData.totalPercentSinceWatchlist} /></div>
            </div>
          </div>

          {/* New Trading Section */}
          <section className="bg-gray-900 border border-blue-accent/30 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-accent" />
                    Trade {asset.symbol}
                  </h3>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Balance: <span className="text-blue-accent font-semibold">{formatCurrency(profile?.balance || 0)}</span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    value={tradeAmount === 0 ? '' : tradeAmount}
                    onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-accent/50 transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                    Quantity
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={isTrading}
                    onClick={() => handleTrade('BUY')}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isTrading ? 'Processing...' : 'BUY'}
                  </button>
                  <button
                    disabled={isTrading || !currentHolding || currentHolding.amount <= 0}
                    onClick={() => handleTrade('SELL')}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isTrading ? 'Processing...' : 'SELL'}
                  </button>
                </div>

                {tradeError && <p className="text-red-500 text-xs font-medium animate-pulse">{tradeError}</p>}
                {tradeSuccess && <p className="text-green-500 text-xs font-medium">{tradeSuccess}</p>}
              </div>

              <div className="w-full md:w-64 bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-400 border-b border-gray-700 pb-2 flex items-center gap-2">
                  <LayoutList className="w-4 h-4" />
                  Your Position
                </h4>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Holdings:</span>
                  <span className="text-xs font-bold text-white">{currentHolding?.amount.toFixed(4) || '0.0000'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Avg. Cost:</span>
                  <span className="text-xs font-bold text-white">{formatCurrency(currentHolding?.averageCost || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Market Value:</span>
                  <span className="text-xs font-bold text-white">{formatCurrency((currentHolding?.amount || 0) * latestData.closingPrice)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sentiment Section */}
          <section className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                AI Sentiment Analysis
                {isSentimentLoading && <ArrowPathIcon className="w-4 h-4 ml-2 animate-spin text-blue-accent" />}
              </h3>
              {sentiment && (
                <span className={`font-bold px-2 py-1 rounded text-sm bg-gray-800 border border-gray-600 ${getSentimentColor(sentiment.sentiment)}`}>
                  {(sentiment.sentiment || 'Neutral').toUpperCase()}
                </span>
              )}
            </div>

            {isSentimentLoading ? (
              <div className="py-4 flex flex-col items-center justify-center space-y-2">
                <p className="text-gray-400 text-sm italic">Processing historical insights for sentiment...</p>
              </div>
            ) : sentiment ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${getScoreColor(sentiment.score)}`}
                      style={{ width: `${sentiment.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-gray-300 w-8">{sentiment.score}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-blue-accent/30 pl-3">
                  {sentiment.summary}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">Analysis unavailable.</p>
            )}
          </section>

          {/* Chart Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Price History & Volatility (OHLC)</h3>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <PriceChart data={asset.dailyData} width={700} height={250} />
            </div>
          </div>

          {/* Insights Table */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Historical Data Log</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg shadow-inner">
              <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700/80 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Closing</th>
                    <th className="px-4 py-2">Daily %</th>
                    <th className="px-4 py-2">Mogul Insight</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/50">
                  {[...asset.dailyData].reverse().map((data: DailyData) => (
                    <tr key={data.date} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">{data.date}</td>
                      <td className="px-4 py-2 font-mono">{formatCurrency(data.closingPrice)}</td>
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