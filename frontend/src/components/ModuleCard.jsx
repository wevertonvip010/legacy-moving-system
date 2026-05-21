import React from 'react';
import { ArrowRight } from 'lucide-react';

const ModuleCard = ({ title, description, icon: Icon, color = 'blue', buttonText = 'Acessar Módulo', onClick, isNew = false }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-vip-blue',
      button: 'bg-vip-blue hover:bg-blue-700'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-vip-orange',
      button: 'bg-vip-orange hover:bg-orange-700'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-vip-green',
      button: 'bg-vip-green hover:bg-green-700'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-xl shadow-vip p-6 hover-vip transition-vip border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        {isNew && (
          <span className="bg-vip-orange text-white text-xs px-2 py-1 rounded-full font-bold">
            NOVO
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
      
      <button
        onClick={onClick}
        className={`w-full ${colors.button} text-white py-3 px-4 rounded-lg font-medium transition-vip flex items-center justify-center space-x-2`}
      >
        <span>{buttonText}</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ModuleCard;

