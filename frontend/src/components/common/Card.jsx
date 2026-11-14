import React from 'react';

export const Card = ({
  children,
  className = '',
  variant = 'white', // 'white' | 'dark' | 'outline' | 'ghost'
  rounded = '3xl', // '2xl' | '3xl' | 'full'
  onClick,
  ...props
}) => {
  const roundedClass = rounded === '3xl' ? 'rounded-3xl' : rounded === 'full' ? 'rounded-full' : 'rounded-2xl';

  const variantStyles = {
    white: 'bg-white border border-zinc-200/70 shadow-soft text-zinc-900',
    dark: 'bg-[#111113] border border-zinc-800 text-white shadow-elevated',
    outline: 'bg-transparent border border-zinc-300/80 text-zinc-900',
    ghost: 'bg-zinc-100/70 text-zinc-900 border border-transparent',
  };

  return (
    <div
      onClick={onClick}
      className={`p-6 transition-all duration-200 ${roundedClass} ${variantStyles[variant] || variantStyles.white} ${
        onClick ? 'cursor-pointer hover:shadow-elevated hover:border-zinc-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

