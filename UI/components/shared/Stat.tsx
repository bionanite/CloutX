
import React from 'react';

interface StatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

const Stat: React.FC<StatProps> = ({ label, value, icon, className }) => {
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
        {icon && <div className="text-clx-primary mt-1">{icon}</div>}
        <div>
            <p className="text-sm text-clx-text-secondary">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-clx-text-primary">{value}</p>
        </div>
    </div>
  );
};

export default Stat;
