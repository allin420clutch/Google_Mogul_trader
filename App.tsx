import React, { useState } from 'react';
import { useTradingBot } from './hooks/useTradingBot';
import { Header } from './components/Header';
import { DashboardCard } from './components/DashboardCard';
import { AssetTable } from './components/AssetTable';
import { WatchlistItem } from './types';
import { ArrowPathIcon, ExclamationTriangleIcon, LinkIcon } from './components/IconComponents';
import { AssetDetailModal } from './components/AssetDetailModal';

const App: React.FC = () => {
  const {
    watchlist,
    dailyAdditions,
    executiveSummary,
    keyNewsAlerts,
    currentDay,
    isLoading,
    error,
    advanceDay,
  } = useTradingBot();

  const [selectedAsset, setSelectedAsset] = React.useState<WatchlistItem | null>(null);
  const [numAssetsToWatch, setNumAssetsToWatch] = useState(5);

  const handleSelectAsset = (asset: WatchlistItem) => {
    setSelectedAsset(asset);
  };

  const handleCloseModal = () => {
    setSelectedAsset(null);
  };
  
  const handleAdvanceDay = () => {
    advanceDay(numAssetsToWatch);
  };

  const getPerformanceSnapshot = (): WatchlistItem[] => {
    return watchlist
      .filter(item => item.dailyData.length > 7)
      .sort((a, b) => {
        const aPerf = a.dailyData[a.dailyData.length - 1].totalPercentSinceWatchlist;
        const bPerf = b.dailyData[b.dailyData.length - 1].totalPercentSinceWatchlist;
        return bPerf - aPerf;
      })
      .slice(0, 5);
  };

  const performanceSnapshot = getPerformanceSnapshot();

  const renderContent = () => {
    if (isLoading && currentDay === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <ArrowPathIcon className="w-12 h-12 text-blue-accent animate-spin" />
          <p className="mt-4 text-lg">Initializing Trading Mogul...</p>
        </div>
      );
    }

    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-screen">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500" />
            <p className="mt-4 text-xl font-semibold">An Error Occurred</p>
            <p className="mt-2 text-gray-400 text-center max-w-md">{error}</p>
        </div>
       )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            <div className="lg:col-span-3 xl:col-span-4">
                <DashboardCard title="Executive Summary">
                    <p className="text-gray-300">{executiveSummary}</p>
                </DashboardCard>
            </div>

            <div className="lg:col-span-3 xl:col-span-3">
                <DashboardCard title="Volatility Watchlist - Full View">
                    <AssetTable assets={watchlist} onRowClick={handleSelectAsset} />
                </DashboardCard>
            </div>

            <div className="lg:col-span-3 xl:col-span-1 row-start-2 xl:row-start-1 xl:col-start-4">
                <div className="flex flex-col gap-6">
                    <DashboardCard title="Key News & Market Alerts">
                        <ul className="space-y-3 list-disc list-inside text-gray-300">
                            {keyNewsAlerts.alerts.map((alert, index) => <li key={index}>{alert}</li>)}
                        </ul>
                        {keyNewsAlerts.sources && keyNewsAlerts.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <h4 className="font-semibold text-gray-200 mb-2">Sources:</h4>
                                <ul className="space-y-2">
                                    {keyNewsAlerts.sources.map((source, index) => (
                                        <li key={index} className="flex items-start">
                                            <LinkIcon className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-gray-500" />
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm break-all" title={source.title}>
                                                {source.title || new URL(source.uri).hostname}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </DashboardCard>
                    <DashboardCard title="Daily Watchlist Additions">
                        <AssetTable assets={dailyAdditions.map(item => ({...item, dailyData: [item.dailyData[item.dailyData.length - 1]]}))} isDailyAdditions={true} onRowClick={handleSelectAsset} />
                    </DashboardCard>
                    {performanceSnapshot.length > 0 && (
                        <DashboardCard title="Weekly Performance Snapshot (>7 days)">
                             <AssetTable assets={performanceSnapshot} isSnapshot={true} onRowClick={handleSelectAsset} />
                        </DashboardCard>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <Header
        currentDay={currentDay}
        onAdvanceDay={handleAdvanceDay}
        isLoading={isLoading}
        numAssetsToWatch={numAssetsToWatch}
        onNumAssetsChange={setNumAssetsToWatch}
      />
      {renderContent()}
      {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={handleCloseModal} />}
    </main>
  );
};

export default App;