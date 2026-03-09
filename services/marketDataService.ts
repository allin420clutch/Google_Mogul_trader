import { Asset } from '../types';

const initialAssets: Asset[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 68000, marketCap: 1300000000000, dailyChange: 0, openingPrice: 68000, lifetimeChange: 65000 },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3500, marketCap: 420000000000, dailyChange: 0, openingPrice: 3500, lifetimeChange: 350000 },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 160, marketCap: 73000000000, dailyChange: 0, openingPrice: 160, lifetimeChange: 80000 },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: 600, marketCap: 88000000000, dailyChange: 0, openingPrice: 600, lifetimeChange: 200000 },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: 0.52, marketCap: 28000000000, dailyChange: 0, openingPrice: 0.52, lifetimeChange: 8600 },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.45, marketCap: 16000000000, dailyChange: 0, openingPrice: 0.45, lifetimeChange: 2200 },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: 0.16, marketCap: 23000000000, dailyChange: 0, openingPrice: 0.16, lifetimeChange: 26000 },
    { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', price: 35, marketCap: 13000000000, dailyChange: 0, openingPrice: 35, lifetimeChange: 1100 },
    { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: 17, marketCap: 10000000000, dailyChange: 0, openingPrice: 17, lifetimeChange: 11000 },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: 7, marketCap: 9000000000, dailyChange: 0, openingPrice: 7, lifetimeChange: 230 },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC', price: 0.7, marketCap: 6900000000, dailyChange: 0, openingPrice: 0.7, lifetimeChange: 26000 },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', price: 85, marketCap: 6300000000, dailyChange: 0, openingPrice: 85, lifetimeChange: 1900 },
    { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', price: 10, marketCap: 7500000000, dailyChange: 0, openingPrice: 10, lifetimeChange: 240 },
    { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: 0.000025, marketCap: 14000000000, dailyChange: 0, openingPrice: 0.000025, lifetimeChange: 3000000 },
    { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', price: 8.5, marketCap: 3300000000, dailyChange: 0, openingPrice: 8.5, lifetimeChange: 750 },
    { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', price: 6, marketCap: 3300000000, dailyChange: 0, openingPrice: 6, lifetimeChange: -75 },
    { id: 'near-protocol', name: 'NEAR Protocol', symbol: 'NEAR', price: 7.5, marketCap: 8000000000, dailyChange: 0, openingPrice: 7.5, lifetimeChange: 650 },
    { id: 'stellar', name: 'Stellar', symbol: 'XLM', price: 0.11, marketCap: 3200000000, dailyChange: 0, openingPrice: 0.11, lifetimeChange: 3600 },
    { id: 'vechain', name: 'VeChain', symbol: 'VET', price: 0.035, marketCap: 2500000000, dailyChange: 0, openingPrice: 0.035, lifetimeChange: 1700 },
    { id: 'algorand', name: 'Algorand', symbol: 'ALGO', price: 0.18, marketCap: 1500000000, dailyChange: 0, openingPrice: 0.18, lifetimeChange: -25 },
];

export const getInitialMarketData = (): Asset[] => {
  return initialAssets.map(asset => ({
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

        const lifetimeChange = ((closingPrice - (asset.price / (1 + asset.lifetimeChange/100))) / (asset.price / (1 + asset.lifetimeChange/100))) * 100;

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