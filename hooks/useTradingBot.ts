import { useState, useCallback, useEffect } from 'react';
import { WatchlistItem, DailyData, Asset, NewsAlertItem } from '../types';
import { getInitialMarketData, getUpdatedMarketData } from '../services/marketDataService';
import { getExecutiveSummary, getKeyNewsAlerts, getAssetInsights } from '../services/geminiService';

export const useTradingBot = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [dailyAdditions, setDailyAdditions] = useState<WatchlistItem[]>([]);
  const [marketData, setMarketData] = useState<Asset[]>(getInitialMarketData);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [executiveSummary, setExecutiveSummary] = useState<string>('Initialize the market to generate the first day\'s summary.');
  const [keyNewsAlerts, setKeyNewsAlerts] = useState<NewsAlertItem>({ alerts: ['No news alerts yet.'], sources: [] });

  const advanceDay = useCallback(async (numAssets: number = 5) => {
    setIsLoading(true);
    setError('');

    try {
        const newDay = currentDay + 1;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + newDay);
        const dateString = newDate.toISOString().split('T')[0];
        
        const newMarketData = getUpdatedMarketData(marketData);
        setMarketData(newMarketData);

        const sortedByChange = [...newMarketData].sort((a, b) => b.dailyChange - a.dailyChange);
        const topGainers = sortedByChange.slice(0, numAssets);
        const topLosers = sortedByChange.slice(-numAssets).reverse();
        const newWatchlistAdditions = [...topGainers, ...topLosers];
        
        // AI-powered analysis
        const [summary, newsAlerts, assetInsights] = await Promise.all([
            getExecutiveSummary(topGainers, topLosers),
            getKeyNewsAlerts(),
            getAssetInsights(newMarketData)
        ]);
        setExecutiveSummary(summary);
        setKeyNewsAlerts(newsAlerts);

        let newAdditionsForDay: WatchlistItem[] = [];

        const updatedWatchlist = watchlist.map(item => {
            const assetUpdate = newMarketData.find(a => a.id === item.id);
            if (assetUpdate) {
                const entryPrice = item.dailyData[0].closingPrice;
                const totalPercentSinceWatchlist = ((assetUpdate.price - entryPrice) / entryPrice) * 100;

                const newDailyData: DailyData = {
                    date: dateString,
                    marketCap: assetUpdate.marketCap,
                    closingPrice: assetUpdate.price,
                    openingPrice: assetUpdate.openingPrice,
                    dailyPercentChange: assetUpdate.dailyChange,
                    totalPercentSinceWatchlist,
                    lifetimePercentChange: assetUpdate.lifetimeChange,
                    keyNewsInsight: assetInsights[item.symbol] || 'No specific insight available.'
                };
                return { ...item, dailyData: [...item.dailyData, newDailyData] };
            }
            return item;
        });

        newWatchlistAdditions.forEach(asset => {
            if (!updatedWatchlist.some(item => item.id === asset.id)) {
                const newItem: WatchlistItem = {
                    id: asset.id,
                    name: asset.name,
                    symbol: asset.symbol,
                    dateOfEntry: dateString,
                    dailyData: [{
                        date: dateString,
                        marketCap: asset.marketCap,
                        closingPrice: asset.price,
                        openingPrice: asset.openingPrice,
                        dailyPercentChange: asset.dailyChange,
                        totalPercentSinceWatchlist: 0,
                        lifetimePercentChange: asset.lifetimeChange,
                        keyNewsInsight: assetInsights[asset.symbol] || 'No specific insight available.'
                    }]
                };
                updatedWatchlist.push(newItem);
                newAdditionsForDay.push(newItem);
            }
        });
        
        const filteredWatchlist = updatedWatchlist.filter(item => {
            const daysOnList = (newDay - (item.dailyData[0] ? parseInt(item.dailyData[0].date.split('-')[2]) : 0));
            return daysOnList <= 42; // 6 weeks
        });

        setWatchlist(filteredWatchlist);
        setDailyAdditions(newAdditionsForDay);
        setCurrentDay(newDay);

    } catch (err) {
        console.error("Error advancing day:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while processing market data.');
    } finally {
        setIsLoading(false);
    }
  }, [currentDay, marketData, watchlist]);

  useEffect(() => {
    if (currentDay === 0) {
      advanceDay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return { watchlist, dailyAdditions, executiveSummary, keyNewsAlerts, currentDay, isLoading, error, advanceDay };
};