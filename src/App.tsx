import React, { useState, useEffect, useRef } from 'react';
import { useTradingBot } from '@/hooks/useTradingBot';
import { Header } from '@/components/layout/Header';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { AssetTable } from '@/components/assets/AssetTable';
import { WatchlistItem } from '@/types';
import { ArrowPathIcon, ExclamationTriangleIcon, LinkIcon } from '@/components/ui/IconComponents';
import { AssetDetailModal } from '@/components/assets/AssetDetailModal';
import { ToastContainer, ToastNotification } from '@/components/ui/Toast';
import { useAuth } from '@/components/layout/AuthProvider';
import { MarketAnalyst } from '@/components/dashboard/MarketAnalyst';
import { PortfolioPerformance } from '@/components/dashboard/PortfolioPerformance';
import { BrainCircuit, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading: authLoading, signIn, logOut } = useAuth();

  const {
    watchlist,
    dailyAdditions,
    executiveSummary,
    keyNewsAlerts,
    currentDay,
    isLoading,
    error,
    advanceDay,
  } = useTradingBot(user?.uid);

  const [selectedAsset, setSelectedAsset] = React.useState<WatchlistItem | null>(null);
  const [numAssetsToWatch, setNumAssetsToWatch] = useState(5);
  const [alertThreshold, setAlertThreshold] = useState(5.0);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analyst'>('dashboard');

  // Keep track of which assets have been alerted for the current day to avoid spam
  const alertedAssetsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (isLoading || currentDay === 0) return;

    const newNotifications: ToastNotification[] = [];

    watchlist.forEach(asset => {
      const latestData = asset.dailyData[asset.dailyData.length - 1];
      if (!latestData) return;

      const percentChange = latestData.dailyPercentChange;

      if (Math.abs(percentChange) >= alertThreshold) {
        const lastAlertedDay = alertedAssetsRef.current[asset.id];

        // Only alert once per day per asset
        if (lastAlertedDay !== currentDay) {
          alertedAssetsRef.current[asset.id] = currentDay;

          const direction = percentChange > 0 ? 'surged' : 'dropped';
          const type = percentChange > 0 ? 'info' : 'warning';

          newNotifications.push({
            id: `${asset.id}-${currentDay}-${Date.now()}`,
            message: `${asset.name} (${asset.symbol}) has ${direction} by ${Math.abs(percentChange).toFixed(2)}% today!`,
            type
          });
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...prev, ...newNotifications]);
    }
  }, [watchlist, currentDay, alertThreshold, isLoading]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <ArrowPathIcon className="w-12 h-12 text-blue-accent animate-spin" />
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    const { developerBypass } = useAuth();
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-4xl font-bold mb-4">Investment Trading Bot <span className="text-blue-accent">Mogul</span></h1>
        <p className="text-gray-400 mb-8 text-center max-w-md">Sign in to track your assets, get AI-powered market insights, and analyze trends.</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              console.log("Button clicked in App.tsx!");
              signIn();
            }}
            className="px-6 py-3 bg-blue-accent text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-colors duration-200"
          >
            Sign in with Google
          </button>

          <button
            onClick={developerBypass}
            className="px-6 py-3 bg-gray-800 text-gray-300 font-semibold rounded-lg border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors duration-200"
          >
            Enter as Guest (Dev Bypass)
          </button>
        </div>
      </div>
    );
  }

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

    if (activeTab === 'analyst') {
      return (
        <div className="p-6 max-w-5xl mx-auto">
          <MarketAnalyst />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        <div className="lg:col-span-3 xl:col-span-4">
          <PortfolioPerformance watchlist={watchlist} />
        </div>

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

        <div className="lg:col-span-3 xl:col-span-1 row-start-3 xl:row-start-3 xl:col-start-4">
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
              <AssetTable assets={dailyAdditions.map(item => ({ ...item, dailyData: [item.dailyData[item.dailyData.length - 1]] }))} isDailyAdditions={true} onRowClick={handleSelectAsset} />
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
    <main className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      <Header
        currentDay={currentDay}
        onAdvanceDay={handleAdvanceDay}
        isLoading={isLoading}
        numAssetsToWatch={numAssetsToWatch}
        onNumAssetsChange={setNumAssetsToWatch}
        alertThreshold={alertThreshold}
        onAlertThresholdChange={setAlertThreshold}
        user={user}
        onLogOut={logOut}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 pt-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dashboard'
              ? 'border-blue-accent text-blue-accent'
              : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('analyst')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analyst'
              ? 'border-blue-accent text-blue-accent'
              : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              }`}
          >
            <BrainCircuit className="w-4 h-4" />
            AI Market Analyst
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {selectedAsset && <AssetDetailModal asset={selectedAsset} onClose={handleCloseModal} />}
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
    </main>
  );
};

export default App;