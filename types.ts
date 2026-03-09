export interface Asset {
  id: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  dailyChange: number;
  openingPrice: number;
  lifetimeChange: number;
  highPrice?: number;
  lowPrice?: number;
}

export interface DailyData {
  date: string;
  marketCap: number;
  closingPrice: number;
  openingPrice: number;
  highPrice: number;
  lowPrice: number;
  dailyPercentChange: number;
  totalPercentSinceWatchlist: number;
  lifetimePercentChange: number;
  keyNewsInsight: string;
}

export interface WatchlistItem {
  id: string;
  name: string;
  symbol: string;
  dateOfEntry: string;
  dailyData: DailyData[];
}

export interface NewsAlertItem {
  alerts: string[];
  sources: {
    uri: string;
    title: string;
  }[];
}

export interface SentimentAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  score: number; // 0 to 100
  summary: string;
}