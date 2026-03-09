import React from 'react';
import { DailyData } from '../types';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Scatter
} from 'recharts';

interface PriceChartProps {
  data: DailyData[];
  width?: number;
  height?: number;
}

const formatCurrency = (value: number) => {
    if (value < 1) {
        return `$${value.toFixed(6)}`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Find the main data payload (usually the first one, but let's be safe)
    const data = payload[0].payload;
    const isBullish = data.closingPrice >= data.openingPrice;
    const colorClass = isBullish ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl text-sm min-w-[200px] max-w-[320px]">
        <p className="text-gray-300 mb-3 font-semibold border-b border-gray-700 pb-2">{data.date}</p>
        
        <div className="space-y-3 mb-3">
          <div className="flex justify-between items-center group" title="Opening Price: The price of the asset at the beginning of the trading day.">
            <span className="text-gray-400 border-b border-dashed border-gray-500 cursor-help">Open</span> 
            <span className="text-white ml-4">{formatCurrency(data.openingPrice)}</span>
          </div>
          
          <div className="flex justify-between items-center group" title="High: The highest price reached during the trading day.">
            <span className="text-gray-400 border-b border-dashed border-gray-500 cursor-help">High</span> 
            <span className="text-white ml-4">{formatCurrency(data.highPrice)}</span>
          </div>
          
          <div className="flex justify-between items-center group" title="Low: The lowest price reached during the trading day.">
            <span className="text-gray-400 border-b border-dashed border-gray-500 cursor-help">Low</span> 
            <span className="text-white ml-4">{formatCurrency(data.lowPrice)}</span>
          </div>
          
          <div className="flex justify-between items-center group" title="Closing Price: The last price of the asset at the end of the trading day.">
            <span className="text-gray-400 border-b border-dashed border-gray-500 cursor-help">Close</span> 
            <span className={`font-bold ml-4 ${colorClass}`}>{formatCurrency(data.closingPrice)}</span>
          </div>
        </div>

        {data.keyNewsInsight && data.keyNewsInsight !== 'No specific insight available.' && data.keyNewsInsight !== 'AI insight generation failed.' && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-blue-400 mb-1 font-semibold flex items-center">
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Key Insight / News
            </p>
            <p className="text-gray-300 text-xs italic leading-relaxed">"{data.keyNewsInsight}"</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomYAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#a0a0a0" fontSize={10} className="cursor-help">
        <title>Price Axis: Represents the value of the asset in USD.</title>
        {formatCurrency(payload.value)}
      </text>
    </g>
  );
};

const CustomXAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#a0a0a0" fontSize={10} className="cursor-help">
        <title>Time Axis: Represents the trading days.</title>
        {payload.value}
      </text>
    </g>
  );
};

const NewsMarker = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.significantNewsPrice) return null;
  
  return (
    <g transform={`translate(${cx},${cy})`} className="cursor-pointer hover:scale-125 transition-transform" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={0} cy={0} r={6} fill="#fbbf24" stroke="#1f2937" strokeWidth={2} />
      <text x={0} y={3} textAnchor="middle" fill="#1f2937" fontSize={9} fontWeight="bold" className="pointer-events-none">i</text>
    </g>
  );
};

export const PriceChart: React.FC<PriceChartProps> = ({ data, height = 300 }) => {
    if (data.length < 2) {
        return (
            <div style={{ height }} className="flex items-center justify-center text-gray-500 w-full">
                Not enough data to display a chart.
            </div>
        );
    }
    
    const chartData = data.map(d => {
      const hasValidNews = d.keyNewsInsight && d.keyNewsInsight !== 'No specific insight available.' && d.keyNewsInsight !== 'AI insight generation failed.';
      // Mark as significant if daily change is > 5% AND there's news, or if it's just a notable day.
      // For demonstration, we'll mark days with > 3% absolute change as having "significant" news to show markers.
      const isSignificant = Math.abs(d.dailyPercentChange) > 3;
      
      return {
        ...d,
        isBullish: d.closingPrice >= d.openingPrice,
        significantNewsPrice: (hasValidNews && isSignificant) ? d.closingPrice : null,
      };
    });

    const allHighs = data.map(d => d.highPrice);
    const allLows = data.map(d => d.lowPrice);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);
    const padding = (maxPrice - minPrice) * 0.1;

    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#a0a0a0" 
              tick={<CustomXAxisTick />}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis 
              domain={[minPrice - padding, maxPrice + padding]} 
              stroke="#a0a0a0" 
              tick={<CustomYAxisTick />}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2d2d2d', opacity: 0.4 }} />
            
            <Line 
              type="monotone" 
              dataKey="closingPrice" 
              stroke="#00aaff" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00aaff', stroke: '#1e1e1e', strokeWidth: 2 }}
            />
            
            <Scatter 
              dataKey="significantNewsPrice" 
              shape={<NewsMarker />} 
              isAnimationActive={false}
            />
            
            <Brush 
              dataKey="date" 
              height={30} 
              stroke="#00aaff" 
              fill="#1f2937" 
              travellerWidth={10}
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
};