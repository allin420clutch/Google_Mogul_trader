
import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 ${className}`}>
      <div className="p-4 bg-gray-700/50 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
