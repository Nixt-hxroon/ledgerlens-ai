import React from 'react';
import { getStatusBadgeStyle } from '../../utils/formatters';

export const Badge = ({
  children,
  variant,
  className = '',
  size = 'sm',
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const styleClass = variant ? getStatusBadgeStyle(variant) : 'bg-zinc-100 text-zinc-700 border-zinc-200';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]} ${styleClass} ${className}`}
    >
      {children}
    </span>
  );
};

