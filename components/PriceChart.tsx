import React from 'react';
import { DailyData } from '../types';

interface PriceChartProps {
  data: DailyData[];
  width: number;
  height: number;
}

const formatCurrency = (value: number) => {
    if (value < 1) {
        return `$${value.toFixed(6)}`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const PriceChart: React.FC<PriceChartProps> = ({ data, width, height }) => {
    if (data.length < 2) {
        return (
            <div style={{ width, height }} className="flex items-center justify-center text-gray-500">
                Not enough data to display a chart.
            </div>
        );
    }
    
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const prices = data.map(d => d.closingPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const priceRange = maxPrice - minPrice === 0 ? 1 : maxPrice - minPrice;

    const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
    const getY = (price: number) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.closingPrice)}`).join(' ');

    const isPriceIncreasing = data[data.length - 1].closingPrice >= data[0].closingPrice;
    const strokeColor = isPriceIncreasing ? '#22c55e' : '#ef4444';

    return (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Price chart for asset showing data over ${data.length} days.`}>
            {/* Y-axis labels and grid lines */}
            <text x={padding.left - 10} y={padding.top} dy="0.3em" textAnchor="end" fill="#a0a0a0" fontSize="10">{formatCurrency(maxPrice)}</text>
            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#2d2d2d" strokeDasharray="2" />
            
            <text x={padding.left - 10} y={height - padding.bottom} dy="0.3em" textAnchor="end" fill="#a0a0a0" fontSize="10">{formatCurrency(minPrice)}</text>
            <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#2d2d2d" />

            {/* X-axis labels */}
            <text x={padding.left} y={height - padding.bottom + 15} textAnchor="start" fill="#a0a0a0" fontSize="10">{data[0].date}</text>
            <text x={width - padding.right} y={height - padding.bottom + 15} textAnchor="end" fill="#a0a0a0" fontSize="10">{data[data.length-1].date}</text>

            {/* Price line */}
            <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2" />

            {/* Data points with tooltips */}
            {data.map((d, i) => (
                <circle key={i} cx={getX(i)} cy={getY(d.closingPrice)} r="3" fill={strokeColor}>
                    <title>{`${d.date}: ${formatCurrency(d.closingPrice)}`}</title>
                </circle>
            ))}
        </svg>
    );
};