import React from 'react';

const MetricCard = ({ title, value, icon: Icon, color = 'blue', description }) => {
  const colorClasses = {
    blue: 'text-vip-blue',
    green: 'text-vip-green',
    orange: 'text-vip-orange',
    red: 'text-vip-red',
    yellow: 'text-vip-yellow'
  };

  return (
    <div className="bg-white rounded-xl shadow-vip p-6 hover-vip transition-vip">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-gray-50 ${colorClasses[color]}`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
              <p className="text-sm text-gray-600 mt-1">{title}</p>
              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;

