import { Asset } from '@/types';
import { INITIAL_ASSETS } from '@/constants/assets';

export const getInitialMarketData = (): Asset[] => {
  return INITIAL_ASSETS.map(asset => ({
    ...asset,
    highPrice: asset.price,
    lowPrice: asset.price
  }));
};

export const getUpdatedMarketData = (previousData: Asset[]): Asset[] => {
  return previousData.map(asset => {
    const openingPrice = asset.price;
    // Introduce more volatility. Max change can be +/- 15%
    const volatilityFactor = 0.15;
    const changePercent = (Math.random() - 0.5) * 2 * volatilityFactor;

    const closingPrice = openingPrice * (1 + changePercent);
    const newMarketCap = asset.marketCap * (1 + changePercent);
    const dailyChange = changePercent * 100;

    // Generate high and low prices
    const maxOC = Math.max(openingPrice, closingPrice);
    const minOC = Math.min(openingPrice, closingPrice);
    // Randomly extend high/low beyond open/close
    const highPrice = maxOC * (1 + Math.random() * (volatilityFactor / 2));
    const lowPrice = minOC * (1 - Math.random() * (volatilityFactor / 2));

    const lifetimeChange = ((closingPrice - (asset.price / (1 + asset.lifetimeChange / 100))) / (asset.price / (1 + asset.lifetimeChange / 100))) * 100;

    return {
      ...asset,
      price: closingPrice,
      marketCap: newMarketCap,
      dailyChange: dailyChange,
      openingPrice: openingPrice,
      highPrice,
      lowPrice,
      lifetimeChange: lifetimeChange
    };
  });
};