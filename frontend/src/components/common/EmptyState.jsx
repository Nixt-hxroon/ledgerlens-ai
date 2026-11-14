import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-dashed border-zinc-300 ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 mb-4 shadow-sm">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-lg font-bold text-zinc-900 tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

