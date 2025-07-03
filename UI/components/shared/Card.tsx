
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-clx-gray border border-clx-border rounded-lg p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
