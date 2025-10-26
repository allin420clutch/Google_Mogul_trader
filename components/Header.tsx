import React from 'react';
import { ArrowPathIcon, PlayIcon } from './IconComponents';

interface HeaderProps {
  currentDay: number;
  onAdvanceDay: () => void;
  isLoading: boolean;
  numAssetsToWatch: number;
  onNumAssetsChange: (value: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentDay, onAdvanceDay, isLoading, numAssetsToWatch, onNumAssetsChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10) {
        onNumAssetsChange(value);
    }
  };
  
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 p-4 shadow-lg border-b border-gray-700">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Investment Trading Bot <span className="text-blue-accent">Mogul</span>
          </h1>
          <p className="text-sm text-gray-400">Asset Tracker & Analyst</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="assets-to-watch" className="text-sm font-medium text-gray-300 whitespace-nowrap">Assets to Add:</label>
            <input
              type="number"
              id="assets-to-watch"
              value={numAssetsToWatch}
              onChange={handleInputChange}
              min="1"
              max="10"
              className="bg-gray-900 w-16 text-center font-mono rounded-md py-1 border border-gray-600 focus:ring-blue-accent focus:border-blue-accent disabled:opacity-50"
              disabled={isLoading}
              aria-label="Number of assets to add daily"
            />
          </div>
          <span className="text-lg font-mono px-3 py-1 bg-gray-700 rounded-md">Day: {currentDay}</span>
          <button
            onClick={onAdvanceDay}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2 bg-blue-accent text-white font-semibold rounded-lg shadow-md hover:bg-blue-500 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
            <span className="ml-2">
                {currentDay === 0 ? "Initialize Market" : "Advance to Next Day"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};