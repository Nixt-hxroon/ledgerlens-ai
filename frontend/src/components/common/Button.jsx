import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'dark' | 'outline' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg' | 'icon'
  loading = false,
  disabled = false,
  className = '',
  onClick,
  icon: Icon,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs font-medium rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-sm font-medium rounded-full gap-2',
    lg: 'px-7 py-3 text-base font-medium rounded-full gap-2.5',
    icon: 'p-2.5 rounded-full aspect-square justify-center',
  };

  const variantStyles = {
    primary: 'bg-[#111113] hover:bg-zinc-800 text-white shadow-sm border border-transparent disabled:bg-zinc-300 disabled:text-zinc-500',
    dark: 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/60 shadow-sm',
    secondary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/60',
    outline: 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-sm',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-zinc-100 text-zinc-700',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] select-none ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.primary} ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
