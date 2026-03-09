import { useState, useCallback, useEffect } from 'react';
import { WatchlistItem, DailyData, Asset, NewsAlertItem } from '../types';
import { getInitialMarketData, getUpdatedMarketData } from '../services/marketDataService';
import { getExecutiveSummary, getKeyNewsAlerts, getAssetInsights } from '../services/geminiService';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const useTradingBot = (userId?: string) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [dailyAdditions, setDailyAdditions] = useState<WatchlistItem[]>([]);
  const [marketData, setMarketData] = useState<Asset[]>(getInitialMarketData);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [executiveSummary, setExecutiveSummary] = useState<string>('Initialize the market to generate the first day\'s summary.');
  const [keyNewsAlerts, setKeyNewsAlerts] = useState<NewsAlertItem>({ alerts: ['No news alerts yet.'], sources: [] });

  // Load watchlist from Firestore on mount if user is logged in
  useEffect(() => {
    if (!userId) return;
    
    const loadWatchlist = async () => {
      try {
        const watchlistRef = collection(db, 'users', userId, 'watchlist');
        const snapshot = await getDocs(watchlistRef);
        if (!snapshot.empty) {
          const loadedWatchlist: WatchlistItem[] = [];
          snapshot.forEach(doc => {
            loadedWatchlist.push(doc.data() as WatchlistItem);
          });
          setWatchlist(loadedWatchlist);
          // Assuming currentDay can be derived from the latest date in watchlist
          // For simplicity, we just set it to 1 if there's data, or we could store currentDay in UserProfile
          setCurrentDay(1);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}/watchlist`);
      }
    };
    
    loadWatchlist();
  }, [userId]);

  // Save watchlist to Firestore whenever it changes
  useEffect(() => {
    if (!userId || watchlist.length === 0) return;
    
    const saveWatchlist = async () => {
      try {
        const batch = writeBatch(db);
        watchlist.forEach(item => {
          const docRef = doc(db, 'users', userId, 'watchlist', item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/watchlist`);
      }
    };
    
    saveWatchlist();
  }, [watchlist, userId]);

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
                    highPrice: assetUpdate.highPrice || assetUpdate.price,
                    lowPrice: assetUpdate.lowPrice || assetUpdate.price,
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
                        highPrice: asset.highPrice || asset.price,
                        lowPrice: asset.lowPrice || asset.price,
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
    if (currentDay === 0 && !userId) {
      advanceDay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (isLoading || currentDay === 0) return;

    const interval = setInterval(() => {
      // Generate fluctuations for all assets to ensure consistency across states
      const fluctuations: Record<string, number> = {};
      marketData.forEach(asset => {
        // Minor fluctuation: -0.2% to +0.2% for 30-second intervals
        fluctuations[asset.id] = 1 + (Math.random() * 0.004 - 0.002);
      });

      // 1. Update Market Data
      setMarketData(prev => prev.map(asset => {
        const f = fluctuations[asset.id] || 1;
        const newPrice = asset.price * f;
        return {
          ...asset,
          price: newPrice,
          marketCap: asset.marketCap * f,
          dailyChange: ((newPrice - asset.openingPrice) / asset.openingPrice) * 100,
          highPrice: Math.max(asset.highPrice || newPrice, newPrice),
          lowPrice: Math.min(asset.lowPrice || newPrice, newPrice),
        };
      }));

      // Helper to update watchlist-style items
      const updateWatchlistItems = (items: WatchlistItem[]) => items.map(item => {
        const f = fluctuations[item.id] || 1;
        if (item.dailyData.length === 0) return item;
        
        const lastIndex = item.dailyData.length - 1;
        const lastData = item.dailyData[lastIndex];
        const newPrice = lastData.closingPrice * f;
        const entryPrice = item.dailyData[0].closingPrice;
        
        const updatedLastData = {
          ...lastData,
          closingPrice: newPrice,
          marketCap: lastData.marketCap * f,
          totalPercentSinceWatchlist: ((newPrice - entryPrice) / entryPrice) * 100,
          dailyPercentChange: ((newPrice - lastData.openingPrice) / lastData.openingPrice) * 100,
          highPrice: Math.max(lastData.highPrice, newPrice),
          lowPrice: Math.min(lastData.lowPrice, newPrice),
        };
        
        const newDailyData = [...item.dailyData];
        newDailyData[lastIndex] = updatedLastData;
        return { ...item, dailyData: newDailyData };
      });

      // 2. Update Watchlist
      setWatchlist(prev => updateWatchlistItems(prev));

      // 3. Update Daily Additions
      setDailyAdditions(prev => updateWatchlistItems(prev));

    }, 30000);

    return () => clearInterval(interval);
  }, [isLoading, currentDay, marketData]);

  return { watchlist, dailyAdditions, executiveSummary, keyNewsAlerts, currentDay, isLoading, error, advanceDay };
};